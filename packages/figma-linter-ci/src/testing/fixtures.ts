/**
 * テスト用の合成 REST fixture (Common UI Kit の構造を模した小さなファイル)。
 *
 * 実ファイルの JSON はクライアントのデザインデータなのでリポジトリに置かない。
 * 代わりに、検知ルールが反応する状況 (生値 / 誤バインド / hug / オーバーレイ / バリアント不揃い /
 * 除外対象) を意図的に埋め込んだ最小構成をコードで組み立てる。
 *
 * Button セットは Size(s1..s5) × State(Default/Hover/Focus) の 15 バリアント。
 * - 基本は全フィールド正しくトークンへバインド (pass)。
 * - 意図的な逸脱 (テストの期待値):
 *   - s1/Default: paddingRight が生値 12          → 機能4 fail (候補 Spacing/Padding/md)
 *   - s2/Default: radius を rectangleCornerRadii のマップ表現でバインド → 表現差の吸収テスト (pass)
 *   - s2/Hover:   生値の半透明オーバーレイ fill    → 機能4 fail (候補 StateLayers)
 *   - s3/Focus:   itemSpacing が生値 8            → 機能4 fail / 機能5 では valid=false で除外
 *   - s4/Default: テキストの On が Surface/Default → 機能4 fail (期待 Brand/OnPrimary)
 *   - s5/Hover:   height が s4 用トークン          → 機能5 violation (単体では pass)
 *   - s5/Hover:   radius が Sizing/Radius/md      → 機能5 radius グループが 1:1 で ambiguous
 *   - s5/Focus:   radius が生値 6 (cornerRadius)  → 機能4 fail
 * - Card (スタンドアロン): VERTICAL の hug (sizingMode 省略 = AUTO 既定) → height na。
 *   配下の Auto Layout フレーム "Row" の paddingLeft が生値 → 展開検査 + nodePath のテスト。
 * - "_Playground" ページと ".WIP Button" コンポーネントは除外対象。
 */

import type {
  RestBoundVariableEntry,
  RestFileResponse,
  RestNodeJson,
  RestPaint,
  RestVariableAlias,
  RestVariablesResponse,
} from "../rest-types";

// --- Variable ids (テストから参照するので export) ---

export const VAR = {
  heights: ["V:h1", "V:h2", "V:h3", "V:h4", "V:h5"],
  padSm: "V:pad-sm",
  padMd: "V:pad-md",
  marSm: "V:mar-sm",
  radSm: "V:rad-sm",
  radMd: "V:rad-md",
  refXl: "V:ref-xl",
  brand: "V:brand",
  onBrand: "V:on-brand",
  surface: "V:surface",
  onSurface: "V:on-surface",
  onDisabled: "V:on-disabled",
  error: "V:error",
  stateLayer8: "V:sl-8",
} as const;

export const HEIGHT_VALUES = [20, 24, 28, 32, 36];

const alias = (id: string): RestVariableAlias => ({ type: "VARIABLE_ALIAS", id });

export function buildFixtureVariables(): RestVariablesResponse {
  const dimMode = "m:dim";
  const refMode = "m:ref";
  const colorMode = "m:color";
  const float = (
    id: string,
    name: string,
    value: number | RestVariableAlias,
    collection = "VC:dim",
    mode = dimMode,
  ) => ({
    id,
    name,
    variableCollectionId: collection,
    resolvedType: "FLOAT" as const,
    valuesByMode: { [mode]: value },
  });
  const color = (id: string, name: string, r: number, g: number, b: number, a = 1) => ({
    id,
    name,
    variableCollectionId: "VC:color",
    resolvedType: "COLOR" as const,
    valuesByMode: { [colorMode]: { r, g, b, a } },
  });

  const variables = [
    ...VAR.heights.map((id, i) => float(id, `Sizing/Component/s${i + 1}`, HEIGHT_VALUES[i]!)),
    float(VAR.padSm, "Spacing/Padding/sm", 8),
    // Spacing/Padding/md はエイリアス経由で Reference の 12 を指す (モード解決 + 連鎖のテスト)。
    float(VAR.padMd, "Spacing/Padding/md", alias(VAR.refXl)),
    float(VAR.marSm, "Spacing/Margin/sm", 8),
    float(VAR.radSm, "Sizing/Radius/sm", 4),
    float(VAR.radMd, "Sizing/Radius/md", 8),
    float(VAR.refXl, "Sizing/xl", 12, "VC:ref", refMode),
    color(VAR.brand, "Brand/Primary", 0, 0, 1),
    color(VAR.onBrand, "Brand/OnPrimary", 1, 1, 1),
    color(VAR.surface, "Surface/Default", 0.95, 0.95, 0.95),
    color(VAR.onSurface, "Surface/OnDefault", 0.1, 0.1, 0.1),
    color(VAR.onDisabled, "UI/OnDisabled", 0.5, 0.5, 0.5),
    color(VAR.error, "UI/Error", 0.9, 0.1, 0.1),
    color(VAR.stateLayer8, "StateLayers/DarkOpacity/8", 0, 0, 0, 0.08),
  ];

  return {
    meta: {
      variables: Object.fromEntries(variables.map((v) => [v.id, v])),
      variableCollections: {
        "VC:dim": {
          id: "VC:dim",
          name: "Dimension System",
          modes: [{ modeId: dimMode, name: "Default" }],
          defaultModeId: dimMode,
          variableIds: variables.filter((v) => v.variableCollectionId === "VC:dim").map((v) => v.id),
        },
        "VC:ref": {
          id: "VC:ref",
          name: "Dimension Reference",
          modes: [{ modeId: refMode, name: "Mode" }],
          defaultModeId: refMode,
          variableIds: [VAR.refXl],
        },
        "VC:color": {
          id: "VC:color",
          name: "Color System",
          modes: [{ modeId: colorMode, name: "Light" }],
          defaultModeId: colorMode,
          variableIds: variables
            .filter((v) => v.variableCollectionId === "VC:color")
            .map((v) => v.id),
        },
      },
    },
  };
}

