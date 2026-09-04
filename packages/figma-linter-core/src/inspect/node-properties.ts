/**
 * 機能5: 横断チェック (Variant Consistency) 用の読み取り / 書き込み。
 *
 * 1 ノード → プロパティ別の「現在トークン」を、機能4 (単体検査) と同じ判定基準で取り出す
 * (低レベル読取は read.ts、地色/オーバーレイ分類は color.ts を共有)。横断エンジン
 * (../consistency.ts) はこれをセット全体に渡してマトリクスを組む。修正適用 (再バインド) も、
 * バインドロジックがここに集約されているため bindNodeProperty を公開して任せる。
 */

import type { LintAdapter, LintCollection, LintNode, LintVariable } from "../adapter";
import {
  PREFIX_COMPONENT,
  PREFIX_MARGIN,
  PREFIX_PADDING,
  PREFIX_RADIUS,
  RADIUS_FIELDS,
} from "../rules";
import { fullTokenName } from "./candidates";
import { classifyContainerFills, resolvedHex } from "./color";
import {
  bindField,
  bindFillAt,
  bindFirstSolidFill,
  collectContentLeaves,
  firstSolidIndex,
  hasAutoLayout,
  heightIsHug,
  leafName,
  paintColorVariableId,
  readBoundVariableId,
  readFills,
  readNumber,
  roundLabel,
  segments,
  toHex,
} from "./read";

/** 1 フィールドの現在状態。 */
type FieldState = "ok" | "wrong" | "raw" | "empty";

/** 1 フィールドにバインドされたトークンの低レベル読取結果。 */
interface FieldToken {
  /** バインド済みトークンのフルネーム (collection-scoped)。生値/未バインドは null。 */
  tokenName: string | null;
  /** Variable.id (再バインド用)。生値/未バインド/未解決は null。 */
  tokenId: string | null;
  /** フィールドの実数値 (readNumber)。 */
  value: number | null;
  /** dimSystem 内かつ期待 prefix に一致 (= 正しいトークン)。 */
  valid: boolean;
  /** ok=正しい / wrong=別物・未解決 / raw=生値 / empty=未設定。 */
  state: FieldState;
}

/**
 * 1 つの数値フィールドのバインド先を読む (dimSystem 必須)。dimSystem 内で期待 prefix なら ok、
 * 別物/未解決なら wrong、未バインドで実数 (>0) なら raw、それ以外は empty。
 */
async function readDimField(
  node: LintNode,
  field: string,
  prefix: string,
  dimSystem: LintCollection,
  adapter: LintAdapter,
): Promise<FieldToken> {
  const value = readNumber(node, field);
  const aliasId = readBoundVariableId(node, field);
  if (aliasId) {
    const variable = await adapter.variable(aliasId);
    if (!variable) {
      return { tokenName: null, tokenId: null, value, valid: false, state: "wrong" };
    }
    const inDim = variable.collectionId === dimSystem.id;
    const valid = inDim && variable.name.startsWith(prefix);
    return {
      tokenName: await fullTokenName(variable, adapter),
      tokenId: variable.id,
      value,
      valid,
      state: valid ? "ok" : "wrong",
    };
  }
  if (value !== null && value > 0) {
    return { tokenName: null, tokenId: null, value, valid: false, state: "raw" };
  }
  return { tokenName: null, tokenId: null, value, valid: false, state: "empty" };
}

/** 1 ノードの 1 プロパティの現在トークン (横断チェックの比較材料)。 */
export interface PropertyReading {
  /** 機能4 (単体検査) の行 id と対応 (例 "color.background")。 */
  property: string;
  /** 現在トークンのフルネーム。生値/未バインドは null、混在は "(mixed…)"。 */
  tokenName: string | null;
  /** Variable.id (期待トークンに採用されたとき再バインド・実値解決に使う)。 */
  tokenId: string | null;
  /** 解決値 (hex / 実数の文字列)。表示用。 */
  value: string | null;
  /** Layer1 (絶対チェック) 合否 = 正しい名前空間のトークン。 */
  valid: boolean;
  /** このプロパティが対象か (na でない)。 */
  applicable: boolean;
}

