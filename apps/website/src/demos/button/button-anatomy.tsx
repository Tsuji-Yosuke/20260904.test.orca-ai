// Button の解剖図。原典 Anatomy（packages/design-language/components/Button/Button.md）の
// 構成要素を、番号マーカー付きで図示するための手作り資産。
import { Button } from "@orca/react";
import type { AnatomyRow } from "@/demos/types";

export const BUTTON_ANATOMY_ROWS: AnatomyRow[] = [
  { no: 1, name: "Container", description: "HTML button 要素。", optional: false },
  { no: 2, name: "Leading Icon", description: "Label の前（leading）に配置するアイコン要素。", optional: true },
  { no: 3, name: "Label", description: "ボタンにコンテキストを付与するためのテキスト要素。", optional: false },
  { no: 4, name: "Trailing Icon", description: "Label の後（trailing）に配置するアイコン要素。", optional: true },
];

const Marker = ({ no, className }: { no: number; className: string }) => (
  <span
    aria-hidden
    className={`absolute flex size-component-half-sm items-center justify-center rounded-full bg-error typography-standard-label-small-bold text-on-error ${className}`}
  >
    {no}
  </span>
);

const SquareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
    <rect x="5" y="5" width="14" height="14" rx="2" strokeDasharray="4 3" />
  </svg>
);

export function ButtonAnatomy() {
  return (
    <div className="relative px-padding-4xl py-padding-3xl">
      <Marker no={1} className="-left-padding-xs top-[var(--spacing-1)]/2 -translate-y-[var(--spacing-1)]/2" />
      <Marker no={2} className="-top-padding-xs left-padding-4xl" />
      <Marker no={3} className="-top-padding-xs right-padding-4xl" />
      <Marker no={4} className="-bottom-padding-xs right-[var(--spacing-24)]" />
      <Button size="lg" leadingIcon={<SquareIcon />} trailingIcon={<SquareIcon />}>
        ラベル
      </Button>
    </div>
  );
}
