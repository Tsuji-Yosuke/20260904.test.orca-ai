import type { ReactNode } from "react";

export type ControlValue = string | boolean;
export type ControlValues = Record<string, ControlValue>;

/**
 * Playground の操作パネル 1 項目。
 * toggle は jsxValue（ON 時に生成する JSX 式）と children（ON のときだけ表示する
 * ネスト項目。Figma 案の「Show Leading Icon → アイコン選択」に対応）を持てる。
 */
interface ControlBase {
  prop: string;
  label: string;
  /** 操作パネル専用で、生成コードにもプレビューの props にも出力しない。 */
  uiOnly?: boolean;
}

export type ControlDef =
  | (ControlBase & {
      kind: "select";
      options: readonly string[];
      defaultValue: string;
    })
  | (ControlBase & {
      kind: "text";
      defaultValue: string;
      /** true なら props ではなく children として出力する。 */
      asChildren?: boolean;
    })
  | (ControlBase & {
      kind: "toggle";
      defaultValue: boolean;
      /** ON のとき prop に与える JSX 式。子コントロールの値に応じた生成もできる。 */
      jsxValue?: string | ((values: ControlValues) => string);
      /**
       * ON のとき、ネスト select（from）の選択値に応じた JSX 式を与える
       * （例: from: "leadingIconName", map: { plus: "<PlusIcon />" }）。
       * jsxValue より優先される。参照先の select には uiOnly を付けること。
       */
      jsxValues?: { from: string; map: Record<string, string> };
      children?: ControlDef[];
    });

export interface PlaygroundConfig {
  /** 生成コードのタグ名（例: "Button"）。 */
  component: string;
  /** 生成コードの import 行。 */
  imports: string[];
  controls: ControlDef[];
  /** 現在の値でライブプレビューを描画する（client 側でのみ使う）。 */
  render: (values: ControlValues) => ReactNode;
}
