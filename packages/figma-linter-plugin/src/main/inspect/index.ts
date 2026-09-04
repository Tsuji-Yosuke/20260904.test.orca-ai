/// <reference types="@figma/plugin-typings" />

/**
 * 機能4: チェックデザイン (選択コンポーネントのトークン検査 + 自動修正) の公開 API。
 *
 * 検査ロジック本体 (ルール判定・候補導出・対象展開) は @orca/figma-linter-core に移管済みで、
 * ここはプラグイン固有の責務だけを担う: 選択の解決、プレビュー PNG の書き出し、アナトミー
 * 目印の付与、Index の畳み込み (contentKey)、そして「適用」(自動修正) のオーケストレーション。
 * Figma 実体へのアクセスは ../adapter.ts (Plugin API アダプタ) 越しに行う。
 *
 * 検知ルールの仕様は @orca/figma-linter-core の docs/detection-rules.md (SSoT) を参照。
 */

import {
  analyze,
  collectCheckTargets,
  contentFingerprint,
  countStatuses,
  dedupeDiffs,
  isInspectable,
  type FixEntry,
  type LintAdapter,
  type LintNode,
} from "@orca/figma-linter-core";
import type {
  ComponentSummary,
  InspectionPayload,
  InspectionPreview,
  InspectionResult,
} from "../../shared/messages";
import { createLintAdapter, rawNodeOf, wrapNode } from "../adapter";
import { assignAnatomyMarkers, buildPreview } from "./anatomy";

// ---------------------------------------------------------------------------
// プラグイン固有の付加情報 (説明文・プレビュー)
// ---------------------------------------------------------------------------

/** ノードの説明文を best-effort で取得する。 */
async function describe(node: SceneNode): Promise<string> {
  try {
    if (node.type === "INSTANCE") {
      const main = await node.getMainComponentAsync();
      const desc = main?.description || main?.parent?.name;
      if (desc) return desc;
    } else if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
      if (node.description) return node.description;
    }
  } catch {
    // 取得できなくても既定文にフォールバック。
  }
  return "選択中のコンポーネントが正しいトークンを使っているか検査します。";
}

/** 1 ノードのプレビュー PNG を書き出す (失敗時 null)。 */
async function exportPreview(node: SceneNode): Promise<InspectionPreview | null> {
  try {
    const bytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } });
    return buildPreview(node, bytes);
  } catch {
    return null;
  }
}

/** 1 ノードを検査して詳細結果 (sections + プレビュー + 修正差分) を組み立てる。 */
async function buildResult(node: LintNode, adapter: LintAdapter): Promise<InspectionResult> {
  const raw = rawNodeOf(node);
  const { sections, fixes } = await analyze(node, adapter);
  assignAnatomyMarkers(raw, sections);
  return {
    nodeId: node.id,
    name: node.name,
    description: await describe(raw),
    preview: await exportPreview(raw),
    sections,
    // 同一内容の diff (複数 content leaf が同じ On へ寄る等) は表示上まとめる。
    fixes: dedupeDiffs(fixes.map((f) => f.diff)),
  };
}

/** 検査対象外 (または解析失敗) のプレースホルダ要約。 */
function unsupportedSummary(node: LintNode): ComponentSummary {
  return { nodeId: node.id, name: node.name, preview: null, supported: false, pass: 0, fail: 0, fixCount: 0 };
}

/** 1 ノードを Index 行向けに要約する (詳細 sections は持たず、件数とサムネだけ)。 */
async function summarize(node: LintNode, adapter: LintAdapter): Promise<ComponentSummary> {
  if (!isInspectable(node)) return unsupportedSummary(node);
  const { sections, fixes } = await analyze(node, adapter);
  const { pass, fail } = countStatuses(sections);
  return {
    nodeId: node.id,
    name: node.name,
    preview: await exportPreview(rawNodeOf(node)),
    supported: true,
    pass,
    fail,
    fixCount: dedupeDiffs(fixes.map((f) => f.diff)).length,
  };
}

