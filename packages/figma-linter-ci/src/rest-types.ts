/**
 * Figma REST API のレスポンス型 (このランナーが読むフィールドだけの最小定義)。
 *
 * - ファイル本体: GET /v1/files/:file_key
 * - Variables:   GET /v1/files/:file_key/variables/local (Enterprise 限定 / file_variables:read)
 *
 * REST はプロパティが既定値のとき省略することがある (例 layoutMode=NONE、padding=0)。
 * 既定値の補完は rest-adapter.ts が担う。
 */

/** REST の色 (0..1)。SOLID 塗りは a を含む。 */
export interface RestColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface RestVariableAlias {
  type: "VARIABLE_ALIAS";
  id: string;
}

/** 塗り 1 枚。boundVariables.color で変数バインドが表現される。 */
export interface RestPaint {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: RestColor;
  boundVariables?: { color?: RestVariableAlias };
}

/**
 * ノードの boundVariables エントリ。REST の表現は 3 形態ある:
 * - 単一エイリアス (itemSpacing / paddingLeft / topLeftRadius 等)
 * - 配列 (fills / strokes)
 * - ネストしたマップ (width/height は `size: {x,y}`、radius の集約表現
 *   `rectangleCornerRadii: {RECTANGLE_TOP_LEFT_CORNER_RADIUS, ...}` など)
 */
export type RestBoundVariableEntry =
  | RestVariableAlias
  | RestVariableAlias[]
  | Record<string, RestVariableAlias | undefined>;

export interface RestBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** INSTANCE の componentProperties の 1 件。 */
export interface RestComponentProperty {
  type?: string;
  value?: unknown;
}

/** COMPONENT_SET の componentPropertyDefinitions の 1 件。 */
export interface RestComponentPropertyDefinition {
  type?: string;
  defaultValue?: unknown;
  variantOptions?: string[];
}

/** ファイルツリーのノード (読むフィールドだけ)。 */
export interface RestNodeJson {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: RestNodeJson[];
  absoluteBoundingBox?: RestBoundingBox | null;
  fills?: RestPaint[];
  rotation?: number;
  // --- Auto Layout ---
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  layoutWrap?: "NO_WRAP" | "WRAP";
  itemSpacing?: number;
  counterAxisSpacing?: number | null;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  primaryAxisSizingMode?: "FIXED" | "AUTO";
  counterAxisSizingMode?: "FIXED" | "AUTO";
  // --- Radius ---
  cornerRadius?: number;
  /** [topLeft, topRight, bottomRight, bottomLeft] (REST の並び順)。 */
  rectangleCornerRadii?: [number, number, number, number];
  // --- Variables ---
  boundVariables?: Record<string, RestBoundVariableEntry | undefined>;
  /** このノード以下で明示された Variable モード (collectionId → modeId)。 */
  explicitVariableModes?: Record<string, string>;
  // --- Component ---
  componentPropertyDefinitions?: Record<string, RestComponentPropertyDefinition>;
  componentProperties?: Record<string, RestComponentProperty>;
  // --- Text ---
  characters?: string;
  /** 文字単位のスタイルオーバーライド参照 (0 = デフォルトラン)。塗りの混在検出に使う。 */
  characterStyleOverrides?: number[];
  /** オーバーライド id → 上書きスタイル。fills を持つ項目があれば「塗りの混在」。 */
  styleOverrideTable?: Record<string, { fills?: RestPaint[] } | undefined>;
}

export interface RestFileResponse {
  name: string;
  version?: string;
  lastModified?: string;
  document: RestNodeJson;
}

export interface RestVariable {
  id: string;
  name: string;
  variableCollectionId: string;
  resolvedType: "FLOAT" | "COLOR" | "STRING" | "BOOLEAN";
  valuesByMode: Record<string, number | string | boolean | RestColor | RestVariableAlias>;
  remote?: boolean;
}

export interface RestVariableCollection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  defaultModeId: string;
  variableIds: string[];
  remote?: boolean;
  /** Extended Collection (プリセット) 判定。REST に無い場合もあるので optional。 */
  isExtension?: boolean;
}

export interface RestVariablesResponse {
  meta: {
    variables: Record<string, RestVariable>;
    variableCollections: Record<string, RestVariableCollection>;
  };
}

/** 値が Variable エイリアスか。 */
export function isRestAlias(value: unknown): value is RestVariableAlias {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "VARIABLE_ALIAS" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}
