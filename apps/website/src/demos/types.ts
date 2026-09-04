import type { ComponentType } from "react";

/** Usage セクションのライブデモ。file は src/demos 相対（コード表示に使う）。 */
export interface UsageDemo {
  component: ComponentType;
  file: string;
}

export interface AnatomyRow {
  no: number;
  name: string;
  description: string;
  optional: boolean;
}

/** Anatomy セクションの解剖図（コンポーネントごとの手作り website 資産）。 */
export interface AnatomySpec {
  component: ComponentType;
  rows: AnatomyRow[];
}
