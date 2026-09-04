/**
 * `focus-visible` 時の共有フォーカスリング（outline リセット + shadow-focus-outline）。
 *
 * Figma の Focused Outline effect（Sizing/Border/md = 2px）に対応する
 * `focus-visible:outline-none focus-visible:shadow-focus-outline` のペアを、
 * 各コンポーネントに文字列として重複コピーしないための定数。
 *
 * @orca/react の index.ts からは export しない（内部専用）。
 */
export const FOCUS_VISIBLE_RING =
  "focus-visible:outline-none focus-visible:shadow-focus-outline";
