/// <reference types="@figma/plugin-typings" />

/**
 * プレビュー画像のメタ生成と、各検査行の「アナトミー目印」(プレビュー上で部位を番号で指す図形)。
 * 行 ID → 固定番号の対応は rules.ts のカタログ (ANATOMY_NUMBERS) から取得する。
 */

import type {
  AnatomyShape,
  CheckSection,
  InspectionPreview,
} from "../../shared/messages";
import { ANATOMY_NUMBERS } from "@orca/figma-linter-core";
import { collectContentLeaves, readNumber, readString } from "./figma";

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** ノードの絶対バウンディングボックス (取得不能は null)。 */
function boundingBox(node: BaseNode): Box | null {
  const b = (node as unknown as { absoluteBoundingBox?: Box | null }).absoluteBoundingBox;
  return b && typeof b.x === "number" && b.width > 0 && b.height > 0 ? b : null;
}

/**
 * プレビュー画像のメタを組む。exportAsync は drop shadow / blur を含めて書き出すため、画像が
 * ノードのジオメトリより大きくなることがある。画像サイズは bbox ∪ renderBounds の和とみなし、
 * その中での実ジオメトリ矩形 (content, 正規化) を添える。UI はこの矩形を基準に目印を描くので、
 * プレビュー本体とガイドがズレない。effect が無ければ content は全面 (= 従来と同じ)。
 */
export function buildPreview(node: SceneNode, bytes: Uint8Array): InspectionPreview {
  const bbox = boundingBox(node);
  const rbox = (node as unknown as { absoluteRenderBounds?: Box | null }).absoluteRenderBounds ?? null;
  if (!bbox) return { bytes, width: node.width, height: node.height };
  if (!rbox || rbox.width <= 0 || rbox.height <= 0) {
    return { bytes, width: bbox.width, height: bbox.height };
  }
  // 画像 = ジオメトリと描画結果 (effect 込み) の和。effect がはみ出す側だけ余白が付く。
  const minX = Math.min(bbox.x, rbox.x);
  const minY = Math.min(bbox.y, rbox.y);
  const maxX = Math.max(bbox.x + bbox.width, rbox.x + rbox.width);
  const maxY = Math.max(bbox.y + bbox.height, rbox.y + rbox.height);
  const w = maxX - minX;
  const h = maxY - minY;
  if (w <= 0 || h <= 0) return { bytes, width: bbox.width, height: bbox.height };
  return {
    bytes,
    width: w,
    height: h,
    content: {
      x: (bbox.x - minX) / w,
      y: (bbox.y - minY) / h,
      w: bbox.width / w,
      h: bbox.height / h,
    },
  };
}

/** 端に張り付かないよう正規化値を [0.02, 0.98] に収める。 */
function clamp01(v: number): number {
  return Math.max(0.02, Math.min(0.98, v));
}

/** 寸法線 (区間) を作る。Height/Padding/Gap で領域 |—————| を表現する。 */
function span(x1: number, y1: number, x2: number, y2: number): AnatomyShape {
  return { kind: "span", x1: clamp01(x1), y1: clamp01(y1), x2: clamp01(x2), y2: clamp01(y2) };
}

/**
 * Gap (子間の隙間) を寸法線で表す。Padding/Radius と違い子が 3 つ以上なら隙間は複数になるため、
 * 連続する可視子のすべての隙間を測って返す。隙間が無い (itemSpacing=0 や Margin/none、子が
 * 1 つ以下、子が接している) ときは偽の |--| を出さないよう空配列を返す。
 */
function gapShapes(node: SceneNode, box: Box | null): AnatomyShape[] {
  // itemSpacing が 0/none なら描かない (Margin/none にバインドされていても隙間は無い)。
  if ((readNumber(node, "itemSpacing") ?? 0) <= 0) return [];
  const children = (node as unknown as { children?: readonly SceneNode[] }).children;
  if (!box || !children) return [];
  const vis = children.filter((c) => c.visible !== false && boundingBox(c));
  if (vis.length < 2) return [];
  const horizontal = readString(node, "layoutMode") === "HORIZONTAL";
  const out: AnatomyShape[] = [];
  for (let i = 0; i + 1 < vis.length; i++) {
    const a = boundingBox(vis[i] as SceneNode);
    const b = boundingBox(vis[i + 1] as SceneNode);
    if (!a || !b) continue;
    if (horizontal) {
      const x1 = (a.x + a.width - box.x) / box.width;
      const x2 = (b.x - box.x) / box.width;
      if (x2 > x1) out.push(span(x1, 0.5, x2, 0.5)); // 接していれば隙間なし
    } else {
      const y1 = (a.y + a.height - box.y) / box.height;
      const y2 = (b.y - box.y) / box.height;
      if (y2 > y1) out.push(span(0.5, y1, 0.5, y2));
    }
  }
  return out;
}

