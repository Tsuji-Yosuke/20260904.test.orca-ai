/**
 * 候補トークン (Dimension System / Color System から live 導出) の読み込み・値マッチ・
 * 「指定できるトークン一覧」(FixCandidate) のプール化。検査ロジック (dimension.ts / color.ts) は
 * ここが用意した候補集合に対して合否判定と修正先の推定を行う。
 */

import type {
  LintAdapter,
  LintCollection,
  LintNode,
  LintVariable,
  RGBA,
} from "../adapter";
import type { FixCandidate } from "../check-types";
import {
  COLOR_EPS,
  isStateLayerName,
  PREFIX_COMPONENT,
  PREFIX_MARGIN,
  PREFIX_PADDING,
  PREFIX_RADIUS,
} from "../rules";
import {
  colorDiff,
  leafName,
  resolveColor,
  resolveNumber,
  roundLabel,
  segments,
  toHex,
} from "./read";

export interface NumCandidate {
  variable: LintVariable;
  value: number;
}
export interface ColorCandidate {
  variable: LintVariable;
  color: RGBA;
}

export interface DimCandidates {
  component: NumCandidate[];
  padding: NumCandidate[];
  margin: NumCandidate[];
  radius: NumCandidate[];
}

/** Dimension System の FLOAT トークンを prefix 別に分類し、node 文脈の実値を添える。 */
export async function loadDimCandidates(
  node: LintNode,
  dimSystem: LintCollection | null,
  adapter: LintAdapter,
): Promise<DimCandidates> {
  const out: DimCandidates = { component: [], padding: [], margin: [], radius: [] };
  if (!dimSystem) return out;
  for (const id of dimSystem.variableIds) {
    const variable = await adapter.variable(id);
    if (!variable || variable.resolvedType !== "FLOAT") continue;
    let bucket: NumCandidate[] | null = null;
    if (variable.name.startsWith(PREFIX_COMPONENT)) bucket = out.component;
    else if (variable.name.startsWith(PREFIX_PADDING)) bucket = out.padding;
    else if (variable.name.startsWith(PREFIX_MARGIN)) bucket = out.margin;
    else if (variable.name.startsWith(PREFIX_RADIUS)) bucket = out.radius;
    if (!bucket) continue;
    const value = resolveNumber(variable, node);
    if (value === null) continue;
    bucket.push({ variable, value });
  }
  return out;
}

export interface ColorLookup {
  /** 背景に使える非 On カラー (group/variant 2 段)。 */
  nonOn: ColorCandidate[];
  /** On カラー (group/On*。中の要素の On 修正の候補母集団)。 */
  on: ColorCandidate[];
  /** StateLayers/* (半透明オーバーレイ候補。生値オーバーレイの修正先マッチに使う)。 */
  stateLayers: ColorCandidate[];
  /** name → LintVariable (On ペア解決用)。 */
  byName: Map<string, LintVariable>;
}

export async function loadColorCandidates(
  node: LintNode,
  colorSystem: LintCollection | null,
  adapter: LintAdapter,
): Promise<ColorLookup> {
  const nonOn: ColorCandidate[] = [];
  const on: ColorCandidate[] = [];
  const stateLayers: ColorCandidate[] = [];
  const byName = new Map<string, LintVariable>();
  if (!colorSystem) return { nonOn, on, stateLayers, byName };
  for (const id of colorSystem.variableIds) {
    const variable = await adapter.variable(id);
    if (!variable || variable.resolvedType !== "COLOR") continue;
    byName.set(variable.name, variable);
    if (isStateLayerName(variable.name)) {
      // StateLayers は 3 段で nonOn には入らない。alpha 込みの実色を控え、生値の修正先候補にする。
      const color = resolveColor(variable, node);
      if (color) stateLayers.push({ variable, color });
    } else if (segments(variable.name).length === 2) {
      const color = resolveColor(variable, node);
      if (!color) continue;
      // group/variant 2 段を On / 非 On に振り分ける (背景候補 / On 候補)。
      if (leafName(variable.name).startsWith("On")) on.push({ variable, color });
      else nonOn.push({ variable, color });
    }
  }
  return { nonOn, on, stateLayers, byName };
}