/**
 * Instance の「コンテンツ署名」を作る。メインコンポーネント + 公開プロパティ (Variant / Text /
 * Boolean / Instance Swap) + 中身の構造/テキスト署名が一致すれば内容が同一とみなす。Instance
 * 以外やメイン未解決のときは node.id でユニーク化し、決してマージしない。
 */
async function contentKey(node: LintNode): Promise<string> {
  const raw = rawNodeOf(node);
  if (raw.type !== "INSTANCE") return `node:${node.id}`;
  try {
    const main = await raw.getMainComponentAsync();
    if (!main) return `node:${node.id}`;
    const props = raw.componentProperties ?? {};
    const propSig = Object.entries(props)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${String((v as { value?: unknown }).value)}`)
      .join(";");
    return `inst:${main.id}|${propSig}|${contentFingerprint(node)}`;
  } catch {
    return `node:${node.id}`;
  }
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/** 現在の選択を検査して UI へ返すペイロードを作る (0=空 / 1=詳細 / 2 件以上=Index)。 */
export async function inspectSelection(): Promise<InspectionPayload> {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) return { status: "empty" };

  const adapter = createLintAdapter();

  // 選択を「ルート + 配下の Auto Layout フレーム (内部 Component は除外)」へ展開する。
  const targets = collectCheckTargets(selection.map(wrapNode));

  // 検査できる対象が 1 つも無い (= 選択が検査不可なノードのみ) → 対象外として 1 件目の名前を返す。
  if (targets.length === 0) {
    const first = selection[0];
    return first ? { status: "unsupported", nodeName: first.name } : { status: "empty" };
  }

  // 対象が 1 つだけ: 従来どおり詳細 (アナトミー付き) を返す。
  if (targets.length === 1) {
    return { status: "ok", result: await buildResult(targets[0]!, adapter) };
  }

  // 複数対象: 各ノードを並列に要約しつつ、コンテンツ署名 (メイン + プロパティ + テキスト) を作る。
  // 1 ノードの解析が予期せず throw しても、その 1 件だけ「検査対象外」に落として他件は生かす
  // (Promise.all は最初の reject で全件を巻き込むため、ノード単位で握りつぶす)。
  const summarized = await Promise.all(
    targets.map(async (node) => ({
      node,
      summary: await summarize(node, adapter).catch(() => unsupportedSummary(node)),
      key: await contentKey(node),
    })),
  );

  // 「内容が同一 かつ 検査結果 (合否件数・修正件数) も同一」の対象は 1 件に畳む (繰り返しの
  // メニュー項目など)。検査結果が違えば畳まない = 同じ見た目でも NG な 1 件を隠さない。
  const seen = new Set<string>();
  const kept: Array<{ node: LintNode; summary: ComponentSummary }> = [];
  for (const { node, summary, key } of summarized) {
    const resultSig = summary.supported
      ? `${summary.pass}/${summary.fail}/${summary.fixCount}`
      : "na";
    const dedupKey = `${key}#${resultSig}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    kept.push({ node, summary });
  }

  // 畳んだ結果 1 件だけになったら詳細 (アナトミー付き) で返す。
  if (kept.length === 1) {
    return { status: "ok", result: await buildResult(kept[0]!.node, adapter) };
  }
  return { status: "multi", items: kept.map((k) => k.summary) };
}

/** id 指定の 1 ノードを詳細検査する (Index ドリルイン用)。検査不可・消失なら null。 */
export async function inspectNode(nodeId: string): Promise<InspectionResult | null> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node || !("type" in node) || node.type === "PAGE" || node.type === "DOCUMENT") {
    return null;
  }
  const scene = wrapNode(node as SceneNode);
  if (!isInspectable(scene)) return null;
  return buildResult(scene, createLintAdapter());
}

