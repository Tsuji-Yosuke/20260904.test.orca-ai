/**
 * Dimension セクションの検知ルール (Component Height / Padding / Margin / Radius)。
 * 各ルールの ID・ラベル・期待 prefix・検査フィールドは rules.ts のカタログから取得する
 * (ここにはハードコードしない)。
 */

import type { LintAdapter, LintCollection, LintNode } from "../adapter";
import type { CheckRow, CheckSection, CheckStatus, FixDiff } from "../check-types";
import { dimensionRule, PADDING_RULE_IDS } from "../rules";
import {
  diffKey,
  ensureDefault,
  fullTokenName,
  matchNumber,
  numPool,
  type DimCandidates,
  type NumCandidate,
} from "./candidates";
import {
  bindField,
  hasAutoLayout,
  heightIsHug,
  readBoundVariableId,
  readNumber,
  readString,
  roundLabel,
} from "./read";
import type { FixEntry } from "./types";

/** 1 フィールドの現在状態。 */
type FieldState = "ok" | "wrong" | "raw" | "empty";

interface FieldEval {
  field: string;
  state: FieldState;
  /** チップ表示用の現在内容 (ok/wrong=フルトークン名, raw=実数値)。 */
  current: string;
  value: number | null;
}

/**
 * 1 つの数値フィールドを評価する (dimSystem 必須)。バインド先が dimSystem 内で
 * 期待 prefix に一致すれば ok、別物なら wrong、未バインドで実数 (>0) なら raw、それ以外は empty。
 */
async function evalField(
  node: LintNode,
  field: string,
  prefix: string,
  dimSystem: LintCollection,
  adapter: LintAdapter,
): Promise<FieldEval> {
  const value = readNumber(node, field);
  const aliasId = readBoundVariableId(node, field);
  if (aliasId) {
    const variable = await adapter.variable(aliasId);
    if (!variable) return { field, state: "wrong", current: "?", value };
    const inDim = variable.collectionId === dimSystem.id;
    const correct = inDim && variable.name.startsWith(prefix);
    return {
      field,
      state: correct ? "ok" : "wrong",
      current: await fullTokenName(variable, adapter),
      value,
    };
  }
  if (value !== null && value > 0) {
    return { field, state: "raw", current: roundLabel(value), value };
  }
  return { field, state: "empty", current: "", value };
}

/**
 * raw / wrong フィールドを値マッチでバインドし直す fix (diff 付き) を積む (積めたら true)。
 * diff は適用前の確認モーダル用に before/after のトークン名と実数を記録する。
 */
async function pushDimFix(
  node: LintNode,
  label: string,
  ev: FieldEval,
  candidates: NumCandidate[],
  adapter: LintAdapter,
  fixes: FixEntry[],
): Promise<boolean> {
  if (ev.state === "ok" || ev.value === null) return false;
  const match = matchNumber(ev.value, candidates);
  if (!match) return false;
  const field = ev.field;
  const after = await fullTokenName(match.variable, adapter);
  const afterValue = roundLabel(match.value);
  const pool = await numPool(candidates, adapter);
  const diff: FixDiff = {
    id: "",
    label,
    kind: "dimension",
    before: ev.current, // 実数 (raw) or 現トークンのフルネーム (wrong)
    after,
    beforeValue: roundLabel(ev.value),
    afterValue,
    defaultId: match.variable.id,
    candidates: ensureDefault(pool, match.variable.id, after, afterValue),
  };
  diff.id = diffKey(diff);
  fixes.push({
    diff,
    apply: (override) => bindField(adapter, node, field, override ?? match.variable),
  });
  return true;
}

/** 1 フィールド = 1 行の検査 (Padding の各辺・Height・Gap に使う)。 */
async function singleFieldRow(
  node: LintNode,
  id: string,
  label: string,
  field: string,
  prefix: string,
  candidates: NumCandidate[],
  dimSystem: LintCollection,
  adapter: LintAdapter,
  fixes: FixEntry[],
): Promise<CheckRow> {
  const ev = await evalField(node, field, prefix, dimSystem, adapter);
  if (ev.state === "empty") {
    return { id, label, status: "na", chip: "—", fixable: false };
  }
  const fixable = await pushDimFix(node, label, ev, candidates, adapter, fixes);
  const status: CheckStatus = ev.state === "ok" ? "pass" : "fail";
  return { id, label, status, chip: ev.current, fixable: status === "fail" && fixable };
}

