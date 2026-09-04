/**
 * 検査結果の共有型 (機能4: チェックデザイン / 機能5: 横断チェック)。
 *
 * もともと figma-linter-plugin の UI ⇄ main メッセージ型 (shared/messages.ts) にあったものを、
 * CI (read-only lint) と共有するためコアへ移した。plugin の messages.ts はここから re-export
 * するので、プラグイン内の import 経路は従来どおり。
 */

/** 検査 1 項目の合否。pass = 正しいトークン / fail = 実数 or 誤トークン / na = 対象外。 */
export type CheckStatus = "pass" | "fail" | "na";

/**
 * アナトミー目印の図形。座標はすべてプレビュー画像内の正規化値 [0,1]。
 * - span   : 領域を表す寸法線 |—————| (Height/Padding/Gap)。両端にキャップを描く。
 * - circle : 角を囲む円 (Radius)。x/y=中心、r=半径 (幅基準で正規化)。
 * - point  : 点 (Color の塗り位置)。
 */
export type AnatomyShape =
  | { kind: "span"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "circle"; x: number; y: number; r: number }
  | { kind: "point"; x: number; y: number }
  // rect : 領域オーバーレイ (Color の Bg = コンポーネント塗り全体 / On = 中身の包含矩形)。
  //        x/y=左上、w/h=幅高 (正規化)。r=角丸半径 (幅基準で正規化。Bg のみ。省略=角丸なし)。
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number };

/**
 * アナトミー目印。プレビュー上に番号付きの目印 (図形 + リーダー矢印) を置き、検査行と番号で
 * 対応させる (デザインシステムの Anatomy 図)。group は Dimension / Color の色分けに使う
 * (矢印・番号の色を変えて重なっても見分けやすくする)。
 */
export interface AnatomyMarker {
  /** 通し番号 (プレビューの目印 ↔ 検査行を結ぶ)。 */
  n: number;
  /** 色分け用のグループ。 */
  group: "dimension" | "color";
  shape: AnatomyShape;
  /**
   * 同じ項目が複数の領域を指す場合の追加図形。Padding/Radius と違い Margin (gap) は
   * 子要素が 3 つ以上あると隙間が複数になるため、2 つ目以降の gap をここに入れる。
   * (itemSpacing は全 gap 共通なので検査行は 1 つのまま、可視化だけ複数になる。)
   */
  extraShapes?: AnatomyShape[];
}

/** 検査結果 1 行 (Dimension / Color 共通)。 */
export interface CheckRow {
  /** 安定キー (例 "dimension.height")。 */
  id: string;
  /** 表示名 (例 "Component Height")。 */
  label: string;
  status: CheckStatus;
  /** 現在の適用内容のチップ表示 (バインド済みトークン短縮名 or 実数値 or "—")。 */
  chip: string;
  /** 補足 (任意。失敗理由・期待トークンなど)。 */
  detail?: string;
  /** この行を「適用」で自動修正できるか (修正先トークンが解決できたか)。 */
  fixable: boolean;
  /**
   * Color 行 (Background / On) の現在色 hex (例 "#000000")。プレビュー上の Bg / On チップに
   * 実際の色スウォッチを出すための表示専用フィールド (検査ロジックには影響しない)。
   * Dimension 行や色が取れないときは undefined。
   */
  swatch?: string;
  /**
   * Color の Background 行が複数 fill (地色 + StateLayers オーバーレイ) を持つときの内訳。
   * 存在するとき UI は単一の `chip` の代わりにこの配列を 1 チップずつ並べて表示する (1 行 2 チップ)。
   * 単一 fill (通常の背景) では undefined のまま `chip` を使う (従来表示と同一)。
   */
  fills?: FillChip[];
  /** プレビュー上のアナトミー目印 (対象部位を指す。na 行や座標不明は無し)。 */
  marker?: AnatomyMarker;
}

/**
 * Background 行が複数 fill を持つときの内訳チップ 1 件。
 * State=Hover などのインタラクション状態では、背景が「地色 + StateLayers の半透明オーバーレイ」
 * の 2 枚 fill になり得る (例: Brand/Primary の上に StateLayers/DarkOpacity/8 を重ねる)。
 * 各 fill を 1 チップとして役割別に並べて見せるために使う。
 */
export interface FillChip {
  /** 役割。base = 地色 (Color System 背景) / overlay = StateLayers の半透明オーバーレイ。 */
  role: "base" | "overlay";
  /** この fill 単体の合否。pass = 正しいトークン / fail = 生値 or 誤トークン / na = 該当 fill なし。 */
  status: CheckStatus;
  /** チップ表示 (バインド済みトークンのフルネーム / hex / "—")。 */
  chip: string;
  /** スウォッチ色 hex (例 "#000000")。取得不能・該当なしは undefined。 */
  swatch?: string;
}

/** 検査結果のセクション (Dimension / Color)。 */
export interface CheckSection {
  id: "dimension" | "color";
  title: string;
  rows: CheckRow[];
}

/**
 * 修正で指定できる候補トークン 1 件 (ドロップダウンの 1 行)。
 * 同じフィールドのカテゴリに属する有効トークン全部を、解決値つきで並べる。
 */