/** 対象外 (na) のプロパティ読み取り。 */
function naReading(property: string): PropertyReading {
  return { property, tokenName: null, tokenId: null, value: null, valid: false, applicable: false };
}

/** FieldToken (寸法 1 フィールド) を PropertyReading に変換 (empty=na)。 */
function dimReading(property: string, t: FieldToken): PropertyReading {
  return {
    property,
    tokenName: t.tokenName,
    tokenId: t.tokenId,
    value: t.value !== null ? roundLabel(t.value) : null,
    valid: t.valid,
    applicable: t.state !== "empty",
  };
}

/** Padding 各辺の行 id とフィールド。 */
const PADDING_FIELDS: ReadonlyArray<{ id: string; field: string }> = [
  { id: "dimension.paddingTop", field: "paddingTop" },
  { id: "dimension.paddingBottom", field: "paddingBottom" },
  { id: "dimension.paddingLeft", field: "paddingLeft" },
  { id: "dimension.paddingRight", field: "paddingRight" },
];

/** Radius (4 隅) を 1 プロパティに集約する。4 隅が同一なら其れ、混在は "(mixed)"。 */
async function readRadiusProperty(
  node: LintNode,
  dimSystem: LintCollection,
  adapter: LintAdapter,
): Promise<PropertyReading> {
  const corners = await Promise.all(
    RADIUS_FIELDS.map((f) => readDimField(node, f, PREFIX_RADIUS, dimSystem, adapter)),
  );
  const relevant = corners.filter((c) => c.state !== "empty");
  if (relevant.length === 0) return naReading("dimension.radius");
  const keyOf = (c: FieldToken) => c.tokenName ?? `raw:${roundLabel(c.value ?? 0)}`;
  const keys = new Set(relevant.map(keyOf));
  if (keys.size === 1) {
    const r0 = relevant[0]!;
    return {
      property: "dimension.radius",
      tokenName: r0.tokenName,
      tokenId: r0.tokenId,
      value: r0.value !== null ? roundLabel(r0.value) : null,
      valid: relevant.every((c) => c.valid),
      applicable: true,
    };
  }
  return {
    property: "dimension.radius",
    tokenName: "(mixed)",
    tokenId: null,
    value: null,
    valid: false,
    applicable: true,
  };
}

/** 背景 (地色) Fill の現在トークン。evalBaseFill の "correct" と同じ valid 判定。 */
async function readBaseFillProperty(
  node: LintNode,
  colorSystem: LintCollection,
  adapter: LintAdapter,
): Promise<PropertyReading> {
  const { hasFills, base } = await classifyContainerFills(node, colorSystem, adapter);
  if (!hasFills || !base) return naReading("color.background");
  const boundVar = base.boundVar;
  if (!boundVar) {
    // 生値 (未バインド)。
    return {
      property: "color.background",
      tokenName: null,
      tokenId: null,
      value: base.paint.color ? toHex(base.paint.color) : null,
      valid: false,
      applicable: true,
    };
  }
  const inColorSystem = boundVar.collectionId === colorSystem.id;
  const isOn = leafName(boundVar.name).startsWith("On");
  const twoSeg = segments(boundVar.name).length === 2;
  return {
    property: "color.background",
    tokenName: await fullTokenName(boundVar, adapter),
    tokenId: boundVar.id,
    value: resolvedHex(boundVar, node),
    valid: inColorSystem && twoSeg && !isOn,
    applicable: true,
  };
}

/**
 * 中の要素 (テキスト/アイコン) の On カラーを 1 プロパティに集約する。
 * 全 leaf が同一トークンなら其れ、混在/生値は "(mixed…)" で valid=false。
 * valid = Color System の On トークン (背景ペアとの厳密一致は機能4 側が担う)。
 */
