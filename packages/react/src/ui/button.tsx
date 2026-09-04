"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";
import { FOCUS_VISIBLE_RING } from "@/registry/orca/lib/focus-ring";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const BASE_CLASS = [
  "inline-flex items-center justify-center rounded-sm border-sm",
  "whitespace-nowrap leading-none select-none",
  "transition-[background-color,background-image,color,border-color,box-shadow] duration-150 ease-in-out",
  FOCUS_VISIBLE_RING,
  "disabled:cursor-not-allowed disabled:[background-image:none]",
].join(" ");

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: [
    "border-transparent bg-primary text-on-primary",
    "hover:state-layer-8",
    "active:state-layer-16",
    "disabled:border-transparent disabled:bg-disabled disabled:text-on-disabled",
  ].join(" "),
  secondary: [
    "border-outline bg-transparent text-on-surface-dim",
    "hover:state-layer-8",
    "active:state-layer-16",
    "disabled:border-disabled disabled:bg-transparent disabled:text-on-disabled",
  ].join(" "),
  ghost: [
    "border-transparent bg-transparent text-primary",
    "hover:state-layer-8",
    "active:state-layer-16",
    "disabled:border-transparent disabled:bg-transparent disabled:text-on-disabled",
  ].join(" "),
};

const SIZE_CLASS: Record<ButtonSize, { container: string; label: string; icon: string }> = {
  sm: {
    container: "min-h-component-full-sm gap-margin-md px-padding-md py-padding-xs",
    label: "typography-tight-body-small",
    icon: "size-icon-sm",
  },
  md: {
    container: "min-h-component-full-md gap-margin-md px-padding-lg py-padding-xs",
    label: "typography-tight-body-medium-bold",
    icon: "size-icon-md",
  },
  lg: {
    container: "min-h-component-full-lg gap-margin-lg px-padding-3xl py-padding-md",
    label: "typography-tight-body-large-bold",
    icon: "size-icon-lg",
  },
};

const ICON_CLASS = "shrink-0 inline-flex items-center justify-center";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    leadingIcon,
    trailingIcon,
    disabled,
    type = "button",
    className,
    children,
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
      data-variant={variant}
      data-size={size}
      className={clsx(BASE_CLASS, VARIANT_CLASS[variant], sizes.container, className)}
    >
      {leadingIcon && (
        <span className={clsx(ICON_CLASS, sizes.icon)} aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <span className={sizes.label}>{children}</span>
      {trailingIcon && (
        <span className={clsx(ICON_CLASS, sizes.icon)} aria-hidden="true">
          {trailingIcon}
        </span>
      )}
    </button>
  );
});

Button.displayName = "Button";
