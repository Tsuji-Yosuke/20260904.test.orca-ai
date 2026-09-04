/**
 * 検査ロジックが Figma 実体へアクセスするためのアダプタ境界。
 *
 * 検査コア (inspect/) はこのインターフェースだけに依存し、Figma Plugin API にも REST API にも
 * 依存しない。実装は 2 つ:
 * - @orca/figma-linter-plugin — Plugin API (`figma` グローバル) のラッパ。binder を提供し自動修正も担う。
 * - @orca/figma-linter-ci — REST API (`GET /v1/files` + `variables/local`) の JSON ラッパ。read-only。
 *
 * ## num / str / boundVariableId が受け取るフィールド名 (アダプタ実装の契約)
 *
 * フィールド名は Figma Plugin API のプロパティ名を正とする。REST アダプタは REST 表現との差分
 * (例: radius が `rectangleCornerRadii` 配列、height が `absoluteBoundingBox.height`) を吸収して
 * この名前で応答すること。
 *
 * - num: width / height / paddingTop / paddingBottom / paddingLeft / paddingRight /
 *        itemSpacing / counterAxisSpacing /
 *        topLeftRadius / topRightRadius / bottomLeftRadius / bottomRightRadius / rotation
 * - str: layoutMode / layoutWrap / primaryAxisSizingMode / counterAxisSizingMode
 * - boundVariableId: 上記 num 系フィールドと同じ名前 (配列バインドは先頭を返す)
 */

export interface LintRGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends LintRGB {
  a: number;
}

/**
 * 塗り 1 枚 (可視・不可視を含む)。SOLID 以外は type 以外のフィールドを使わない。
 * `opacity` は paint 単体の実効不透明度で、生値塗りの alpha もここへ正規化する
 * (Plugin API: paint.opacity / REST: paint.opacity × color.a)。バインド色の alpha は含まない。
 */
export interface LintPaint {
  type: string;
  visible: boolean;
  opacity: number;
  /** SOLID の生値 RGB (バインドの有無に依らず paint が持つ色)。 */
  color: LintRGB | null;
  /** paint の color にバインドされた変数 id (未バインドは null)。 */
  boundColorVariableId: string | null;
}

export interface LintVariable {
  readonly id: string;
  readonly name: string;
  /**
   * 解決型。検査は FLOAT / COLOR しか比較しないが、Figma 側の型追加 (EASING 等) を受け取れる
   * よう任意文字列も許容する (`(string & {})` で既知値の補完は残す)。
   */
  readonly resolvedType: "FLOAT" | "COLOR" | "STRING" | "BOOLEAN" | (string & {});
  readonly collectionId: string;
  /** consumer ノードのモード文脈で数値へ解決する (解決不能・型違いは null)。 */
  resolveNumber(consumer: LintNode): number | null;
  /** consumer ノードのモード文脈で色 (alpha 込み) へ解決する (解決不能・型違いは null)。 */
  resolveColor(consumer: LintNode): RGBA | null;
}

export interface LintCollection {
  readonly id: string;
  readonly name: string;
  /** Extended Collection (プリセット) か。REST で判別不能な場合は false でよい。 */
  readonly isExtension: boolean;
  readonly variableIds: readonly string[];
}

export interface LintNode {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly visible: boolean;
  /** 数値プロパティを読む (未対応フィールド・非有限値は null)。 */
  num(field: string): number | null;
  /** 文字列プロパティを読む。 */
  str(field: string): string | null;
  /** フィールドにバインドされた変数 id (配列フィールドは先頭。未バインドは null)。 */
  boundVariableId(field: string): string | null;
  /**
   * 塗り一覧 (未対応は null)。TEXT の文字単位で塗りが混在する場合も null を返すこと
   * (Plugin API の figma.mixed / REST の styleOverrideTable に fills を持つオーバーライド)。
   * null の leaf は検査対象外 (na) になる。
   */
  fills(): LintPaint[] | null;
  children(): readonly LintNode[];
  /** TEXT ノードの文字列 (それ以外は null)。 */
  characters(): string | null;
  /**
   * Variant 軸の値 (例 { State: "Hover" })。COMPONENT は variantProperties、INSTANCE は
   * componentProperties の VARIANT 値。どちらも無ければ null。
   */
  variantValues(): Record<string, string> | null;
  /** COMPONENT_SET の Variant 軸名 (定義順)。取得できなければ null (呼び出し側がフォールバック)。 */
  variantAxes(): string[] | null;
}

/**
 * 書き込み (自動修正のバインド) 系。read-only 消費者 (CI) は実装しない。
 * 成功で true (Plugin API の setBoundVariable 等の失敗は false に落とす)。
 */
export interface LintBinder {
  bindField(node: LintNode, field: string, variable: LintVariable): boolean;
  bindFillAt(node: LintNode, index: number, variable: LintVariable): boolean;
  bindFirstSolidFill(node: LintNode, variable: LintVariable): boolean;
}

export interface LintAdapter {
  /** ローカルの Variable Collection 一覧。 */
  collections(): Promise<readonly LintCollection[]>;
  /** 変数 id → LintVariable (消えていれば null)。実装側で memo すること (1 解析で多数回呼ばれる)。 */
  variable(id: string): Promise<LintVariable | null>;
  /** コレクション id → LintCollection (実装側で memo すること)。 */
  collection(id: string): Promise<LintCollection | null>;
  /** 自動修正のバインド実装。未提供のとき fixes の apply は常に false を返す。 */
  binder?: LintBinder;
}
