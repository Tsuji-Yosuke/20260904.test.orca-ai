"use client";

import {
  forwardRef,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { OptionRowLabel, optionRowClassName } from "@/registry/orca/lib/option-row";
import { FOCUS_VISIBLE_RING } from "@/registry/orca/lib/focus-ring";

export type SearchSize = "small" | "medium" | "large";

export interface SearchProps {
  /** サジェスト候補。文字列配列。未指定ならサジェスト無しの検索入力。 */
  items?: readonly string[];
  /** 入力値（controlled）。 */
  value?: string;
  /** 入力値の初期値（uncontrolled）。 */
  defaultValue?: string;
  /** 入力値が変わるたびに呼ばれる（即時絞り込み）。 */
  onValueChange?: (value: string) => void;
  /** Enter 確定（サジェスト未ハイライト時）に現在値で呼ばれる。 */
  onSubmit?: (value: string) => void;
  /** サジェスト項目を選んだときに呼ばれる。 */
  onSelect?: (value: string) => void;
  placeholder?: string;
  size?: SearchSize;
  disabled?: boolean;
  /** バリデーションエラー。輪郭と説明テキストで通知する。 */
  error?: boolean;
  /** error のときの説明テキスト。aria-describedby で結びつく。 */
  errorMessage?: ReactNode;
  /** 非同期処理中。Trailing にスピナーを出し aria-busy を立てる。 */
  loading?: boolean;
  /** Container 末尾のヒント（⌘K など）。loading 中は隠れる。 */
  trailingHint?: ReactNode;
  /** サジェストが0件のときの表示。 */
  emptyMessage?: ReactNode;
  /** 入力のアクセシブルネーム（プレースホルダー単独に依存しない）。 */
  "aria-label"?: string;
  /** Clear のアクセシブルネーム。既定「検索語をクリア」。 */
  clearLabel?: string;
  className?: string;
}

// Figma component set（node 1748:16971、2026-07-28 実測）。Small/Medium/Large は
// 高さ 40/48/56px（component-full と一致）。縦 padding の積み上げで高さを作らず、
// min-height + 中央揃えで写像する: 通常時は Figma とぴったり一致し、利用側 CSS で
// line-height 等が拡大されたときは内容を切らずに伸びる（Search.md Layout And Density / issue #46）。
// 横 padding・要素間隔は全 Size 共通 8px、アイコンは 16/20/24px で Size に追従する。
const SIZE_CLASS: Record<
  SearchSize,
  { container: string; input: string; icon: string }
> = {
  small: {
    container: "min-h-component-full-sm gap-margin-lg px-padding-xs",
    input: "typography-tight-body-small",
    icon: "size-icon-sm",
  },
  medium: {
    container: "min-h-component-full-md gap-margin-lg px-padding-xs",
    input: "typography-tight-body-medium",
    icon: "size-icon-md",
  },
  large: {
    container: "min-h-component-full-lg gap-margin-lg px-padding-xs",
    input: "typography-tight-body-large",
    icon: "size-icon-lg",
  },
};

const SearchGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const Spinner = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={clsx(className, "animate-spin")}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} opacity={0.25} />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
);