// --- ノード ---

/** SOLID 塗り (バインド付き / 生値)。 */
export function solidPaint(opts: {
  boundId?: string;
  r?: number;
  g?: number;
  b?: number;
  a?: number;
}): RestPaint {
  const paint: RestPaint = {
    type: "SOLID",
    color: { r: opts.r ?? 0, g: opts.g ?? 0, b: opts.b ?? 0, a: opts.a ?? 1 },
  };
  if (opts.boundId) paint.boundVariables = { color: alias(opts.boundId) };
  return paint;
}

let nodeSeq = 0;
function nid(label: string): string {
  nodeSeq += 1;
  return `${nodeSeq}:${label}`;
}

/** Button の 1 バリアントを組み立てる。 */
function buildVariant(size: number, state: "Default" | "Hover" | "Focus"): RestNodeJson {
  const i = size - 1;
  const heightVar =
    size === 5 && state === "Hover" ? VAR.heights[3]! : VAR.heights[i]!;
  const height = size === 5 && state === "Hover" ? HEIGHT_VALUES[3]! : HEIGHT_VALUES[i]!;

  const bound: Record<string, RestBoundVariableEntry> = {
    // REST は width / height のバインドを `size: {x,y}` で表現する (height キーは存在しない)。
    size: { y: alias(heightVar) },
    paddingTop: alias(VAR.padMd),
    paddingBottom: alias(VAR.padMd),
    paddingLeft: alias(VAR.padMd),
  };
  // 既定の逸脱なし: paddingRight もバインド。s1/Default だけ生値にする。
  if (!(size === 1 && state === "Default")) bound["paddingRight"] = alias(VAR.padMd);
  // itemSpacing: s3/Focus だけ生値。
  if (!(size === 3 && state === "Focus")) bound["itemSpacing"] = alias(VAR.marSm);
  // radius: 基本は四隅キー。s2/Default は rectangleCornerRadii のマップ表現 (吸収テスト)。
  // s5/Hover は md へ (ambiguous 用)。s5/Focus はバインドなし (生値 6)。
  const radVar = size === 5 && state === "Hover" ? VAR.radMd : VAR.radSm;
  if (size === 2 && state === "Default") {
    bound["rectangleCornerRadii"] = {
      RECTANGLE_TOP_LEFT_CORNER_RADIUS: alias(radVar),
      RECTANGLE_TOP_RIGHT_CORNER_RADIUS: alias(radVar),
      RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS: alias(radVar),
      RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS: alias(radVar),
    };
  } else if (!(size === 5 && state === "Focus")) {
    bound["topLeftRadius"] = alias(radVar);
    bound["topRightRadius"] = alias(radVar);
    bound["bottomRightRadius"] = alias(radVar);
    bound["bottomLeftRadius"] = alias(radVar);
  }

  const fills: RestPaint[] = [solidPaint({ boundId: VAR.brand, b: 1 })];
  // s2/Hover: 生値の半透明オーバーレイ (StateLayers 未バインド)。
  if (size === 2 && state === "Hover") fills.push(solidPaint({ a: 0.08 }));

  // s4/Default: テキストの On が誤って Surface/Default (非 On)。
  const textFill =
    size === 4 && state === "Default"
      ? solidPaint({ boundId: VAR.surface, r: 0.95, g: 0.95, b: 0.95 })
      : solidPaint({ boundId: VAR.onBrand, r: 1, g: 1, b: 1 });

  const radiusValue = size === 5 && state === "Focus" ? 6 : size === 5 && state === "Hover" ? 8 : 4;
  return {
    id: nid(`btn-s${size}-${state}`),
    name: `Size=s${size}, State=${state}`,
    type: "COMPONENT",
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height },
    layoutMode: "HORIZONTAL",
    primaryAxisSizingMode: "FIXED",
    counterAxisSizingMode: "FIXED",
    itemSpacing: 8,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    cornerRadius: radiusValue,
    fills,
    boundVariables: bound,
    children: [
      {
        id: nid(`btn-s${size}-${state}-label`),
        name: "Label",
        type: "TEXT",
        characters: "Label",
        absoluteBoundingBox: { x: 12, y: 0, width: 60, height: 16 },
        fills: [textFill],
      },
    ],
  };
}