/**
 * nodeId を再解析し、修正可能な項目をすべてバインドし直す。
 * fixed/failed は実バインド数 (content leaf ごと)、changes はモーダル表示と揃えた差分件数 (dedup 済み)。
 */
export async function applyFixes(
  nodeId: string,
  choices?: Record<string, string>,
): Promise<{ fixed: number; failed: number; changes: number }> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node || !("type" in node) || node.type === "PAGE" || node.type === "DOCUMENT") {
    return { fixed: 0, failed: 0, changes: 0 };
  }
  const adapter = createLintAdapter();
  const { fixes } = await analyze(wrapNode(node as SceneNode), adapter);
  const changes = dedupeDiffs(fixes.map((f) => f.diff)).length;
  let fixed = 0;
  let failed = 0;
  for (const fix of fixes) {
    // モーダルで既定と違うトークンが選ばれていれば、それを優先してバインドする。
    // 選び直したトークンの解決はアダプタが id ごとに memo する。
    const chosenId = choices?.[fix.diff.id];
    const override =
      chosenId && chosenId !== fix.diff.defaultId
        ? (await adapter.variable(chosenId)) ?? undefined
        : undefined;
    if (fix.apply(override)) fixed++;
    else failed++;
  }
  return { fixed, failed, changes };
}

/**
 * 一括修正で適用してよい安全な修正か。
 * - Color は変換しない (色マッチは曖昧なので一括では触らない)。
 * - 実数が変わらないものだけ = トークン化しても見た目が同じ (beforeValue === afterValue)。
 *   matchNumber は最近傍を返すため、値が完全一致したときだけ before/after が等しくなる
 *   (例: 生値 24 → 値 24 のトークン / 誤トークンだが同値の別名トークンへの付け替え)。
 *   値が変わる丸め寄せ (例 23 → 24) は一括では行わない。
 */
function isBulkApplicable(fix: FixEntry): boolean {
  return fix.diff.kind === "dimension" && fix.diff.beforeValue === fix.diff.afterValue;
}

/**
 * 複数 nodeId をまとめて自動修正する (Index の「一括で修正」)。
 * 一括では「Color を変換せず・実数が変わらない寸法トークン化だけ」を適用する安全策をとる。
 * fixed/failed の合計、変更があったコンポーネント数、そして「まだ修正が残るノード」(一括対象外の
 * Color や値が変わる寸法が残っている / 適用に失敗した) を返す。呼び出し側はこの残りを選択状態にする。
 * 消えた/検査不可のノードは黙ってスキップする (1 件の例外で一括処理を中断しない)。
 */
export async function applyFixesBulk(
  nodeIds: string[],
): Promise<{ fixed: number; failed: number; components: number; remaining: SceneNode[] }> {
  const adapter = createLintAdapter();
  let fixed = 0;
  let failed = 0;
  let components = 0;
  const remaining: SceneNode[] = [];
  for (const nodeId of nodeIds) {
    let scene: SceneNode | null = null;
    try {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node || !("type" in node) || node.type === "PAGE" || node.type === "DOCUMENT") {
        continue;
      }
      scene = node as SceneNode;
      const { fixes } = await analyze(wrapNode(scene), adapter);
      const applicable = fixes.filter(isBulkApplicable);
      let appliedHere = 0;
      let failedHere = 0;
      for (const fix of applicable) {
        if (fix.apply()) appliedHere++;
        else failedHere++;
      }
      fixed += appliedHere;
      failed += failedHere;
      if (appliedHere > 0) components++;
      // 残り修正がある = 一括対象外 (Color / 値が変わる寸法) が残っている、または適用に失敗した。
      if (applicable.length < fixes.length || failedHere > 0) remaining.push(scene);
    } catch {
      failed++;
      // 解析・適用に失敗したノードは手当てが必要なので選択に残す。
      if (scene) remaining.push(scene);
    }
  }
  return { fixed, failed, components, remaining };
}
