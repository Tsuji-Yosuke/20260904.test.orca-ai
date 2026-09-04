/**
 * 通知層。Notifier インターフェースで差し替え可能にする:
 * - SlackWebhookNotifier — Incoming Webhook (Block Kit)。SLACK_WEBHOOK_URL がある環境で使う。
 * - SummaryNotifier — GitHub Actions の Step Summary (無ければ stdout)。Webhook 未整備の間の代替。
 * cli.ts は両方を並べて使う (Summary は常に、Slack は URL があるときだけ)。
 */

import { appendFileSync } from "node:fs";
import { formatErrorMessage, type ErrorMessageKind } from "@orca/figma-linter-core";
import type { ReportDiff } from "./diff";
import type { LintReport, LintViolation } from "./report";

/** 1 回の実行結果の通知ペイロード。 */
export interface NotifyPayload {
  report: LintReport;
  diff: ReportDiff;
  /** 実行環境の警告 (PAT 失効間近など。report.warnings とは別系統)。 */
  operationalWarnings: string[];
  /**
   * 全件レポートの閲覧先 (GitHub Actions の run ページ = Step Summary)。
   * CI 実行時のみ渡され、「レポート参照」をリンクにする。ローカル実行では undefined。
   */
  reportUrl?: string;
}

export interface Notifier {
  notify(payload: NotifyPayload): Promise<void>;
}

/**
 * 違反の表示用クラスタ。バリアント違いの同一原因 (コンポーネント × ルール × 発生箇所) を
 * 1 行に畳む。バリアント単位の件数 (初回 5,000 件規模) をそのまま並べると読めないため、
 * 通知は「直す箇所」の単位で見せる。レポート JSON と差分キーは違反 (バリアント) 単位の
 * まま — これは通知の見せ方だけの集約で、差分検知には影響しない。
 */
export interface ViolationCluster {
  /** 見出し (コンポーネント名。ページ名は Common UI Kit では冗長なので出さない)。 */
  componentKey: string;
  /** このクラスタのエラー文 (= グルーピングキー)。 */
  sentence: string;
  /** 代表 (キー順で最初の) 違反。パーマリンクの飛び先に使う。 */
  representative: LintViolation;
  /** クラスタの全違反 (対象バリアントの表記に使う)。 */
  members: LintViolation[];
  /** 発生箇所数 (ルール × ネストフレームの組の数。「M箇所でエラー」表記に使う)。 */
  spots: number;
}

/** コンポーネント表示名からバリアント部を除いた基底名 ("Button / Size=md" → "Button")。 */
function componentBase(v: LintViolation): string {
  const i = v.component.indexOf(" / ");
  return i === -1 ? v.component : v.component.slice(0, i);
}

/** バリアント名 ("Size=md, State=Hover")。バリアントを持たない単体コンポーネントは null。 */
function variantName(v: LintViolation): string | null {
  const i = v.component.indexOf(" / ");
  return i === -1 ? null : v.component.slice(i + 3);
}

/**
 * コンポーネント見出し → クラスタ一覧へ畳む (どちらも入力順 = キー順で決定的)。
 * クラスタのキーは「エラー文」— 同じエラーが複数の発生箇所 (ネストフレーム) で起きていても
 * 1 行にまとめ、箇所数は spots として持つ (「M箇所でエラー」表記)。
 */
export function clusterViolations(
  violations: LintViolation[],
): Map<string, ViolationCluster[]> {
  const byComponent = new Map<string, Map<string, ViolationCluster & { spotKeys: Set<string> }>>();
  for (const v of violations) {
    const componentKey = componentBase(v);
    let clusters = byComponent.get(componentKey);
    if (!clusters) {
      clusters = new Map();
      byComponent.set(componentKey, clusters);
    }
    const sentence = errorSentence(v);
    const spotKey = `${v.ruleId}|${v.nodePath}`;
    const existing = clusters.get(sentence);
    if (existing) {
      existing.members.push(v);
      existing.spotKeys.add(spotKey);
      existing.spots = existing.spotKeys.size;
    } else {
      clusters.set(sentence, {
        componentKey,
        sentence,
        representative: v,
        members: [v],
        spots: 1,
        spotKeys: new Set([spotKey]),
      });
    }
  }
  return new Map(
    [...byComponent.entries()].map(([key, m]) => [
      key,
      [...m.values()].map(({ spotKeys: _spotKeys, ...cluster }) => cluster),
    ]),
  );
}

/** 発生箇所の総数 (= ヘッダーの「N箇所」。エラー文で畳む前のルール × 発生箇所の数)。 */
export function clusterCount(grouped: Map<string, ViolationCluster[]>): number {
  let n = 0;
  for (const clusters of grouped.values()) for (const c of clusters) n += c.spots;
  return n;
}