const CloseGlyph = ({ className }: { className?: string }) => (
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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const Search = forwardRef<HTMLInputElement, SearchProps>(function Search(
  {
    items,
    value,
    defaultValue,
    onValueChange,
    onSubmit,
    onSelect,
    placeholder,
    size = "medium",
    disabled = false,
    error = false,
    errorMessage,
    loading = false,
    trailingHint,
    emptyMessage = "該当する候補がありません",
    "aria-label": ariaLabel,
    clearLabel = "検索語をクリア",
    className,
  },
  ref,
) {
  const sizes = SIZE_CLASS[size];
  const errorId = useId();
  const hasError = error && errorMessage != null;
  // サジェスト候補（Autocomplete.Popup）の幅を、Base UI 既定の anchor（<input> 自身）ではなく
  // 虫眼鏡アイコン・Clear ボタンを含む視覚的な検索ボックス全体に一致させるための ref。
  // 既定のままだと --anchor-width が <input> の実測幅になり、サジェストが入力欄より
  // 狭く・左にズレて表示される。
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    // Base UI Autocomplete.Input の内部 Enter ハンドラは、この onKeyDown より
    // 後に実行される（props 合成順の都合で event.defaultPrevented では判定できない。
    // 詳細は Search.notes.md 参照）ため、ハイライト中の候補があるかどうかは
    // Base UI が仮想フォーカスの表現として付与する aria-activedescendant の有無で判定する。
    // 候補がハイライトされていれば Base UI 側がこの後 Enter でその候補を選択するので、
    // ここでは onSubmit を呼ばない（呼ぶと選択と送信が二重発火する）。
    const hasHighlightedSuggestion = event.currentTarget.hasAttribute(
      "aria-activedescendant",
    );
    if (!hasHighlightedSuggestion) {
      onSubmit?.(event.currentTarget.value);
    }
  };

  return (
    <div className={clsx("flex flex-col gap-margin-sm", className)}>
      <Autocomplete.Root
        items={items}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onValueChange={(next) => onValueChange?.(next)}
        onItemHighlighted={() => {}}
      >
        <div
          ref={containerRef}
          data-size={size}
          data-error={hasError || undefined}
          aria-busy={loading || undefined}
          className={clsx(
            "flex items-center",
            // 下線幅・角丸が state ごとに切り替わるため background-color/border-color/box-shadow のみ遷移させる
            // （border-width の遷移は Tabs の実装判断を踏襲し、レイアウトジャンプを避けるためアニメーションしない）
            "transition-[background-color,border-color,box-shadow] duration-150 ease-in-out",
            "focus-within:shadow-focus-outline",
            disabled
              ? // Disabled: 背景・下線とも他 state と共有しない専用トークン
                "cursor-not-allowed bg-disabled rounded-t-xs border-b-sm border-on-disabled"
              : hasError
                ? // Error: 下線 2px + 専用警告色。Suggestion Surface 的な連続性のため角丸なし
                  "bg-surface rounded-none border-b-md border-error"
                : clsx(
                    // Enabled: 基準は下線（枠ではない）。角丸は上 2 辺のみの小さい丸み
                    "bg-surface rounded-t-xs border-b-sm border-outline-bright",
                    // Hover: 背景 + 下線色/太さが連動して変わる。ただし Focused（:focus-within）中は
                    // 優先度 Focused > Hover により無効化する（Base UI Autocomplete の data-popup-open が
                    // 立つ Active 中は常に :focus-within も真になるため、この除外だけで Active > Hover も成立する）
                    "[&:hover:not(:focus-within)]:bg-surface-container",
                    "[&:hover:not(:focus-within)]:border-b-md",
                    "[&:hover:not(:focus-within)]:border-primary",
                    // Active: サジェスト展開中（Autocomplete.Input の data-popup-open）は下線 2px・黒、角丸なし
                    "has-[[data-popup-open]]:rounded-none",
                    "has-[[data-popup-open]]:border-b-md",
                    "has-[[data-popup-open]]:border-primary",
                  ),
            sizes.container,
          )}
        >
          <span
            data-search-icon
            aria-hidden="true"
            className={clsx(
              "shrink-0 inline-flex items-center justify-center",
              hasError ? "text-error" : "text-on-surface-dim",
              sizes.icon,
            )}
          >
            <SearchGlyph className="size-full" />
          </span>

          <Autocomplete.Input
            ref={ref}
            type="search"
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
            onKeyDown={handleKeyDown}
            className={clsx(
              // self-stretch: コンテナ（min-height）の縦全域を Input のヒット領域にする。
              // 親が min-height のみで height を持たないため h-full は使えない
              "self-stretch min-w-0 flex-1 bg-transparent outline-none",
              hasError
                ? "text-error placeholder:text-error"
                : "text-on-surface-dim placeholder:text-on-placeholder",
              "disabled:cursor-not-allowed disabled:text-on-disabled",
              // WebKit 系ブラウザ（Chrome 含む）は type="search" に独自の cancel ボタン（青い ×）を
              // 自動描画し、Autocomplete.Clear の × と二重に表示されるため無効化する。
              // 色・寸法の値を持ち込まない純粋な pseudo-element リセット。
              "[&::-webkit-search-cancel-button]:appearance-none",
              sizes.input,
            )}
          />

          <Autocomplete.Clear
            aria-label={clearLabel}
            className={clsx(
              "shrink-0 inline-flex items-center justify-center rounded-full",
              // Error 時は Clear の X アイコンをそのままエラー専用アイコンとして転用する
              // （Figma 実データの Trailing Icon は Clear と同じ X パスを --ui/error で塗るのみで、
              // 別形状のアイコンではなかった。判断根拠は Search.notes.md 参照）
              hasError ? "text-error" : "text-on-surface-dim",
              "hover:state-layer-8",
              FOCUS_VISIBLE_RING,
              sizes.icon,
            )}
          >
            <CloseGlyph className="size-full" />
          </Autocomplete.Clear>

          {loading ? (
            <span
              aria-hidden="true"
              className={clsx(
                "shrink-0 inline-flex items-center justify-center text-on-surface-dim",
                sizes.icon,
              )}
            >
              <Spinner className="size-full" />
            </span>
          ) : trailingHint ? (
            <span className="shrink-0 inline-flex items-center text-on-surface-dim">
              {trailingHint}
            </span>
          ) : null}
        </div>

        {items && items.length > 0 && (
          <Autocomplete.Portal>
            <Autocomplete.Positioner
              anchor={containerRef}
              sideOffset={4}
              className="z-50 outline-none"
            >
              <Autocomplete.Popup
                className={clsx(
                  "max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] overflow-y-auto",
                  "rounded-md border-sm border-outline-bright bg-surface shadow-level-2",
                  "py-padding-sm",
                )}
              >
                <Autocomplete.Empty className="px-padding-lg py-padding-sm typography-tight-body-small text-on-surface-dim">
                  {emptyMessage}
                </Autocomplete.Empty>
                <Autocomplete.List>
                  {(item: string) => (
                    <Autocomplete.Item
                      key={item}
                      value={item}
                      onClick={() => onSelect?.(item)}
                      // 候補行の見た目は Select と共有する非公開プリミティブに委譲
                      // （selectable は使わない: Search は候補確定後に Surface を閉じるため
                      // 永続的な選択済み表現を持たない。詳細は internal/option-row.tsx）。
                      className={optionRowClassName()}
                    >
                      <OptionRowLabel>{item}</OptionRowLabel>
                    </Autocomplete.Item>
                  )}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        )}
      </Autocomplete.Root>

      {hasError && (
        <p id={errorId} className="typography-tight-body-small text-error">
          {errorMessage}
        </p>
      )}
    </div>
  );
});

Search.displayName = "Search";