/** Radius: 左上の角の頂点 (0,0) を中心に円を置く (角を半分ずつ内外で囲む)。半径は実 radius 追従。 */
function radiusShape(node: SceneNode, w: number, h: number): AnatomyShape {
  const minDim = Math.min(w, h);
  const tl = readNumber(node, "topLeftRadius") ?? 0;
  // 角丸マークは実 radius のサイズで描く (コンポーネントの実際の角丸をそのままなぞる)。
  // コンポーネントを超えないよう minDim の半分で頭打ち。
  const cr = Math.min(tl, minDim * 0.5);
  // 中心 = 角の頂点 (0,0)。半径は幅基準で正規化 (px 換算でスケール一様 → 真円)。
  return { kind: "circle", x: 0, y: 0, r: cr / w };
}

/** Dimension 行 (寸法線/円) の図形を返す。color 行は別途 colorPoint で配置する。指せなければ null。 */
function dimensionShape(node: SceneNode, rowId: string): AnatomyShape | null {
  const w = readNumber(node, "width") ?? 0;
  const h = readNumber(node, "height") ?? 0;
  if (w <= 0 || h <= 0) return null;
  const pl = readNumber(node, "paddingLeft") ?? 0;
  const pr = readNumber(node, "paddingRight") ?? 0;
  const pt = readNumber(node, "paddingTop") ?? 0;
  const pb = readNumber(node, "paddingBottom") ?? 0;

  switch (rowId) {
    case "dimension.height":
      // コンポーネントの外側・右に高さ全体の寸法線を出す (x>1 = 右余白。clamp しない)。
      return { kind: "span", x1: 1.05, y1: 0, x2: 1.05, y2: 1 };
    // padding は clamp せず生値で返す (UI 側が外側辺をスナップして帯を描く。値 0 = 厚み 0 を
    // そのまま伝え、UI で「塗りの帯を出さずバッジだけ残す」判定に使えるようにする)。
    case "dimension.paddingTop":
      return { kind: "span", x1: 0.5, y1: 0, x2: 0.5, y2: pt / h }; // 上端 → 中身上 の余白
    case "dimension.paddingBottom":
      return { kind: "span", x1: 0.5, y1: 1 - pb / h, x2: 0.5, y2: 1 };
    case "dimension.paddingLeft":
      return { kind: "span", x1: 0, y1: 0.5, x2: pl / w, y2: 0.5 };
    case "dimension.paddingRight":
      return { kind: "span", x1: 1 - pr / w, y1: 0.5, x2: 1, y2: 0.5 };
    // dimension.gap は複数領域になり得るため assignAnatomyMarkers で gapShapes() を使う。
    case "dimension.radius":
      return radiusShape(node, w, h);
    default:
      return null;
  }
}

interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * node の可視な子のうち「中身の要素」を返す。コンポーネント全面 (95% 以上) を覆う子は背景
 * レイヤーとみなして除外する。ただし、除外した結果なにも残らない (= 唯一の子が全面を占める
 * ラッパー/中身) 場合は除外せずそのまま返す。
 */
function contentChildren(node: SceneNode): SceneNode[] {
  const children = (node as unknown as { children?: readonly SceneNode[] }).children;
  if (!children) return [];
  const visible = children.filter((c) => c.visible !== false && boundingBox(c));
  const box = boundingBox(node);
  if (!box) return visible;
  const nonBg = visible.filter((c) => {
    const b = boundingBox(c) as Box;
    return !(b.width >= box.width * 0.95 && b.height >= box.height * 0.95);
  });
  return nonBg.length > 0 ? nonBg : visible;
}

/**
 * On オーバーレイの矩形群。コンポーネント「直下の中身の要素」(アイコン / ラベル …) を 1 つずつ
 * 覆う (複数可)。
 *
 * content leaf の塗りでは絞らない: 実際のボタンではアイコンが stroke 着色や塗り無しの dashed
 * プレースホルダで、VECTOR/TEXT の leaf にもならない。塗り付き leaf だけを見るとアイコンが丸ごと
 * 漏れるため、auto-layout の各アイテム (= 直下の子) を要素として扱う。中身が 1 つのラッパーで
 * 包まれている場合は、複数アイテムが並ぶ階層 (またはリーフ) まで降りてから各アイテムを覆う。
 */