// ---------------------------------------------------------------------------
// クラスタ 1 行の表示 (エラー文 + 対象バリアント)
// ---------------------------------------------------------------------------

/** current がトークン未使用の直接指定 (数値 / カラーコード) か。 */
function isDirectValue(cur: string): boolean {
  return /^-?[0-9.]+$/.test(cur) || /^#[0-9a-fA-F]{3,8}$/.test(cur);
}

/** トークンフルネーム "コレクション名/パス..." のコレクション表示名 (先頭セグメント)。 */
function collectionOf(cur: string): string {
  const i = cur.indexOf("/");
  return i === -1 ? cur : cur.slice(0, i);
}

/**
 * 違反 → エラー文の種別キー + プレースホルダ値への分類。
 * 文言そのものは持たない (文言の SSoT は figma-linter-core の docs/detection-rules.md
 * 「エラー文」表と、それに従属する ERROR_MESSAGES カタログ)。
 * 判定は current (現在の指定内容) の分類から導出する。
 */
export function classifyViolation(
  v: LintViolation,
): { kind: ErrorMessageKind; params: Record<string, string> } | null {
  // 機能5: 単体では正しいが、同じ種類のバリアント同士で揃っていない。
  if (v.feature === "consistency") {
    return { kind: "consistency.mismatch", params: { プロパティ: v.label } };
  }

  const cur = v.current;
  const noun = v.label; // ラベルは正本 (rules.ts / PROPERTY_META) の表示名をそのまま使う。

  if (v.ruleId.startsWith("dimension.")) {
    if (cur === "?") return { kind: "dimension.unresolvable", params: { ルール: noun } };
    if (cur === "mixed") return { kind: "dimension.mixedCorners", params: { ルール: noun } };
    if (isDirectValue(cur)) return { kind: "dimension.raw", params: { ルール: noun } };
    if (cur.startsWith("Dimension System/")) {
      // 正しいコレクション内の別カテゴリ (例: Padding に Margin トークン)。
      const path = cur.slice("Dimension System/".length);
      const category = path.startsWith("Sizing/Component/")
        ? "Component"
        : path.startsWith("Spacing/Padding/")
          ? "Padding"
          : path.startsWith("Spacing/Margin/")
            ? "Margin"
            : path.startsWith("Sizing/Radius/")
              ? "Radius"
              : null;
      return category
        ? { kind: "dimension.wrongCategory", params: { ルール: noun, カテゴリ: category } }
        : { kind: "dimension.wrongToken", params: { ルール: noun } };
    }
    return { kind: "dimension.wrongCollection", params: { ルール: noun, コレクション: collectionOf(cur) } };
  }

  if (v.ruleId === "color.background") {
    // 地色 + オーバーレイが両方 fail のとき current は " + " 連結になる。
    // 分類は代表 (先頭 = 最下層の fail チップ) で行う。
    const cur = v.current.split(" + ")[0]!;
    // 状態オーバーレイ (StateLayers 候補が付く) はトークン未使用の重ね塗り。
    if (isDirectValue(cur) && v.suggestion?.includes("StateLayers/")) {
      return { kind: "background.overlayRaw", params: {} };
    }
    if (isDirectValue(cur)) return { kind: "background.raw", params: {} };
    if (cur === "?") return { kind: "background.unresolvable", params: {} };
    if (cur.startsWith("Color References/")) return { kind: "background.reference", params: {} };
    if (cur.startsWith("Color System/")) {
      const leaf = cur.slice(cur.lastIndexOf("/") + 1);
      if (leaf.startsWith("On")) return { kind: "background.on", params: {} };
      return { kind: "background.wrongToken", params: {} };
    }
    return { kind: "background.wrongCollection", params: { コレクション: collectionOf(cur) } };
  }

  if (v.ruleId === "color.on") {
    if (isDirectValue(cur)) return { kind: "on.raw", params: {} };
    if (cur === "?") return { kind: "on.unresolvable", params: {} };
    if (cur === "mixed") return { kind: "on.mixed", params: {} };
    if (cur.startsWith("Color References/")) return { kind: "on.reference", params: {} };
    if (cur.startsWith("Color System/")) {
      const leaf = cur.slice(cur.lastIndexOf("/") + 1);
      if (leaf.startsWith("On")) return { kind: "on.wrongPair", params: {} };
      return { kind: "on.nonOn", params: {} };
    }
    return { kind: "on.wrongCollection", params: { コレクション: collectionOf(cur) } };
  }

  return null; // 未知ルール (ルール追加時は分類とエラー文表を足す)。
}

