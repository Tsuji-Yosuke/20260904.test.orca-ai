/**
 * 検知ルールのカタログ (コード側の SSoT)。
 *
 * 「機能4: チェックデザイン」で選択コンポーネントを検査する各ルールの定義
 * (ID・表示ラベル・カテゴリ・アナトミー番号・正とみなすバインド先・検査フィールド) と、
 * 検査ロジックが参照する閾値・例外定数をここに一元化する。inspect/ 配下の各モジュールは
 * このカタログを参照し、prefix やラベルをハードコードしない。
 *
 * このファイルは figma API 型に依存しない純粋データに保つ (検証テストが figma 型なしで
 * import できるようにするため)。
 *
 * 人間向けの SSoT は docs/detection-rules.md。両者は src/main/rules.test.ts が照合し、
 * 片方だけ変更すると CI / テストが落ちる (= ドキュメントが実装を統制する)。
 */

// ---------------------------------------------------------------------------
// 期待バインド先の接頭辞 (Dimension System 内トークンの collection 相対名 prefix)
// ---------------------------------------------------------------------------

/** Component Height の正トークン接頭辞。 */
export const PREFIX_COMPONENT = "Sizing/Component/";
/** Padding (各辺) の正トークン接頭辞。 */
export const PREFIX_PADDING = "Spacing/Padding/";
/** Margin (Gap) の正トークン接頭辞。 */
export const PREFIX_MARGIN = "Spacing/Margin/";
/** Radius (4 隅) の正トークン接頭辞。 */
export const PREFIX_RADIUS = "Sizing/Radius/";

/** Radius ルールが 1 行にまとめて検査する 4 隅のフィールド。 */
export const RADIUS_FIELDS = [
  "topLeftRadius",
  "topRightRadius",
  "bottomLeftRadius",
  "bottomRightRadius",
] as const;

// ---------------------------------------------------------------------------
// ルール定義 (カタログ本体)
// ---------------------------------------------------------------------------

export type RuleCategory = "dimension" | "color";

interface RuleBase {
  /** 行 ID (CheckRow.id と一致)。検査結果・アナトミー・修正差分の安定キー。 */
  id: string;
  /** UI 表示ラベル。 */
  label: string;
  category: RuleCategory;
  /** プレビュー上の固定番号。番号を持たない (= 目印を出さない) 行は null。 */
  anatomy: number | null;
}

/** 数値トークン (Dimension System) を検査するルール。 */
export interface DimensionRuleDef extends RuleBase {
  category: "dimension";
  /** バインド先として正とみなす Dimension System 内トークンの接頭辞。 */
  prefix: string;
  /** このルールが読む Figma ノードの数値フィールド (Radius は 4 隅)。 */
  fields: readonly string[];
}

/** 色トークン (Color System) を検査するルール。 */
export interface ColorRuleDef extends RuleBase {
  category: "color";
  /** 背景 (地色 + State オーバーレイ) = "background" / 中の要素の On = "on"。 */
  slot: "background" | "on";
  /** このルールが読む Figma ノードのフィールド (fills を解析する)。 */
  fields: readonly string[];
}

export type RuleDef = DimensionRuleDef | ColorRuleDef;

/**
 * 全検知ルール。`docs/detection-rules.md` の「ルール一覧」表と 1:1 で対応する
 * (rules.test.ts が照合)。ここに無い ID (例 dimension.padding) は、対象外を示す
 * na プレースホルダ行であって検知ルールではない (ドキュメントの該当節を参照)。
 */
export const RULES = [
  {
    id: "dimension.height",
    label: "Component Height",
    category: "dimension",
    anatomy: 1,
    prefix: PREFIX_COMPONENT,
    fields: ["height"],
  },
  {
    id: "dimension.paddingTop",
    label: "Padding Top",
    category: "dimension",
    anatomy: 2,
    prefix: PREFIX_PADDING,
    fields: ["paddingTop"],
  },
  {
    id: "dimension.paddingBottom",
    label: "Padding Bottom",
    category: "dimension",
    anatomy: 3,
    prefix: PREFIX_PADDING,
    fields: ["paddingBottom"],
  },
  {
    id: "dimension.paddingLeft",
    label: "Padding Left",
    category: "dimension",
    anatomy: 4,
    prefix: PREFIX_PADDING,
    fields: ["paddingLeft"],
  },
  {
    id: "dimension.paddingRight",
    label: "Padding Right",
    category: "dimension",
    anatomy: 5,
    prefix: PREFIX_PADDING,
    fields: ["paddingRight"],
  },
  {
    id: "dimension.gap",
    label: "Margin",
    category: "dimension",
    anatomy: 6,
    prefix: PREFIX_MARGIN,
    fields: ["itemSpacing"],
  },
  {
    id: "dimension.gapWrap",
    label: "Margin (Wrap)",
    category: "dimension",
    anatomy: null,
    prefix: PREFIX_MARGIN,
    fields: ["counterAxisSpacing"],
  },
  {
    id: "dimension.radius",
    label: "Radius",
    category: "dimension",
    anatomy: 7,
    prefix: PREFIX_RADIUS,
    fields: RADIUS_FIELDS,
  },
  {
    id: "color.background",
    label: "Background",
    category: "color",
    anatomy: 8,
    slot: "background",
    fields: ["fills"],
  },
  {
    id: "color.on",
    label: "On",
    category: "color",
    anatomy: 9,
    slot: "on",
    fields: ["fills"],
  },
] as const satisfies readonly RuleDef[];

