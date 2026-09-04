/**
 * @orca/figma-linter-core — 検知ルール (SSoT) と Figma 非依存の検査ロジックの公開面。
 *
 * - ルールカタログの正本はこのパッケージの docs/detection-rules.md (人間向け SSoT)。
 *   src/rules.ts のカタログとは src/rules.test.ts が照合する。
 * - 消費者は 2 つ: @orca/figma-linter-plugin (Plugin API アダプタ) と @orca/figma-linter-ci (REST アダプタ)。
 */

export * from "./rules";
export * from "./consistency-core";
export * from "./error-messages";
export * from "./adapter";
export * from "./check-types";
export * from "./consistency";
export * from "./inspect/analyze";
export * from "./inspect/candidates";
export * from "./inspect/collections";
export * from "./inspect/color";
export * from "./inspect/dimension";
export * from "./inspect/node-properties";
export * from "./inspect/read";
export * from "./inspect/types";
