// デモの手書きレジストリ。コンポーネント名（component-meta の name）をキーにする。
// UsageDemo.file は必ず実装コンポーネントと同一ファイルを指すこと（コード表示に使う）。
import type { AnatomySpec, UsageDemo } from "./types";
import { ButtonUsage } from "./button/button-usage";
import { BUTTON_ANATOMY_ROWS, ButtonAnatomy } from "./button/button-anatomy";

export const USAGE_DEMOS: Record<string, UsageDemo> = {
  button: { component: ButtonUsage, file: "button/button-usage.tsx" },
};

export const ANATOMY_SPECS: Record<string, AnatomySpec> = {
  button: { component: ButtonAnatomy, rows: BUTTON_ANATOMY_ROWS },
};