export function buildFixtureFile(): RestFileResponse {
  nodeSeq = 0;
  const variants: RestNodeJson[] = [];
  for (let size = 1; size <= 5; size++) {
    for (const state of ["Default", "Hover", "Focus"] as const) {
      variants.push(buildVariant(size, state));
    }
  }

  const buttonSet: RestNodeJson = {
    id: nid("button-set"),
    name: "Button",
    type: "COMPONENT_SET",
    absoluteBoundingBox: { x: 0, y: 0, width: 600, height: 400 },
    componentPropertyDefinitions: {
      Size: { type: "VARIANT", variantOptions: ["s1", "s2", "s3", "s4", "s5"] },
      State: { type: "VARIANT", variantOptions: ["Default", "Hover", "Focus"] },
    },
    children: variants,
  };

  // スタンドアロンの Card: VERTICAL の hug (sizingMode 省略 → AUTO 既定で height na)。
  // 配下 Row の paddingLeft が生値 → 展開検査 + nodePath のテスト。
  const card: RestNodeJson = {
    id: nid("card"),
    name: "Card",
    type: "COMPONENT",
    absoluteBoundingBox: { x: 0, y: 500, width: 200, height: 120 },
    layoutMode: "VERTICAL",
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    itemSpacing: 8,
    fills: [solidPaint({ boundId: VAR.surface, r: 0.95, g: 0.95, b: 0.95 })],
    boundVariables: {
      paddingTop: alias(VAR.padMd),
      paddingBottom: alias(VAR.padMd),
      paddingLeft: alias(VAR.padMd),
      paddingRight: alias(VAR.padMd),
      itemSpacing: alias(VAR.marSm),
    },
    children: [
      {
        id: nid("card-row"),
        name: "Row",
        type: "FRAME",
        absoluteBoundingBox: { x: 0, y: 500, width: 200, height: 40 },
        layoutMode: "HORIZONTAL",
        paddingLeft: 12,
        fills: [],
        children: [
          {
            id: nid("card-row-text"),
            name: "Title",
            type: "TEXT",
            characters: "Title",
            absoluteBoundingBox: { x: 12, y: 500, width: 100, height: 16 },
            fills: [solidPaint({ boundId: VAR.onSurface, r: 0.1, g: 0.1, b: 0.1 })],
          },
          {
            // 文字単位で塗りが混在する TEXT。デフォルトランは生値だが、Plugin API では
            // figma.mixed になる状況なので検査対象外 (On 行に影響しない) であるべき。
            id: nid("card-row-mixed"),
            name: "MixedLabel",
            type: "TEXT",
            characters: "Mixed",
            absoluteBoundingBox: { x: 120, y: 500, width: 30, height: 16 },
            fills: [solidPaint({ r: 0.2, g: 0.3, b: 0.4 })],
            characterStyleOverrides: [0, 1],
            styleOverrideTable: { "1": { fills: [solidPaint({ r: 1, g: 0, b: 0 })] } },
          },
          {
            // 非 Auto Layout のインスタンス → 展開対象にならない。
            id: nid("card-row-instance"),
            name: "Icon",
            type: "INSTANCE",
            absoluteBoundingBox: { x: 150, y: 500, width: 16, height: 16 },
            fills: [],
          },
        ],
      },
    ],
  };

  const componentsPage: RestNodeJson = {
    id: nid("page-components"),
    name: "Components",
    type: "CANVAS",
    children: [
      buttonSet,
      {
        // SECTION 越しの探索テスト。
        id: nid("section"),
        name: "Cards",
        type: "SECTION",
        children: [card],
      },
      {
        // 除外対象 (`.` prefix)。生値だらけでも違反ゼロであるべき。
        id: nid("wip"),
        name: ".WIP Button",
        type: "COMPONENT",
        absoluteBoundingBox: { x: 0, y: 900, width: 100, height: 40 },
        layoutMode: "HORIZONTAL",
        paddingLeft: 13,
        fills: [solidPaint({ r: 1, g: 0, b: 0 })],
      },
    ],
  };

  const playgroundPage: RestNodeJson = {
    id: nid("page-playground"),
    name: "_Playground",
    type: "CANVAS",
    children: [
      {
        id: nid("junk"),
        name: "Junk",
        type: "COMPONENT",
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 },
        layoutMode: "HORIZONTAL",
        paddingLeft: 7,
        fills: [solidPaint({ r: 0, g: 1, b: 0 })],
      },
    ],
  };

  return {
    name: "Common UI Kit (fixture)",
    document: {
      id: "0:0",
      name: "Document",
      type: "DOCUMENT",
      children: [componentsPage, playgroundPage],
    },
  };
}