export type RuleId = (typeof RULES)[number]["id"];

/** ID → ルール定義の逆引き。 */
export const RULE_BY_ID: ReadonlyMap<string, RuleDef> = new Map(
  RULES.map((r) => [r.id, r]),
);

/** Dimension ルールを ID で取得 (見つからない / 別カテゴリは例外)。 */
export function dimensionRule(id: string): DimensionRuleDef {
  const rule = RULE_BY_ID.get(id);
  if (!rule || rule.category !== "dimension") {
    throw new Error(`dimension rule not found: ${id}`);
  }
  return rule;
}

/** Padding 各辺ルールを t → b → l → r の順で取得する。 */
export const PADDING_RULE_IDS = [
  "dimension.paddingTop",
  "dimension.paddingBottom",
  "dimension.paddingLeft",
  "dimension.paddingRight",
] as const;

/**
 * 行 ID → 固定番号。番号は項目ごとに不変 (Component Height は常に 1)。トークン未指定 (fail)
 * でもその番号で目印を出し、対象外 (na) の行・番号を持たない行は飛ばす (連番を詰め直さない)。
 * カタログの anatomy から導出するので、ルール表と必ず一致する。
 */
export const ANATOMY_NUMBERS: Readonly<Record<string, number>> =
  Object.fromEntries(
    RULES.filter((r) => r.anatomy !== null).map((r) => [r.id, r.anatomy as number]),
  );

// ---------------------------------------------------------------------------
// 例外・閾値 (検査ロジックの判定パラメータ)
// ---------------------------------------------------------------------------

/**
 * StateLayers (状態オーバーレイ) トークンの名前判定。Color System 内の半透明色で、
 * `StateLayers/<DarkOpacity|LightOpacity>/<8|16|24>` (3 段、alpha 込み) の形を取る。
 * State=Hover などで「地色の上に重ねるオーバーレイ」として使う正当なトークン。
 */
export function isStateLayerName(name: string): boolean {
  return /^state\s?layers\//i.test(name);
}

/**
 * インタラクション状態 (背景にオーバーレイが乗り得る State バリアント値)。
 * これらの State では背景が「地色 + StateLayers オーバーレイ」の 2 枚 fill になり得る。
 */
export const INTERACTION_STATE =
  /^(hover(ed)?|press(ed)?|focus(ed)?|active|drag(ged)?|selected|visited)$/i;

/** 生値オーバーレイ (StateLayers 未バインド) とみなす実効 alpha の上限。地色 (不透明) と切り分ける。 */
export const OVERLAY_ALPHA_MAX = 0.5;

/**
 * On スロットのワイルドカード On トークン (collection 相対名)。背景の group/variant に依らず常に
 * 許容する (Surface + OnPlaceholder / Surface + OnDisabled のように任意の背景と組み合わせて使える
 * カラーのため)。Container 版 (OnPlaceholderContainer / OnDisabledContainer) は対応する Container
 * 背景とペアになる別トークンなので含めない。
 */
export const WILDCARD_ON_NAMES = ["UI/OnPlaceholder", "UI/OnDisabled"];

/** State=Error バリアントのとき、On スロットに追加許容するトークン (collection 相対名)。 */
export const ERROR_STATE_ON_NAME = "UI/Error";

/** 色一致とみなす許容差 (RGBA 各チャンネル絶対差の合計、0〜4 のスケール)。 */
export const COLOR_EPS = 0.02;

/** 検査・修正でたどる子孫ノードの上限 (巨大コンポーネントの暴走防止)。 */
export const MAX_CONTENT_NODES = 60;
