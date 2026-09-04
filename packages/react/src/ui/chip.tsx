"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";
import { Toggle } from "@base-ui/react/toggle";
import { FOCUS_VISIBLE_RING } from "@/registry/orca/lib/focus-ring";

export type ChipMode = "static" | "selectable" | "removable";
export type ChipSize = "sm" | "md" | "lg";

export interface ChipProps
  extends Omit<HTMLAttributes<HTMLElement>, "onClick"> {
  /** 用途モード。既定は static。 */
  mode?: ChipMode;
  size?: ChipSize;
  /** Label の意味を補強する任意のアイコン（leading スロット）。 */
  leadingIcon?: ReactNode;
  /** 任意の付随アイコン（trailing スロット）。removable では削除ボタンが trailing を占める。 */
  trailingIcon?: ReactNode;
  /** enabled / disabled。selectable では native disabled に写像。 */
  disabled?: boolean;
  /** selectable: 選択状態（controlled）。 */
  selected?: boolean;
  /** selectable: uncontrolled の初期選択状態。 */
  defaultSelected?: boolean;
  /** selectable: 選択がトグルしたときに次の値を渡す。 */
  onSelectedChange?: (selected: boolean) => void;
  /** removable: 削除操作。 */
  onRemove?: () => void;
  /** removable: 削除 button のアクセシブルネーム。未指定かつ children が文字列なら `${children} を削除`。 */
  removeLabel?: string;
}

// ピル形状・1px 枠。Figma の Chip は固定高さ（Sizing/Component/Half）で内容を中央寄せする。
const BASE_CLASS = [
  "inline-flex items-center justify-center rounded-full border-sm",
  "select-none align-middle",
  "transition-[background-color,background-image,color,border-color,box-shadow] duration-150 ease-in-out",
].join(" ");

const SIZE_CLASS: Record<
  ChipSize,
  { container: string; label: string; labelBold: string; icon: string; gap: string }
> = {
  sm: {
    container: "h-component-half-sm px-padding-xs",
    label: "typography-standard-label-small",
    // 完全リテラルで持つ（Tailwind JIT は動的合成クラスを検出できないため）。
    labelBold: "group-data-[pressed]:typography-standard-label-small-bold",
    icon: "size-icon-sm",
    gap: "gap-padding-2xs",
  },
  md: {
    container: "h-component-half-md px-padding-sm",
    label: "typography-standard-label-medium",
    labelBold: "group-data-[pressed]:typography-standard-label-medium-bold",
    icon: "size-icon-md",
    gap: "gap-padding-2xs",
  },
  lg: {
    container: "h-component-half-lg px-padding-sm",
    label: "typography-standard-label-large",
    labelBold: "group-data-[pressed]:typography-standard-label-large-bold",
    icon: "size-icon-lg",
    gap: "gap-padding-2xs",
  },
};

const ICON_CLASS = "shrink-0 inline-flex items-center justify-center";

// 非選択 / 静的の見た目（淡い面＋細い前景色の輪郭＋前景色のラベル）。アイコンは currentColor を継承する。
const UNSELECTED_CLASS = "border-on-secondary bg-secondary text-on-secondary";
// 状態レイヤーは base fill を潰さないよう background-image の重ねで合成する。
const HOVER_LAYER = "hover:state-layer-8";
const ACTIVE_LAYER = "active:state-layer-16";
const FOCUS_CLASS = FOCUS_VISIBLE_RING;
// 選択（押下）は塗りつぶし＋反転ラベルで最強の強調。ラベルの太字は label 側で group-data から行う。
const SELECTED_CLASS =
  "data-[pressed]:border-primary data-[pressed]:bg-primary data-[pressed]:text-on-primary";
const DISABLED_STATIC_CLASS = "border-disabled bg-disabled text-on-disabled";
const DISABLED_INTERACTIVE_CLASS =
  "disabled:cursor-not-allowed disabled:[background-image:none] disabled:border-disabled disabled:bg-disabled disabled:text-on-disabled";

export const Chip = forwardRef<HTMLElement, ChipProps>(function Chip(
  {
    mode = "static",
    size = "md",
    leadingIcon,
    trailingIcon,
    disabled = false,
    selected,
    defaultSelected,
    onSelectedChange,
    onRemove,
    removeLabel,
    className,
    children,
    ...rest
  },
  ref,
) {
  const sizes = SIZE_CLASS[size];

  const renderIcon = (icon: ReactNode) =>
    icon ? (
      <span className={clsx(ICON_CLASS, sizes.icon)} aria-hidden="true">
        {icon}
      </span>
    ) : null;

  const leading = renderIcon(leadingIcon);
  const trailing = renderIcon(trailingIcon);

  if (mode === "selectable") {
    // Base UI Toggle が aria-pressed と controlled/uncontrolled を担保する。
    // ラベルの太字は選択時（data-pressed）だけ group 経由で bold variant に差し替える。
    const label = (
      <span className={clsx(sizes.label, sizes.labelBold)}>{children}</span>
    );
    return (
      <Toggle
        {...(rest as HTMLAttributes<HTMLButtonElement>)}
        ref={ref as React.Ref<HTMLButtonElement>}
        pressed={selected}
        defaultPressed={defaultSelected}
        onPressedChange={(next) => onSelectedChange?.(next)}
        disabled={disabled}
        data-mode="selectable"
        data-size={size}
        className={clsx(
          "group",
          BASE_CLASS,
          sizes.container,
          sizes.gap,
          // 既定（非選択）と選択時（data-pressed）の見た目。選択は塗りつぶし＋反転で示す。
          UNSELECTED_CLASS,
          SELECTED_CLASS,
          HOVER_LAYER,
          ACTIVE_LAYER,
          FOCUS_CLASS,
          DISABLED_INTERACTIVE_CLASS,
          className,
        )}
      >
        {leading}
        {label}
        {trailing}
      </Toggle>
    );
  }

  const label = <span className={sizes.label}>{children}</span>;

  if (mode === "removable") {
    const derivedRemoveLabel =
      removeLabel ??
      (typeof children === "string" ? `${children} を削除` : "削除");
    return (
      <span
        {...rest}
        ref={ref as React.Ref<HTMLSpanElement>}
        data-mode="removable"
        data-size={size}
        data-disabled={disabled || undefined}
        className={clsx(
          BASE_CLASS,
          sizes.container,
          sizes.gap,
          disabled ? DISABLED_STATIC_CLASS : UNSELECTED_CLASS,
          className,
        )}
      >
        {leading}
        {label}
        <button
          type="button"
          disabled={disabled}
          aria-label={derivedRemoveLabel}
          onClick={onRemove}
          className={clsx(
            ICON_CLASS,
            sizes.icon,
            "rounded-full",
            "transition-[background-color,background-image,color] duration-150 ease-in-out",
            HOVER_LAYER,
            ACTIVE_LAYER,
            FOCUS_CLASS,
            "disabled:cursor-not-allowed disabled:text-on-disabled",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-full"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </span>
    );
  }

  // static
  return (
    <span
      {...rest}
      ref={ref as React.Ref<HTMLSpanElement>}
      data-mode="static"
      data-size={size}
      data-disabled={disabled || undefined}
      className={clsx(
        BASE_CLASS,
        sizes.container,
        sizes.gap,
        disabled ? DISABLED_STATIC_CLASS : UNSELECTED_CLASS,
        className,
      )}
    >
      {leading}
      {label}
      {trailing}
    </span>
  );
});

Chip.displayName = "Chip";
