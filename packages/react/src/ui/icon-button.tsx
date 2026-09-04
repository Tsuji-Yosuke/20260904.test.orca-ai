"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";
import { FOCUS_VISIBLE_RING } from "@/registry/orca/lib/focus-ring";

export type IconButtonVariant = "primary" | "secondary" | "ghost";
export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonShape = "rounded" | "circle";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> {
  /** アクセシブルネーム。可視ラベルが無いため必須。 */
  label: string;
  /** 中央に配置する単一のアイコン。 */
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  shape?: IconButtonShape;
}

const BASE_CLASS = [
  "inline-flex items-center justify-center border-sm",
  "leading-none select-none",
  "transition-[background-color,background-image,color,border-color,box-shadow] duration-150 ease-in-out",
  FOCUS_VISIBLE_RING,
  "disabled:cursor-not-allowed disabled:[background-image:none]",
].join(" ");

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  primary: [
    "border-transparent bg-primary text-on-primary",
    "hover:state-layer-8",
    "active:state-layer-16",
    "disabled:border-transparent disabled:bg-disabled disabled:text-on-disabled",
  ].join(" "),
  secondary: [
    "border-outline bg-transparent text-on-surface-dim",
    "hover:state-layer-8",
    "active:bg-surface-bright active:state-layer-16",
    "disabled:border-disabled disabled:bg-transparent disabled:text-on-disabled",
  ].join(" "),
  ghost: [
    "border-transparent bg-transparent text-primary",
    "hover:state-layer-8",
    "active:state-layer-16",
    "disabled:border-transparent disabled:bg-transparent disabled:text-on-disabled",
  ].join(" "),
};

// Figma の IconButton は固定正方（Small 40 / Medium 48 / Large 56、円形も同寸）。
// padding 積み上げでは Medium=48 を作る 14px トークンが無いため、sizing トークンの固定正方で再現する。
const SIZE_CLASS: Record<IconButtonSize, { container: string; icon: string }> = {
  sm: { container: "size-[var(--sizing-5xl)]", icon: "size-icon-sm" },
  md: { container: "size-[var(--sizing-6xl)]", icon: "size-icon-md" },
  lg: { container: "size-[var(--sizing-7xl)]", icon: "size-icon-lg" },
};

const SHAPE_CLASS: Record<IconButtonShape, string> = {
  rounded: "rounded-md",
  circle: "rounded-full",
};

const ICON_CLASS = "shrink-0 inline-flex items-center justify-center";

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      icon,
      variant = "primary",
      size = "md",
      shape = "rounded",
      disabled,
      type = "button",
      className,
      ...rest
    },
    ref,
  ) {
    const sizes = SIZE_CLASS[size];
    return (
      <button
        {...rest}
        ref={ref}
        type={type}
        disabled={disabled}
        aria-label={label}
        data-variant={variant}
        data-size={size}
        data-shape={shape}
        className={clsx(
          BASE_CLASS,
          VARIANT_CLASS[variant],
          SHAPE_CLASS[shape],
          sizes.container,
          className,
        )}
      >
        <span className={clsx(ICON_CLASS, sizes.icon)} aria-hidden="true">
          {icon}
        </span>
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
