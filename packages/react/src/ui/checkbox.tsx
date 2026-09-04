"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import clsx from "clsx";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { FOCUS_VISIBLE_RING } from "@/registry/orca/lib/focus-ring";

export type CheckboxSize = "sm" | "md" | "lg";

export interface CheckboxProps
  extends Omit<
    ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    "children" | "render" | "className"
  > {
  /** 密度。Figma の Size 軸（Small/Medium/Large）に対応。既定は md。 */
  size?: CheckboxSize;
  /** Base UI 由来の関数形 className（state 依存）は公開せず、文字列のみ受け付ける。 */
  className?: string;
}

// Container（ヒットエリア）。Figma: Hover=黒7.8%、Active=黒16.1% の state layer をオーバーレイ合成する
// （base fill が無いため background-image レイヤの重ね合わせでも単純上書きと同じ見た目になるが、
// 他コンポーネントの state layer 実装方針に合わせて linear-gradient レイヤ合成で統一する）。
const CONTAINER_CLASS = clsx(
  "group relative inline-flex shrink-0 items-center justify-center",
  "rounded-xs cursor-pointer outline-none",
  FOCUS_VISIBLE_RING,
  "data-[disabled]:cursor-not-allowed",
  "[&:hover:not([data-disabled])]:state-layer-8",
  "[&:active:not([data-disabled])]:state-layer-16",
);

// Container 実寸（Figma実測 20/24/28px = sizing/component/half/{sm,md,lg}）。
const CONTAINER_SIZE_CLASS: Record<CheckboxSize, string> = {
  sm: "size-component-half-sm",
  md: "size-component-half-md",
  lg: "size-component-half-lg",
};

// Box 実寸（Figma実測 14/16/18px）に対応する専用 token が無いため、sizing-lg（16px = md の実寸）を基準に
// sizing-2xs（2px）で加減して sm/lg を組み立てる（固定寸法の token 合成。design-language Layout And Density 参照）。
const BOX_SIZE_CLASS: Record<CheckboxSize, string> = {
  sm: "size-[calc(var(--sizing-lg)-var(--sizing-2xs))]",
  md: "size-[var(--sizing-lg)]",
  lg: "size-[calc(var(--sizing-lg)+var(--sizing-2xs))]",
};

// Box（実際に見える正方形）。値グループ（Unchecked/Selected/Indeterminate）は Container の
// data-checked/data-unchecked/data-indeterminate を group-data 経由で反映する。
// disabled との組み合わせは compound variant（group-data-[disabled]:group-data-[checked]:...）で
// 単独 variant より高い詳細度を確保し、Tailwind の生成順に依存せず確実に上書きする。
const BOX_CLASS = clsx(
  "pointer-events-none relative shrink-0 flex items-center justify-center",
  "rounded-xs border-sm transition-colors",
  "border-outline",
  "group-data-[checked]:border-transparent group-data-[checked]:bg-primary",
  "group-data-[indeterminate]:border-transparent group-data-[indeterminate]:bg-primary",
  "group-data-[disabled]:border-disabled",
  "group-data-[disabled]:group-data-[checked]:border-disabled group-data-[disabled]:group-data-[checked]:bg-disabled",
  "group-data-[disabled]:group-data-[indeterminate]:border-disabled group-data-[disabled]:group-data-[indeterminate]:bg-disabled",
);

// Mark（Selected のチェックマーク）。塗り不透明度に頼らず形状差で Indeterminate と区別する。
// 切替はローカル prop でなく Root（group）の data-indeterminate 実状態を CSS で参照する。
// CheckboxGroup の parent チェックボックスのように、group 側が indeterminate を計算するケースでも
// 正しいマークになる（prop 分岐だとローカル prop=false のままチェックマークが出てしまう）。
function CheckMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-2/3 group-data-[indeterminate]:hidden"
      aria-hidden="true"
    >
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

// Mark（Indeterminate の水平バー）。高さは border-width-md（2px）token を再利用する。
// CheckMark と同じく data-indeterminate 実状態の CSS で表示を切り替える。
function IndeterminateMark() {
  return (
    <span
      aria-hidden="true"
      className="hidden w-1/2 h-[var(--border-width-md)] bg-on-primary group-data-[indeterminate]:block"
    />
  );
}

export const Checkbox = forwardRef<HTMLSpanElement, CheckboxProps>(
  function Checkbox({ size = "md", className, ...rest }, ref) {
    return (
      <CheckboxPrimitive.Root
        {...rest}
        ref={ref}
        data-size={size}
        className={clsx(CONTAINER_CLASS, CONTAINER_SIZE_CLASS[size], className)}
      >
        <span className={clsx(BOX_CLASS, BOX_SIZE_CLASS[size])}>
          {/* 両マークを常に描画し、data-indeterminate の CSS で切り替える（group parent 対応）。 */}
          <CheckboxPrimitive.Indicator className="flex items-center justify-center size-full text-on-primary">
            <CheckMark />
            <IndeterminateMark />
          </CheckboxPrimitive.Indicator>
        </span>
      </CheckboxPrimitive.Root>
    );
  },
);

Checkbox.displayName = "Checkbox";
