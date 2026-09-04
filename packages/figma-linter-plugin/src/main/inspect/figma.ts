/// <reference types="@figma/plugin-typings" />

/**
 * Figma ノード (SceneNode) の低レベル読み取り / 書き込みプリミティブ。
 * 検査ロジック本体は @orca/figma-linter-core に移管済みで、ここに残るのは
 * Plugin API アダプタ (../adapter.ts) とアナトミー目印 (anatomy.ts) が使う SceneNode 直接操作だけ。
 * 名前・色・レイアウト判定などの純ヘルパーはコア側 (inspect/read.ts) を参照。
 */

import { MAX_CONTENT_NODES } from "@orca/figma-linter-core";

type AnyRecord = Record<string, unknown>;

function rec(node: BaseNode): AnyRecord {
  return node as unknown as AnyRecord;
}

/** 数値プロパティを読む (未対応フィールド・非有限値は null)。 */
export function readNumber(node: BaseNode, field: string): number | null {
  const v = rec(node)[field];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** 文字列プロパティを読む。 */
export function readString(node: BaseNode, field: string): string | null {
  const v = rec(node)[field];
  return typeof v === "string" ? v : null;
}

/** ノードのフィールドにバインドされた変数エイリアスを返す (配列フィールドは先頭)。 */
export function readBoundAlias(node: BaseNode, field: string): VariableAlias | null {
  const bound = rec(node)["boundVariables"] as
    | Record<string, VariableAlias | VariableAlias[] | undefined>
    | undefined;
  const entry = bound?.[field];
  if (!entry) return null;
  return Array.isArray(entry) ? entry[0] ?? null : entry;
}

/** ノードの fills を Paint[] で返す (mixed・未対応は null)。 */
export function readFills(node: BaseNode): Paint[] | null {
  const fills = rec(node)["fills"];
  if (!fills || fills === figma.mixed || !Array.isArray(fills)) return null;
  return fills as Paint[];
}

/** 最初の可視 SOLID 塗りの index を返す (無ければ -1)。 */
export function firstSolidIndex(fills: Paint[]): number {
  return fills.findIndex((p) => p.visible !== false && p.type === "SOLID");
}

/** SOLID 塗りにバインドされた色変数のエイリアス。 */
export function paintColorAlias(paint: Paint): VariableAlias | null {
  const bound = (paint as { boundVariables?: { color?: VariableAlias } }).boundVariables;
  return bound?.color ?? null;
}

/** ノードの field に変数をバインドする (失敗時 false)。 */
export function setBoundVariable(node: BaseNode, field: string, variable: Variable): boolean {
  const fn = rec(node)["setBoundVariable"];
  if (typeof fn !== "function") return false;
  try {
    (fn as (f: string, v: Variable | null) => void).call(node, field, variable);
    return true;
  } catch {
    return false;
  }
}

/** ノードの index 番目の塗り (SOLID) に色変数をバインドし直す (失敗時 false)。 */
export function bindFillVariableAt(node: BaseNode, index: number, variable: Variable): boolean {
  const fills = readFills(node);
  if (!fills) return false;
  const paint = fills[index];
  if (!paint || paint.type !== "SOLID") return false;
  try {
    const next = fills.slice();
    next[index] = figma.variables.setBoundVariableForPaint(
      next[index] as SolidPaint,
      "color",
      variable,
    );
    (rec(node) as { fills: Paint[] }).fills = next;
    return true;
  } catch {
    return false;
  }
}

/** ノードの最初の可視 SOLID 塗りに色変数をバインドし直す (中の要素の On 修正に使う)。 */
export function bindFillVariable(node: BaseNode, variable: Variable): boolean {
  const fills = readFills(node);
  if (!fills) return false;
  const idx = firstSolidIndex(fills);
  if (idx === -1) return false;
  return bindFillVariableAt(node, idx, variable);
}

/** VariableValue を RGBA に変換する (色でなければ null)。 */
export function toRgba(value: VariableValue | undefined): RGBA | null {
  if (typeof value === "object" && value !== null && "r" in value) {
    const c = value as RGB | RGBA;
    return { r: c.r, g: c.g, b: c.b, a: "a" in c ? c.a : 1 };
  }
  return null;
}

// --- 子孫ノードの走査 (anatomy 用の content leaf 収集) ---

function isContentLeaf(node: SceneNode): boolean {
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
export function collectContentLeaves(node: SceneNode): SceneNode[] {
  const out: SceneNode[] = [];
  const visit = (n: SceneNode) => {
    if (out.length >= MAX_CONTENT_NODES) return;
    const children = (n as unknown as { children?: readonly SceneNode[] }).children;
    if (!children) return;
    for (const child of children) {
      if (out.length >= MAX_CONTENT_NODES) return;
      if (child.visible === false) continue;
      if (isContentLeaf(child)) out.push(child);
      visit(child);
    }
  };
  visit(node);
  return out;
}