export interface FixCandidate {
  /** Variable.id。apply 時にこの id でトークンを解決してバインドし直す。 */
  id: string;
  /** トークンのフルネーム (例 "Dimension System/Spacing/Padding/lg")。UI では短縮表示する。 */
  name: string;
  /** 解決値 (実数 "24" / hex "#0d1117")。値ボックス / スウォッチ / 選択肢の表示に使う。 */
  value: string;
}

/**
 * 自動修正 1 件の差分 (適用前の確認モーダル表示用)。
 * 「どのトークンに変わるか」(before/after = トークン名 or 実数) と「トークンの中の実数が
 * どう変わるか」(beforeValue/afterValue) を見せる。意味的に合っていれば適用してよい。
 * `candidates` から別トークンを選び直すこともでき、選択は `id` をキーに apply へ渡す。
 */
export interface FixDiff {
  /**
   * この修正を一意に識別するキー (dedup キーと同一)。UI のトークン選択 → apply の対象解決に使う。
   * dedup で 1 件に畳まれた修正同士は同じ id を共有し、1 つの選択が配下の全バインドに効く。
   */
  id: string;
  /** 対象行ラベル (例 "Padding Left" / "Background")。 */
  label: string;
  /** 種別 (寸法 / 色)。表示の単位やアイコンの出し分けに使う。 */
  kind: "dimension" | "color";
  /** 変更前の表示 (実数 "24" / 現トークンのフルネーム / hex)。 */
  before: string;
  /** 既定 (自動マッチ) で適用するトークンのフルネーム (例 "Dimension System/Spacing/Padding/lg")。 */
  after: string;
  /** 変更前のトークンの中の実数/色 (例 "24" / "#000000")。before と同じなら UI で省略。 */
  beforeValue: string;
  /** 既定トークンが解決する実数/色 (例 "24" / "#0D1117")。after と同じなら UI で省略。 */
  afterValue: string;
  /** 既定で選択される候補トークンの Variable.id (candidates のいずれかと一致)。 */
  defaultId: string;
  /**
   * このフィールドに指定できる有効トークン全部 (カテゴリ内・値つき)。ドロップダウンの母集団。
   * 1 件以下のときは選び直す余地が無いので UI はドロップダウンを出さない。
   */
  candidates: FixCandidate[];
}

// ===========================================================================
// 機能5: 横断チェック (Variant Consistency)
// ===========================================================================

/** グループ内の期待 (最頻) トークン。 */
export interface ConsistencyExpected {
  /** トークンのフルネーム "Color System/Brand/Primary"。 */
  token: string;
  tokenId: string;
  /** 解決値 (hex / 実数)。 */
  value: string;
  /** グループ内でこのトークンを使う votable セル数。 */
  count: number;
  /** グループ内の votable セル総数。 */
  total: number;
}

/** バリアント 1 セルの要約 (表示・再バインド用)。 */
export interface VariantCellSummary {
  nodeId: string;
  /** 軸座標 { Type:'Primary', Size:'Large', State:'Enabled' }。 */
  axes: Record<string, string>;
  /** free 軸の値だけを連結した行ラベル (例 "Large")。 */
  label: string;
  /** 現在トークンのフルネーム (null = 未指定/生値)。 */
  token: string | null;
  tokenId: string | null;
  /** 解決値 (hex / 実数)。スウォッチ・表示用。 */
  value: string | null;
  /** Layer1 (絶対チェック) 合否。 */
  valid: boolean;
}

/** ambiguous グループの手動選択肢 (票が割れた候補)。 */
export interface ConsistencyCandidate {
  tokenId: string;
  token: string;
  value: string;
  count: number;
}

/** 1 プロパティ × 1 グループの一貫性結果。 */
export interface ConsistencyGroup {
  /** gov 座標 (グループキー)。 */
  key: Record<string, string>;
  /** 表示ラベル (例 "Type=Primary, State=Enabled")。 */
  label: string;
  /** 期待 (最頻) トークン。ambiguous のとき null。 */
  expected: ConsistencyExpected | null;
  /** グループの全セル (free 軸の総当たり)。 */
  cells: VariantCellSummary[];
  /** 期待と違うセル (= 指摘対象)。 */
  outliers: VariantCellSummary[];
  /** 票が割れて自動決定できない。 */
  ambiguous: boolean;
  /** ambiguous 時の手動選択肢。 */
  candidates?: ConsistencyCandidate[];
}

/** 1 プロパティの推論結果。 */
export interface ConsistencyPropertyReport {
  /** 機能4 (単体検査) の行 id と対応 (例 'color.background')。 */
  property: string;
  /** 表示名 (例 "背景色")。 */
  label: string;
  kind: "dimension" | "color";
  /** 揃うべき軸 (横軸)。 */
  freeAxes: string[];
  /** 変えてよい軸 (グルーピングキー)。 */
  govAxes: string[];
  /** 規則を推定できたか。false = スキップ (誤検知ガード)。 */
  inferable: boolean;
  /** 透明性表示用: 各軸の一定度 0..1。 */
  axisConsistency: Record<string, number>;
  /** 外れ値 or ambiguous を含むグループのみ。 */
  groups: ConsistencyGroup[];
  outlierCount: number;
}

/** Component Set 全体の横断チェック結果。 */
export interface ConsistencyReport {
  setNodeId: string;
  setName: string;
  axes: string[];
  axisValues: Record<string, string[]>;
  variantCount: number;
  properties: ConsistencyPropertyReport[];
  totalOutliers: number;
  ambiguousCount: number;
}