/** value に最も近い候補トークン (空なら null)。Dimension の段推定に使う。 */
export function matchNumber(value: number, candidates: NumCandidate[]): NumCandidate | null {
  let best: NumCandidate | null = null;
  let bestDiff = Infinity;
  for (const c of candidates) {
    const diff = Math.abs(c.value - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  }
  return best;
}

/** color に近似一致する候補カラー (許容差超えなら null = 推定不能)。 */
export function matchColor(color: RGBA, candidates: ColorCandidate[]): LintVariable | null {
  let best: LintVariable | null = null;
  let bestDiff = Infinity;
  for (const c of candidates) {
    const diff = colorDiff(c.color, color);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c.variable;
    }
  }
  return bestDiff <= COLOR_EPS ? best : null;
}

// --- ドロップダウン候補 (カテゴリ内の有効トークン全部を値つきで列挙) ---

/**
 * NumCandidate[] / ColorCandidate[] を「指定できるトークン一覧」(FixCandidate[]) へ変換する。
 * 同じカテゴリ (= 同じ候補配列) は 1 ノードの解析中に何度も参照される (Padding 4 辺など) ため、
 * 配列の参照をキーに WeakMap で結果をメモ化する。各 analyze は候補配列を作り直すので、
 * モジュール常駐の WeakMap でもキーが入れ替わり、古い結果は参照されず GC される (stale 無し)。
 */
const NUM_POOL_CACHE = new WeakMap<NumCandidate[], FixCandidate[]>();
const COLOR_POOL_CACHE = new WeakMap<ColorCandidate[], FixCandidate[]>();

export async function numPool(cands: NumCandidate[], adapter: LintAdapter): Promise<FixCandidate[]> {
  const hit = NUM_POOL_CACHE.get(cands);
  if (hit) return hit;
  const out: FixCandidate[] = [];
  for (const c of cands) {
    out.push({ id: c.variable.id, name: await fullTokenName(c.variable, adapter), value: roundLabel(c.value) });
  }
  out.sort((a, b) => Number(a.value) - Number(b.value));
  NUM_POOL_CACHE.set(cands, out);
  return out;
}

export async function colorPool(cands: ColorCandidate[], adapter: LintAdapter): Promise<FixCandidate[]> {
  const hit = COLOR_POOL_CACHE.get(cands);
  if (hit) return hit;
  const out: FixCandidate[] = [];
  for (const c of cands) {
    out.push({ id: c.variable.id, name: await fullTokenName(c.variable, adapter), value: toHex(c.color) });
  }
  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  COLOR_POOL_CACHE.set(cands, out);
  return out;
}

/**
 * 既定トークンを候補一覧に確実に載せる (選択 → apply の照合を必ず成立させる)。
 * 無ければ先頭に補う。在るが値/名前が違う場合は上書きする: pool の値はノード文脈で解決済みだが、
 * On の既定値は child 文脈 (resolveColor(child)) で解決しており、モードが異なると食い違う。
 * モーダルの「値が変わるか」判定やスウォッチは既定行ではこの値を基準にするため、文脈に合わせる。
 * pool は WeakMap で共有キャッシュされるので破壊変更せず、変える場合だけ新配列を返す。
 */
export function ensureDefault(pool: FixCandidate[], id: string, name: string, value: string): FixCandidate[] {
  const i = pool.findIndex((c) => c.id === id);
  if (i === -1) return [{ id, name, value }, ...pool];
  if (pool[i]!.value === value && pool[i]!.name === name) return pool;
  const next = pool.slice();
  next[i] = { id, name, value };
  return next;
}

/** dedup / 選択照合に使う diff の安定キー (内容が同じ修正は同じ id を共有する)。 */
export function diffKey(d: {
  label: string;
  before: string;
  after: string;
  beforeValue: string;
  afterValue: string;
}): string {
  return `${d.label}|${d.before}|${d.after}|${d.beforeValue}|${d.afterValue}`;
}

/** 変数のフルネーム表記 "<コレクション名>/<変数名>" (例 "Dimension System/Sizing/Radius/xs")。 */
export async function fullTokenName(variable: LintVariable, adapter: LintAdapter): Promise<string> {
  const coll = await adapter.collection(variable.collectionId);
  return coll ? `${coll.name}/${variable.name}` : variable.name;
}