async function readOnColorProperty(
  node: LintNode,
  colorSystem: LintCollection,
  adapter: LintAdapter,
): Promise<PropertyReading> {
  const leaves = collectContentLeaves(node);
  const names = new Set<string>();
  let relevant = 0;
  let anyRaw = false;
  let firstVar: LintVariable | null = null;
  let allOn = true;
  let allInColor = true;
  for (const child of leaves) {
    const fills = readFills(child);
    const idx = fills ? firstSolidIndex(fills) : -1;
    if (!fills || idx === -1) continue;
    relevant++;
    const paint = fills[idx]!;
    const aliasId = paintColorVariableId(paint);
    const boundVar = aliasId ? await adapter.variable(aliasId) : null;
    if (!boundVar) {
      anyRaw = true;
      continue;
    }
    if (!firstVar) firstVar = boundVar;
    names.add(await fullTokenName(boundVar, adapter));
    if (boundVar.collectionId !== colorSystem.id) allInColor = false;
    if (!leafName(boundVar.name).startsWith("On")) allOn = false;
  }
  if (relevant === 0) return naReading("color.on");
  if (!anyRaw && names.size === 1 && firstVar) {
    return {
      property: "color.on",
      tokenName: await fullTokenName(firstVar, adapter),
      tokenId: firstVar.id,
      value: resolvedHex(firstVar, node),
      valid: allInColor && allOn,
      applicable: true,
    };
  }
  const label =
    names.size === 0
      ? "(raw)"
      : `(mixed: ${[...names].sort().join(", ")}${anyRaw ? ", raw" : ""})`;
  return {
    property: "color.on",
    tokenName: label,
    tokenId: null,
    value: null,
    valid: false,
    applicable: true,
  };
}

/**
 * オーバーレイ (StateLayers) の現在トークンを 1 プロパティに集約する。
 * オーバーレイが無い (通常状態) ノードは na。全オーバーレイが同一トークンなら其れ、
 * 混在/生値は "(mixed…)"。valid = StateLayers トークン。
 */
async function readOverlayProperty(
  node: LintNode,
  colorSystem: LintCollection,
  adapter: LintAdapter,
): Promise<PropertyReading> {
  const { overlays } = await classifyContainerFills(node, colorSystem, adapter);
  if (overlays.length === 0) return naReading("color.overlay");
  const names = new Set<string>();
  let anyRaw = false;
  let firstVar: LintVariable | null = null;
  let allStateLayer = true;
  for (const ov of overlays) {
    const bv = ov.boundVar;
    if (!bv) {
      anyRaw = true;
      allStateLayer = false;
      continue;
    }
    if (!firstVar) firstVar = bv;
    names.add(await fullTokenName(bv, adapter));
    if (!ov.isStateLayer) allStateLayer = false;
  }
  if (!anyRaw && names.size === 1 && firstVar) {
    return {
      property: "color.overlay",
      tokenName: await fullTokenName(firstVar, adapter),
      tokenId: firstVar.id,
      value: resolvedHex(firstVar, node),
      valid: allStateLayer,
      applicable: true,
    };
  }
  const label =
    names.size === 0
      ? "(raw)"
      : `(mixed: ${[...names].sort().join(", ")}${anyRaw ? ", raw" : ""})`;
  return {
    property: "color.overlay",
    tokenName: label,
    tokenId: null,
    value: null,
    valid: false,
    applicable: true,
  };
}

/**
 * 1 ノードを読み、横断チェックの比較材料 (プロパティ別の現在トークン) を返す。
 * 機能4 (単体検査) と同じ判定基準。Padding/Gap は Auto Layout のときだけ対象、Height は hug で na。
 * コレクションが見つからない層は全 na。
 */
