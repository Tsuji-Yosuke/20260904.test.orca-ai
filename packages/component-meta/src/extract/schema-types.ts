// PropSchema の型定義。ts-morph に依存させない（生成物経由で website 等の
// ランタイムから import されるため、抽出器本体とはファイルを分ける）。

export type PropKind = "enum" | "boolean" | "string" | "number" | "node" | "other";

export interface PropSchema {
  name: string;
  kind: PropKind;
  /** enum のみ。型エイリアス宣言の記述順。 */
  options?: readonly string[];
  /** forwardRef 引数の分割代入デフォルト（リテラルのみ）。 */
  defaultValue?: string | boolean | number;
  required: boolean;
  jsdoc?: string;
  /** 生の型テキスト（デバッグ・将来の Props テーブル用）。 */
  typeText: string;
}

export interface ComponentSchema {
  /** component-meta の name（例: "icon-button"）。 */
  name: string;
  /** React のコンポーネント名（例: "IconButton"）。 */
  displayName: string;
  /** interface の宣言順。 */
  props: PropSchema[];
}