/** 複数フィールドを 1 行にまとめる検査 (Radius の 4 隅に使う。混在は "mixed")。 */
async function multiFieldRow(
  node: LintNode,
  id: string,
  label: string,
  fields: readonly string[],
  prefix: string,
  candidates: NumCandidate[],
  dimSystem: LintCollection,
  adapter: LintAdapter,
  fixes: FixEntry[],
): Promise<CheckRow> {
  const evals: FieldEval[] = [];
  for (const field of fields) {
    evals.push(await evalField(node, field, prefix, dimSystem, adapter));
  }
  const relevant = evals.filter((e) => e.state !== "empty");
  if (relevant.length === 0) {
    return { id, label, status: "na", chip: "—", fixable: false };
  }
  let fixable = false;
  for (const ev of relevant) {
    if (await pushDimFix(node, label, ev, candidates, adapter, fixes)) fixable = true;
  }
  const status: CheckStatus = relevant.every((e) => e.state === "ok") ? "pass" : "fail";
  return { id, label, status, chip: aggregateChip(relevant), fixable: status === "fail" && fixable };
}

/** relevant フィールドの現在内容からチップ文字列を作る (全一致なら値、混在は "mixed")。 */
function aggregateChip(evals: FieldEval[]): string {
  const set = new Set(evals.map((e) => e.current));
  if (set.size === 1) return evals[0]?.current ?? "—";
  return "mixed";
}

/** Component Height 行 (hug は対象外として na)。 */
async function checkHeight(
  node: LintNode,
  candidates: NumCandidate[],
  dimSystem: LintCollection,
  adapter: LintAdapter,
  fixes: FixEntry[],
): Promise<CheckRow> {
  const rule = dimensionRule("dimension.height");
  if (heightIsHug(node)) {
    return {
      id: rule.id,
      label: rule.label,
      status: "na",
      chip: "Hug",
      fixable: false,
      detail: "高さがコンテンツ追従のため対象外です。",
    };
  }
  return singleFieldRow(
    node,
    rule.id,
    rule.label,
    rule.fields[0]!,
    rule.prefix,
    candidates,
    dimSystem,
    adapter,
    fixes,
  );
}

/** Dimension セクションを構築する。dimSystem が無ければ全行 na (誤検知を出さない)。 */
export async function buildDimensionSection(
  node: LintNode,
  dim: DimCandidates,
  dimSystem: LintCollection | null,
  adapter: LintAdapter,
  fixes: FixEntry[],
): Promise<CheckSection> {
  if (!dimSystem) {
    const na = (id: string, label: string): CheckRow => ({
      id,
      label,
      status: "na",
      chip: "—",
      fixable: false,
      detail: "Dimension System コレクションが見つかりません。",
    });
    return {
      id: "dimension",
      title: "Dimension",
      rows: [
        na("dimension.height", "Component Height"),
        na("dimension.padding", "Padding"),
        na("dimension.gap", "Margin"),
        na("dimension.radius", "Radius"),
      ],
    };
  }

  const rows: CheckRow[] = [];
  rows.push(await checkHeight(node, dim.component, dimSystem, adapter, fixes));

  if (hasAutoLayout(node)) {
    // Padding は t/b/l/r を個別に検査する (それぞれ 1 行)。
    for (const id of PADDING_RULE_IDS) {
      const rule = dimensionRule(id);
      rows.push(
        await singleFieldRow(
          node, rule.id, rule.label, rule.fields[0]!, rule.prefix, dim.padding, dimSystem, adapter, fixes,
        ),
      );
    }
    // Gap (itemSpacing)。WRAP のときは折り返し方向の counterAxisSpacing も検査する。
    const gapRule = dimensionRule("dimension.gap");
    rows.push(
      await singleFieldRow(
        node, gapRule.id, gapRule.label, gapRule.fields[0]!, gapRule.prefix, dim.margin, dimSystem, adapter, fixes,
      ),
    );
    // counterAxisSpacing は未設定だと getter が itemSpacing をミラーする (null を返さない)。
    // 独立バインドがある、または値が itemSpacing と異なるとき (= 独立指定) だけ検査する。
    // そうでなければ itemSpacing 側で見ているので二重計上・偽陽性を避ける。
    if (readString(node, "layoutWrap") === "WRAP") {
      const wrapRule = dimensionRule("dimension.gapWrap");
      const wrapField = wrapRule.fields[0]!;
      const wrapBound = readBoundVariableId(node, wrapField) !== null;
      const wrapGap = readNumber(node, wrapField);
      const itemGap = readNumber(node, "itemSpacing");
      if (wrapBound || (wrapGap !== null && wrapGap !== itemGap)) {
        rows.push(
          await singleFieldRow(
            node, wrapRule.id, wrapRule.label, wrapField, wrapRule.prefix, dim.margin, dimSystem, adapter, fixes,
          ),
        );
      }
    }
  } else {
    rows.push({ id: "dimension.padding", label: "Padding", status: "na", chip: "—", fixable: false });
    rows.push({ id: "dimension.gap", label: "Margin", status: "na", chip: "—", fixable: false });
  }

  const radiusRule = dimensionRule("dimension.radius");
  rows.push(
    await multiFieldRow(
      node, radiusRule.id, radiusRule.label, radiusRule.fields, radiusRule.prefix, dim.radius, dimSystem, adapter, fixes,
    ),
  );

  return { id: "dimension", title: "Dimension", rows };
}