/** 違反 1 種の日本語エラー文 (通知のパーマリンクのラベル)。文言はコアのカタログから引く。 */
export function errorSentence(v: LintViolation): string {
  const classified = classifyViolation(v);
  if (!classified) return `${v.label}: ${v.current}`; // 未知ルールの保険。
  return formatErrorMessage(classified.kind, classified.params);
}

/** 軸名を残さないと意味が取れない値 (True/False 等)。 */
const AMBIGUOUS_VALUE = /^(true|false|yes|no|on|off|none|-)$/i;

/**
 * 代表バリアントの略記。値だけを "/" で連結し、値単体で意味が取れないもの (True/False 等) は
 * "軸名=値" のまま残す (例 "State=Disabled, Size=Large, Expanded=False" → "Disabled/Large/Expanded=False")。
 */
export function compactVariant(name: string): string {
  return name
    .split(", ")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) return pair;
      const value = pair.slice(eq + 1);
      return AMBIGUOUS_VALUE.test(value.trim()) ? pair : value;
    })
    .join("/");
}

/**
 * エラー文の後ろに付ける対象表記: 代表バリアント + 他 Nバリアント (+ 複数箇所なら M箇所でエラー)。
 * 同じバリアントが複数の発生箇所で該当しても、バリアント数は重複なしで数える。
 * バリアントを持たない単体コンポーネントは箇所数のみ (1 箇所なら null)。
 */
export function clusterVariantText(c: ViolationCluster): string | null {
  const spotsSuffix = c.spots > 1 ? ` ${c.spots}箇所でエラー` : "";
  const name = variantName(c.representative);
  if (name === null) return spotsSuffix ? spotsSuffix.trim() : null;
  const distinct = new Set(
    c.members.map((m) => variantName(m)).filter((n): n is string => n !== null),
  );
  const rest = distinct.size > 1 ? ` 他${distinct.size - 1}バリアント` : "";
  return `${compactVariant(name)}${rest}${spotsSuffix}`;
}

// ---------------------------------------------------------------------------
// Slack (Incoming Webhook / Block Kit)
// ---------------------------------------------------------------------------

/** Slack Block Kit のブロック上限 (50) に収めるための表示件数キャップ。 */
const SLACK_MAX_GROUPS = 15;

/** 1 コンポーネント (= 1 section) あたりの表示行キャップ (section text は 3000 字上限)。 */
const SLACK_MAX_LINES_PER_GROUP = 8;

