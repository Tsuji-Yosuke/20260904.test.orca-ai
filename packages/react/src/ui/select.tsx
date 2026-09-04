"use client";

import { forwardRef, useId, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Select as BaseSelect } from "@base-ui/react/select";
import {
  OptionRowIcon,
  OptionRowLabel,
  optionRowClassName,
} from "@/registry/orca/lib/option-row";

export type SelectSize = "small" | "medium" | "large";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Item の装飾 Leading Icon（Select.md AC-Select-13）。アクセシブルネームに寄与しない。 */
  leadingIcon?: ReactNode;
  /** Item の装飾 Trailing Icon（Select.md AC-Select-13）。アクセシブルネームに寄与しない。 */
  trailingIcon?: ReactNode;
}

export interface SelectProps {
  items: readonly SelectOption[];
  /** 選択値（controlled）。単一選択のみ。 */
  value?: string | null;
  /** 初期選択値（uncontrolled）。 */
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  size?: SelectSize;
  disabled?: boolean;
  /** 読み取り専用（値は読めるが操作不可）。 */
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  /** バリデーションエラー。下線・背景と Error Text 行で通知。 */
  error?: boolean;
  errorMessage?: ReactNode;
  /** Trigger 先頭の装飾アイコン（Select.md Anatomy の Leading Icon）。アクセシブルネームに寄与しない。 */
  leadingIcon?: ReactNode;
  /** Trigger のアクセシブルネーム（プレースホルダー単独に依存しない）。 */
  "aria-label"?: string;
  className?: string;
}

// Figma node 393:268 実測（get_design_context、2026-08-07 再実測）。
// Small/Medium/Large は高さ 40/48/56px（component-full と一致）で機能差は持たない
// （意味は「埋め込み密度 / 標準 / 主役」）。min-height + 中央揃えで写像し、通常時は
// Figma と一致、利用側 CSS で line-height 等が拡大されたときは内容を切らずに伸びる。
// 値・Placeholder のウェイトは Figma 実測どおり Small が標準、Medium/Large は太字。
// Error Text は 12/14/16px の標準ウェイトで Size に追従し、行高 24px（component-half-md）。
// アイコン（Leading / chevron）は 16/20/24px で Size に追従する。
// 横 padding は Figma 側が 0（作画漏れ疑い、issue #76 で確認中）のため Figma には合わせず、
// size に依らず padding/md（16px）で統一する（ユーザー裁定 2026-08-07、Select.md Open Questions）。
const SIZE_CLASS: Record<
  SelectSize,
  { trigger: string; text: string; errorText: string; icon: string }
> = {
  small: {
    trigger: "min-h-component-full-sm px-padding-md",
    text: "typography-tight-body-small",
    errorText: "typography-tight-body-small",
    icon: "size-icon-sm",
  },
  medium: {
    trigger: "min-h-component-full-md px-padding-md",
    text: "typography-tight-body-medium-bold",
    errorText: "typography-tight-body-medium",
    icon: "size-icon-md",
  },
  large: {
    trigger: "min-h-component-full-lg px-padding-md",
    text: "typography-tight-body-large-bold",
    errorText: "typography-tight-body-large",
    icon: "size-icon-lg",
  },
};

const ChevronGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function isEmptyValue(v: string | null | undefined): boolean {
  return v == null || v === "";
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(function Select(
  {
    items,
    value,
    defaultValue,
    onValueChange,
    placeholder = "選択してください",
    size = "medium",
    disabled = false,
    readOnly = false,
    required = false,
    name,
    error = false,
    errorMessage,
    leadingIcon,
    "aria-label": ariaLabel,
    className,
  },
  ref,
) {
  const sizes = SIZE_CLASS[size];
  const errorId = useId();
  const hasError = error && errorMessage != null;

  // 値の有無（Filled/Empty 軸）。Figma は Enabled キャンバスを未選択（placeholder 前景）で
  // 描いており、アイコン前景を値の有無で切り替えるために uncontrolled でも追跡する。
  const [uncontrolledValue, setUncontrolledValue] = useState<string | null>(
    defaultValue ?? null,
  );
  const currentValue = value !== undefined ? value : uncontrolledValue;
  const isFilled = !isEmptyValue(currentValue);

  // 前景色の写像（Figma 2026-08-07 実測）: Error は値・アイコンともエラー色、Disabled は
  // 弱色（Trigger の文字色を継承）、それ以外はアイコンのみ値の有無で
  // on-placeholder-container（未選択 #8c8c8c）/ on-surface-dim（選択済み）を切り替える。
  const inheritForeground = disabled || hasError;
  const iconClass = inheritForeground
    ? undefined
    : isFilled
      ? "text-on-surface-dim"
      : "text-on-placeholder-container";
  const placeholderClass = inheritForeground
    ? undefined
    : "text-on-placeholder-container";

  const labelOf = (v: string) => items.find((i) => i.value === v)?.label ?? v;

  const renderValue = (val: unknown) => {
    if (isEmptyValue(val as string | null)) {
      return <span className={placeholderClass}>{placeholder}</span>;
    }
    return labelOf(val as string);
  };

  return (
    <div ref={ref} className={clsx("flex flex-col gap-margin-md", className)}>
      <BaseSelect.Root
        items={items}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => {
          setUncontrolledValue(next);
          onValueChange?.(next);
        }}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        name={name}
      >
        <BaseSelect.Trigger
          data-size={size}
          aria-label={ariaLabel}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className={clsx(
            "flex w-full items-center gap-margin-md text-left",
            "border-b-sm",
            "transition-[background-color,border-color,box-shadow] duration-150 ease-in-out",
            "focus-visible:outline-none",
            // border-style は状態ごとに solid/dashed が排他なので、共通クラスとして
            // 一括で持たず各分岐に持たせる（同じプロパティを共通クラスと分岐クラスの
            // 両方に置くと、Tailwind の生成 CSS はソース順で勝敗が決まり className の
            // 記述順に従わないため、border-dashed が border-solid に負ける事故があった）。
            // 優先度: Disabled > Read only > Error > Active(data-popup-open) > Focused/Hover > Enabled
            // (Select.md State Model)。Active/Focused/Hover は相互排他な JS 分岐ではなく
            // 実際の疑似クラス/data 属性で駆動するため、この4分岐は「その他が絡まない
            // 素の interactive 状態」の枝の中でのみ hover/focus-visible を効かせる。
            disabled
              ? "border-solid bg-disabled border-outline text-on-disabled cursor-not-allowed"
              : readOnly
                ? "border-dashed bg-surface border-outline text-on-surface"
                : hasError
                  ? "border-solid bg-error-container border-on-error-container text-on-error-container"
                  : clsx(
                      "text-on-surface",
                      "border-solid bg-surface border-outline-bright",
                      // Active（Suggestion Surface が開いている）は Enabled と同じプレーンな
                      // サーフェス。Hover/Focused は data-popup-open のときは無効化する
                      // （Active > Hover/Focused の優先度）。
                      "[&:hover:not([data-popup-open])]:bg-surface-container",
                      "[&:hover:not([data-popup-open])]:border-primary",
                      "[&:hover:not([data-popup-open])]:border-b-md",
                      "[&:focus-visible:not([data-popup-open])]:bg-surface-container",
                      "[&:focus-visible:not([data-popup-open])]:border-primary",
                      "[&:focus-visible:not([data-popup-open])]:border-b-md",
                      "[&:focus-visible:not([data-popup-open])]:shadow-focus-outline",
                    ),
            sizes.trigger,
            sizes.text,
          )}
        >
          {leadingIcon && (
            <span
              data-leading-icon
              aria-hidden="true"
              className={clsx(
                "shrink-0 inline-flex items-center justify-center",
                iconClass,
                sizes.icon,
              )}
            >
              {leadingIcon}
            </span>
          )}
          <BaseSelect.Value className="min-w-0 flex-1 truncate">
            {(val: unknown) => renderValue(val)}
          </BaseSelect.Value>
          <BaseSelect.Icon
            className={clsx(
              "shrink-0 inline-flex items-center justify-center",
              iconClass,
              "transition-transform duration-150 data-[popup-open]:rotate-180",
              sizes.icon,
            )}
          >
            <ChevronGlyph className="size-full" />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>

        <BaseSelect.Portal>
          {/* alignItemWithTrigger（既定 true）は選択中アイテムをトリガーに重ねて開く
              ネイティブ select 風の配置で、Figma の「Trigger 直下に連結」と食い違うため無効化 */}
          <BaseSelect.Positioner
            alignItemWithTrigger={false}
            sideOffset={4}
            className="z-50 outline-none"
          >
            {/* Surface は内側 padding を持たず、高さは Item の積み上げで決まる
                （Figma node 1688:26547 実測・2026-08-07 裁定）。角丸は端の行を切り抜く。 */}
            <BaseSelect.Popup
              className={clsx(
                "max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] overflow-y-auto",
                "rounded-md border-sm border-outline-bright bg-surface shadow-level-2",
              )}
            >
              <BaseSelect.List>
                {items.map((item) => (
                  <BaseSelect.Item
                    key={item.value}
                    value={item.value}
                    disabled={item.disabled}
                    className={optionRowClassName({ selectable: true })}
                  >
                    {item.leadingIcon && (
                      <OptionRowIcon>{item.leadingIcon}</OptionRowIcon>
                    )}
                    <OptionRowLabel>{item.label}</OptionRowLabel>
                    {item.trailingIcon && (
                      <OptionRowIcon>{item.trailingIcon}</OptionRowIcon>
                    )}
                  </BaseSelect.Item>
                ))}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>

      {hasError && (
        <p
          id={errorId}
          className={clsx(
            "flex min-h-component-half-md items-center text-error",
            sizes.errorText,
          )}
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
});

Select.displayName = "Select";