export async function readNodeProperties(
  node: LintNode,
  dimSystem: LintCollection | null,
  colorSystem: LintCollection | null,
  adapter: LintAdapter,
): Promise<PropertyReading[]> {
  const out: PropertyReading[] = [];

  // --- Dimension ---
  if (dimSystem) {
    out.push(
      heightIsHug(node)
        ? naReading("dimension.height")
        : dimReading(
            "dimension.height",
            await readDimField(node, "height", PREFIX_COMPONENT, dimSystem, adapter),
          ),
    );
    if (hasAutoLayout(node)) {
      for (const p of PADDING_FIELDS) {
        out.push(
          dimReading(p.id, await readDimField(node, p.field, PREFIX_PADDING, dimSystem, adapter)),
        );
      }
      out.push(
        dimReading(
          "dimension.gap",
          await readDimField(node, "itemSpacing", PREFIX_MARGIN, dimSystem, adapter),
        ),
      );
    } else {
      for (const id of [
        "dimension.paddingTop",
        "dimension.paddingBottom",
        "dimension.paddingLeft",
        "dimension.paddingRight",
        "dimension.gap",
      ]) {
        out.push(naReading(id));
      }
    }
    out.push(await readRadiusProperty(node, dimSystem, adapter));
  } else {
    for (const id of [
      "dimension.height",
      "dimension.paddingTop",
      "dimension.paddingBottom",
      "dimension.paddingLeft",
      "dimension.paddingRight",
      "dimension.gap",
      "dimension.radius",
    ]) {
      out.push(naReading(id));
    }
  }

  // --- Color ---
  if (colorSystem) {
    out.push(await readBaseFillProperty(node, colorSystem, adapter));
    out.push(await readOnColorProperty(node, colorSystem, adapter));
    out.push(await readOverlayProperty(node, colorSystem, adapter));
  } else {
    out.push(naReading("color.background"));
    out.push(naReading("color.on"));
    out.push(naReading("color.overlay"));
  }

  return out;
}

/** プロパティ id → 寸法フィールド名 (単一フィールドのもの)。 */
const DIM_FIELD: Record<string, string> = {
  "dimension.height": "height",
  "dimension.paddingTop": "paddingTop",
  "dimension.paddingBottom": "paddingBottom",
  "dimension.paddingLeft": "paddingLeft",
  "dimension.paddingRight": "paddingRight",
  "dimension.gap": "itemSpacing",
};

/**
 * ノードの 1 プロパティを指定トークンへバインドし直す (横断チェックの「揃える」適用)。
 * Radius は 4 隅、On は中の要素すべて、Overlay は全オーバーレイに適用する。1 つでも成功すれば true。
 */
export async function bindNodeProperty(
  node: LintNode,
  property: string,
  variable: LintVariable,
  colorSystem: LintCollection | null,
  adapter: LintAdapter,
): Promise<boolean> {
  const field = DIM_FIELD[property];
  if (field) return bindField(adapter, node, field, variable);
  if (property === "dimension.radius") {
    let ok = false;
    for (const f of RADIUS_FIELDS) if (bindField(adapter, node, f, variable)) ok = true;
    return ok;
  }
  if (property === "color.background") {
    if (!colorSystem) return false;
    const { base } = await classifyContainerFills(node, colorSystem, adapter);
    if (!base) return false;
    return bindFillAt(adapter, node, base.index, variable);
  }
  if (property === "color.overlay") {
    if (!colorSystem) return false;
    const { overlays } = await classifyContainerFills(node, colorSystem, adapter);
    let ok = false;
    for (const ov of overlays) if (bindFillAt(adapter, node, ov.index, variable)) ok = true;
    return ok;
  }
  if (property === "color.on") {
    let ok = false;
    for (const child of collectContentLeaves(node)) {
      if (bindFirstSolidFill(adapter, child, variable)) ok = true;
    }
    return ok;
  }
  return false;
}
