/**
 * LintNode の低レベル読み取り / 書き込みプリミティブと、名前・色・数値の汎用ヘルパー。
 * 検知ルールのドメインロジックは持たない (それは dimension.ts / color.ts が担う)。
 * Figma 実体へのアクセスはすべてアダプタ (adapter.ts) 越しに行う。
 */

import type {
  LintAdapter,
  LintNode,
  LintPaint,
  LintRGB,
  LintVariable,
  RGBA,
} from "../adapter";
import { MAX_CONTENT_NODES } from "../rules";

/** 数値プロパティを読む (未対応フィールド・非有限値は null)。 */
export function readNumber(node: LintNode, field: string): number | null {
  return node.num(field);
}

/** 文字列プロパティを読む。 */
export function readString(node: LintNode, field: string): string | null {
  return node.str(field);
}

/** ノードのフィールドにバインドされた変数 id を返す (配列フィールドは先頭)。 */
export function readBoundVariableId(node: LintNode, field: string): string | null {
  return node.boundVariableId(field);
}

/** ノードの fills を返す (mixed・未対応は null)。 */
export function readFills(node: LintNode): LintPaint[] | null {
  return node.fills();
}

/** 最初の可視 SOLID 塗りの index を返す (無ければ -1)。 */
export function firstSolidIndex(fills: LintPaint[]): number {
  return fills.findIndex((p) => p.visible !== false && p.type === "SOLID");
}

/** SOLID 塗りにバインドされた色変数の id。 */
export function paintColorVariableId(paint: LintPaint): string | null {
  return paint.boundColorVariableId;
}

// --- 書き込み (自動修正のバインド)。binder 未提供 (read-only 消費者) は常に false ---

/** ノードの field に変数をバインドする (失敗・binder 無しは false)。 */
export function bindField(
  adapter: LintAdapter,
  node: LintNode,
  field: string,
  variable: LintVariable,
): boolean {
  return adapter.binder?.bindField(node, field, variable) ?? false;
}

/** ノードの index 番目の塗り (SOLID) に色変数をバインドし直す (失敗・binder 無しは false)。 */
export function bindFillAt(
  adapter: LintAdapter,
  node: LintNode,
  index: number,
  variable: LintVariable,
): boolean {
  return adapter.binder?.bindFillAt(node, index, variable) ?? false;
}

/** ノードの最初の可視 SOLID 塗りに色変数をバインドし直す (中の要素の On 修正に使う)。 */
export function bindFirstSolidFill(
  adapter: LintAdapter,
  node: LintNode,
  variable: LintVariable,
): boolean {
  return adapter.binder?.bindFirstSolidFill(node, variable) ?? false;
}

// --- 変数値の解決 (consumer ノードのモード文脈で評価) ---

export function resolveNumber(variable: LintVariable, node: LintNode): number | null {
  return variable.resolveNumber(node);
}

export function resolveColor(variable: LintVariable, node: LintNode): RGBA | null {
  return variable.resolveColor(node);
}

// --- 名前ヘルパー ---

export function segments(name: string): string[] {
  return name.split("/");
}

export function leafName(name: string): string {
  const s = segments(name);
  return s[s.length - 1] ?? name;
}

/** "Brand/OnPrimary" → "Brand/Primary" (先頭 On を外す)。On でなければそのまま。 */
export function stripOn(name: string): string {
  const segs = segments(name);
  const last = segs[segs.length - 1] ?? "";
  if (!last.startsWith("On")) return name;
  segs[segs.length - 1] = last.slice(2);
  return segs.join("/");
}

/** "Brand/Primary" → "Brand/OnPrimary" (On ペアの名前)。 */
export function onPairName(group: string, variant: string): string {
  return `${group}/On${variant}`;
}

export function colorDiff(a: RGBA, b: RGBA): number {
  return (
    Math.abs(a.r - b.r) +
    Math.abs(a.g - b.g) +
    Math.abs(a.b - b.b) +
    Math.abs((a.a ?? 1) - (b.a ?? 1))
  );
}

export function toHex(color: LintRGB): string {
  const h = (x: number) =>
    Math.round(Math.max(0, Math.min(1, x)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${h(color.r)}${h(color.g)}${h(color.b)}`;
}

export function roundLabel(n: number): string {
  return String(Math.round(n * 100) / 100);
}

// --- レイアウト判定 ---

export function hasAutoLayout(node: LintNode): boolean {
  const mode = readString(node, "layoutMode");
  return mode === "HORIZONTAL" || mode === "VERTICAL";
}

/** 高さがコンテンツ追従 (hug) か。hug の場合は固定値が無く Height トークンの対象外。 */
export function heightIsHug(node: LintNode): boolean {
  const mode = readString(node, "layoutMode");
  if (mode === "VERTICAL") return readString(node, "primaryAxisSizingMode") === "AUTO";
  if (mode === "HORIZONTAL") return readString(node, "counterAxisSizingMode") === "AUTO";
  return false;
}

// --- 子孫ノードの走査 (content leaf の収集) ---

function isContentLeaf(node: LintNode): boolean {
  switch (node.type) {
    case "TEXT":
    case "VECTOR":
    case "BOOLEAN_OPERATION":
    case "STAR":
    case "LINE":
    case "ELLIPSE":
    case "POLYGON":
      return true;
    default:
      return false;
  }
}

/** ノードを再帰して content (テキスト / アイコンの leaf) を集める。 */
export function collectContentLeaves(node: LintNode): LintNode[] {
  const out: LintNode[] = [];
  const visit = (n: LintNode) => {
    if (out.length >= MAX_CONTENT_NODES) return;
    for (const child of n.children()) {
      if (out.length >= MAX_CONTENT_NODES) return;
      if (child.visible === false) continue;
      if (isContentLeaf(child)) out.push(child);
      visit(child);
    }
  };
  visit(node);
  return out;
}