/** Slack mrkdwn の特殊文字をエスケープする (コンポーネント名やトークン名に & < > が入る場合)。 */
function mrkdwnEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Slack へ送る blocks を組み立てる (テスト可能に分離)。 */
export function buildSlackBlocks(payload: NotifyPayload): unknown[] {
  const { report, diff, operationalWarnings } = payload;
  const blocks: unknown[] = [];

  const grouped = clusterViolations(diff.added);
  const spots = clusterCount(grouped);

  blocks.push({
    type: "header",
    text: { type: "plain_text", text: "🔍 Common UI Kit: Weekly Linting", emoji: true },
  });
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `新規 ${spots}箇所 / 解消 ${clusterCount(clusterViolations(diff.resolved))}箇所`,
      },
    ],
  });

  // 「レポート参照」は Actions run (Step Summary = 全件レポート) へのリンクにする。
  const reportRef = payload.reportUrl ? `<${payload.reportUrl}|レポート>` : "レポート";

  const groups = [...grouped.entries()];
  for (const [componentKey, clusters] of groups.slice(0, SLACK_MAX_GROUPS)) {
    const lines = clusters.slice(0, SLACK_MAX_LINES_PER_GROUP).map((c, i) => {
      // エラー文自体をパーマリンクにする (ウェイトは通常)。
      const link = `<${c.representative.deepLink}|${mrkdwnEscape(errorSentence(c.representative))}>`;
      const variants = clusterVariantText(c);
      return `${i + 1}. ${variants ? `${link}: ${mrkdwnEscape(variants)}` : link}`;
    });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${mrkdwnEscape(componentKey)}*\n${lines.join("\n")}` },
    });
    if (clusters.length > SLACK_MAX_LINES_PER_GROUP) {
      // あふれ分はフッターと同じグレー (context ブロック) で出す。単位はヘッダーと同じ
      // 「箇所」(ルール × 発生箇所) に揃える。
      const hiddenSpots = clusters
        .slice(SLACK_MAX_LINES_PER_GROUP)
        .reduce((sum, c) => sum + c.spots, 0);
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `…ほか ${hiddenSpots} 箇所 (${reportRef}参照)`,
          },
        ],
      });
    }
  }
  if (groups.length > SLACK_MAX_GROUPS) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `…ほか ${groups.length - SLACK_MAX_GROUPS} コンポーネント (${reportRef}参照)`,
        },
      ],
    });
  }

  const warnings = [...report.warnings, ...operationalWarnings];
  if (warnings.length > 0) {
    blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: warningsText(warnings) }] });
  }
  return blocks;
}

/** context 1 ブロック (3000 字上限) に収まるよう件数を絞った警告テキスト。 */
const MAX_WARNINGS_SHOWN = 10;

function warningsText(warnings: string[]): string {
  const shown = warnings.slice(0, MAX_WARNINGS_SHOWN).map((w) => `⚠ ${mrkdwnEscape(w)}`);
  if (warnings.length > MAX_WARNINGS_SHOWN) {
    shown.push(`…ほか ${warnings.length - MAX_WARNINGS_SHOWN} 件 (Actions Summary 参照)`);
  }
  return shown.join("\n");
}

export class SlackWebhookNotifier implements Notifier {
  constructor(private readonly webhookUrl: string) {}

  async notify(payload: NotifyPayload): Promise<void> {
    // 差分ゼロでも毎回送る。「変化なし」も lint が動いている signal として扱う
    // (通知が来ない = ジョブが止まっている、と切り分けられる)。
    const blocks = buildSlackBlocks(payload);
    const res = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
    if (!res.ok) {
      throw new Error(`Slack Webhook が ${res.status} を返しました: ${await res.text().catch(() => "")}`);
    }
  }
}

// ---------------------------------------------------------------------------
// GitHub Actions Step Summary (Webhook 未整備の間の代替 + 常設のログ)
// ---------------------------------------------------------------------------

/** Summary 向けの markdown を組み立てる (テスト可能に分離)。 */
export function buildSummaryMarkdown(payload: NotifyPayload): string {
  const { report, diff, operationalWarnings } = payload;
  const lines: string[] = [];
  lines.push(`# Figma Linter — ${report.fileName}`);
  lines.push("");
  lines.push(
    `| 新規エラー | 解消 | 総エラー | 機能4 pass/fail | 機能5 エラー | ambiguous |`,
    `| --- | --- | --- | --- | --- | --- |`,
    `| ${diff.added.length} | ${diff.resolved.length} | ${diff.nextTotal} (前回 ${diff.prevTotal}) | ${report.summary.pass}/${report.summary.fail} | ${report.summary.consistencyOutliers} | ${report.summary.ambiguousGroups} |`,
  );
  lines.push("");
  if (diff.added.length > 0) {
    const grouped = clusterViolations(diff.added);
    lines.push(`## 新規エラー (${clusterCount(grouped)}箇所 / ${diff.added.length}件)`);
    for (const [componentKey, clusters] of grouped) {
      lines.push(`### ${componentKey}`);
      clusters.forEach((c, i) => {
        const link = `[${errorSentence(c.representative)}](${c.representative.deepLink})`;
        const variants = clusterVariantText(c);
        lines.push(`${i + 1}. ${variants ? `${link}: ${variants}` : link}`);
      });
    }
    lines.push("");
  }
  if (diff.resolved.length > 0) {
    const grouped = clusterViolations(diff.resolved);
    lines.push(`## 解消 (${clusterCount(grouped)}箇所 / ${diff.resolved.length}件)`);
    for (const [componentKey, clusters] of grouped) {
      for (const c of clusters) {
        const variants = clusterVariantText(c);
        lines.push(`- ${componentKey}: ${errorSentence(c.representative)}${variants ? ` (${variants})` : ""}`);
      }
    }
    lines.push("");
  }
  const warnings = [...report.warnings, ...operationalWarnings];
  if (warnings.length > 0) {
    lines.push(`## 警告`);
    for (const w of warnings) lines.push(`- ⚠ ${w}`);
    lines.push("");
  }
  const excluded = [...report.summary.excludedPages, ...report.summary.excludedComponents];
  if (excluded.length > 0) {
    lines.push(`<details><summary>除外 (${excluded.length}件)</summary>`);
    lines.push("");
    for (const e of excluded) lines.push(`- ${e}`);
    lines.push("");
    lines.push(`</details>`);
  }
  return lines.join("\n");
}

export class SummaryNotifier implements Notifier {
  async notify(payload: NotifyPayload): Promise<void> {
    const markdown = buildSummaryMarkdown(payload);
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath) {
      appendFileSync(summaryPath, `${markdown}\n`);
    } else {
      console.log(markdown);
    }
  }
}
