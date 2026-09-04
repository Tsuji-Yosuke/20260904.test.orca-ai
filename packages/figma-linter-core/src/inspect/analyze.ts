/**
 * 機能4: チェックデザイン (コンポーネント単体のトークン検査) の中核。
 *
 * 「正しい System トークンが使われているか」「実数 (生値) で指定されていないか」を、トークンの
 * 名前空間 (collection + 変数名) で突き合わせて検査する。検査は read-only で、fixes の適用は
 * アダプタが binder を提供する消費者 (プラグイン) だけが行う。
 *
 * 検知ルールの仕様・各ルールの期待名前空間・例外は docs/detection-rules.md (SSoT) を参照。
 * ルール定義のカタログは ../rules.ts。検査ロジックは candidates / dimension / color に分割。
 */

import type { LintAdapter, LintNode } from "../adapter";
import type { CheckSection, FixDiff } from "../check-types";
import { loadColorCandidates, loadDimCandidates } from "./candidates";
import { buildColorSection } from "./color";
import { findSystemCollections } from "./collections";
import { buildDimensionSection } from "./dimension";
import { hasAutoLayout, readNumber } from "./read";
import type { Analysis, FixEntry } from "./types";

/** ノードを解析し、表示行 + 修正アクションを返す。 */
export async function analyze(node: LintNode, adapter: LintAdapter): Promise<Analysis> {
  const { dimSystem, colorSystem } = await findSystemCollections(adapter);
  const fixes: FixEntry[] = [];

  const dim = await loadDimCandidates(node, dimSystem, adapter);
  const colors = await loadColorCandidates(node, colorSystem, adapter);

  const dimensionSection = await buildDimensionSection(node, dim, dimSystem, adapter, fixes);
  const colorSection = await buildColorSection(node, colorSystem, colors, adapter, fixes);

  return { sections: [dimensionSection, colorSection], fixes };
}

/** 検査可能なノードか (単一検査と同じ判定: width が読める)。 */
export function isInspectable(node: LintNode): boolean {
  return readNumber(node, "width") !== null;
}

/** 検査結果から pass/fail 行数を数える (na は集計しない)。 */
export function countStatuses(sections: CheckSection[]): { pass: number; fail: number } {
  let pass = 0;
  let fail = 0;
  for (const section of sections) {
    for (const row of section.rows) {
      if (row.status === "pass") pass++;
      else if (row.status === "fail") fail++;
    }
  }
  return { pass, fail };
}

/** 内容が同一の diff を 1 件にまとめる (表示用。実適用は全 leaf に行う)。 */
export function dedupeDiffs(diffs: FixDiff[]): FixDiff[] {
  const seen = new Set<string>();
  const out: FixDiff[] = [];
  for (const d of diffs) {
    const key = `${d.label}|${d.before}|${d.after}|${d.beforeValue}|${d.afterValue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 選択の展開 (ルート + 配下の Auto Layout フレーム、内部 Component は除外)
// ---------------------------------------------------------------------------

/** Component 系ノード (検査対象外として枝刈りする) か。 */
export function isComponentFamily(node: LintNode): boolean {
  return (
    node.type === "COMPONENT" || node.type === "COMPONENT_SET" || node.type === "INSTANCE"
  );
}

/**
 * 選択ノード群を「検査対象」へ展開する。
 * - 各ルート (明示選択) はそれ自身を検査可能なら必ず含め、Component / Instance であっても
 *   中まで展開する (= 単一詳細の従来挙動を維持しつつ「その配下も」検査する要件を満たす)。
 * - 配下を再帰し、Auto Layout のフレームを深さ無制限ですべて集める。これは Component /
 *   Instance であっても検査対象に含める (例: サイドバーのメニュー項目は各々インスタンスだが、
 *   1 項目ずつチェックしたい)。
 * - ただしネストした Component / Component Set / Instance の「中身」には潜らない。アイコンや
 *   ラベルなどコンポーネント内部の要素は検査対象にしない (要件: 内部の Component は除外)。
 * 返り値は node.id で重複排除した pre-order (選択順 → 子順) のリスト。
 */
export function collectCheckTargets(roots: readonly LintNode[]): LintNode[] {
  const out: LintNode[] = [];
  const seen = new Set<string>();
  const add = (node: LintNode) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    out.push(node);
  };
  const walk = (node: LintNode) => {
    for (const child of node.children()) {
      // Auto Layout フレームは Component / Instance でも検査対象に含める (メニュー項目など)。
      if (hasAutoLayout(child) && isInspectable(child)) add(child);
      // ただし Component / Instance の中身 (= 内部の Component) には潜らない。それ以外は再帰する。
      if (!isComponentFamily(child)) walk(child);
    }
  };
  for (const root of roots) {
    if (isInspectable(root)) add(root); // ルートは明示選択なので必ず含める
    // ルートは Instance でも中まで辿る (「内部にある」= ネストした Component/Instance だけ枝刈り)。
    walk(root);
  }
  return out;
}

/**
 * 配下を pre-order で走査し、各ノードの「種別:名前 (TEXT は =文字列)」を連結した署名を作る。
 * ラベルのテキスト差も、アイコン差し替え (ノード名が変わる) も拾えるので、見た目が違うのに
 * 同一として畳む誤マージを避けられる。ルート自身の名前は含めない (インスタンス改名に頑健)。
 */
export function contentFingerprint(node: LintNode): string {
  const parts: string[] = [];
  const visit = (n: LintNode) => {
    for (const c of n.children()) {
      let part = `${c.type}:${c.name}`;
      const chars = c.characters();
      if (c.type === "TEXT" && typeof chars === "string") part += `=${chars}`;
      parts.push(part);
      visit(c);
    }
  };
  visit(node);
  return parts.join("");
}