function onOverlayRects(node: SceneNode, box: Box | null): AnatomyShape[] {
  if (!box) return [];
  // 単一ラッパーを剥がし、複数アイテムが並ぶ階層まで降りる (無限ループ防止に guard)。
  let kids = contentChildren(node);
  for (let guard = 0; kids.length === 1 && guard < 8; guard++) {
    const inner = contentChildren(kids[0] as SceneNode);
    if (inner.length === 0) break; // これ以上分解できない → この要素を 1 枚で覆う。
    kids = inner;
  }
  const out: AnatomyShape[] = [];
  for (const child of kids) {
    const b = boundingBox(child);
    if (!b) continue;
    // 正規化はコンポーネント (node) のジオメトリ基準。UI もこの基準で目印を描く。
    // クリップされた子が枠外へはみ出すと余白 (チップ領域) にオーバーレイが描かれてしまうため、
    // [0,1] と交差させてコンポーネント内側にクランプする (完全に外なら捨てる)。
    const x0 = Math.max(0, (b.x - box.x) / box.width);
    const y0 = Math.max(0, (b.y - box.y) / box.height);
    const x1 = Math.min(1, (b.x + b.width - box.x) / box.width);
    const y1 = Math.min(1, (b.y + b.height - box.y) / box.height);
    if (x1 <= x0 || y1 <= y0) continue; // 枠の外 → オーバーレイしない。
    out.push({ kind: "rect", x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  return out;
}

/** content (テキスト/アイコン) 群の包含矩形を node 正規化で返す (無ければ null)。 */
function contentRectNorm(box: Box | null, leaves: SceneNode[]): Rect | null {
  if (!box) return null;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (const leaf of leaves) {
    const b = boundingBox(leaf);
    if (!b) continue;
    found = true;
    minX = Math.min(minX, (b.x - box.x) / box.width);
    minY = Math.min(minY, (b.y - box.y) / box.height);
    maxX = Math.max(maxX, (b.x + b.width - box.x) / box.width);
    maxY = Math.max(maxY, (b.y + b.height - box.y) / box.height);
  }
  return found ? { minX, minY, maxX, maxY } : null;
}

/**
 * 各 row に固定番号の目印を付与する (na 行・図形不明はスキップ = 番号を飛ばす)。
 * 2 パス: 先に Dimension の図形を確定して占有点を集め、Color の点はその領域内 (背景=塗り面 /
 * On=中の要素) で Dimension が最も混んでいない場所に置く (中央集中・線の交差を避ける)。
 */
export function assignAnatomyMarkers(node: SceneNode, sections: CheckSection[]): void {
  // 回転ノードは export が軸並行 bbox になり、ローカル座標の目印が画像と一致しないため付与しない。
  if (Math.abs(readNumber(node, "rotation") ?? 0) > 0.01) return;
  const leaves = collectContentLeaves(node);
  const content = contentRectNorm(boundingBox(node), leaves);

  const setMarkers = (
    group: "dimension" | "color",
    build: (rowId: string) => AnatomyShape[],
  ): void => {
    for (const section of sections) {
      if ((section.id === "color" ? "color" : "dimension") !== group) continue;
      for (const row of section.rows) {
        if (row.status === "na") continue;
        const n = ANATOMY_NUMBERS[row.id];
        if (n === undefined) continue;
        const shapes = build(row.id);
        if (shapes.length === 0) continue;
        const [first, ...rest] = shapes;
        row.marker = { n, group, shape: first!, extraShapes: rest.length ? rest : undefined };
      }
    }
  };

  // パス1: Dimension (占有点を集める)。Margin (gap) だけは複数領域になり得る。
  setMarkers("dimension", (rowId) => {
    if (rowId === "dimension.gap") return gapShapes(node, boundingBox(node));
    const shape = dimensionShape(node, rowId);
    return shape ? [shape] : [];
  });
  // パス2: Color はオーバーレイ矩形。背景 = コンポーネント塗り全体 / On = 中身の包含矩形。
  setMarkers("color", (rowId) => {
    if (rowId === "color.background") {
      const w = readNumber(node, "width") ?? 1;
      const tlr = readNumber(node, "topLeftRadius") ?? 0;
      return [{ kind: "rect", x: 0, y: 0, w: 1, h: 1, r: w > 0 ? tlr / w : 0 }];
    }
    // On: On カラーを使う中身 (テキスト/アイコン) を直下要素ごとに 1 枚ずつオーバーレイする (複数可)。
    const leafRects = onOverlayRects(node, boundingBox(node));
    if (leafRects.length > 0) return leafRects;
    // 塗り付き leaf が取れない場合は包含矩形 → それも無ければ中央付近にフォールバック。
    if (content) {
      return [
        { kind: "rect", x: content.minX, y: content.minY, w: content.maxX - content.minX, h: content.maxY - content.minY },
      ];
    }
    return [{ kind: "rect", x: 0.28, y: 0.4, w: 0.44, h: 0.2 }];
  });
}
