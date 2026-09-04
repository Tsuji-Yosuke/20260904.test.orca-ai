"use client";

import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { getPaginationItems } from "./get-pagination-items";
import { FOCUS_VISIBLE_RING } from "@/registry/orca/lib/focus-ring";

export interface PaginationProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  /** 総ページ数。1 以下のときは何も描画しない。 */
  count: number;
  /** 現在ページ（1 始まり、controlled）。 */
  page?: number;
  /** 現在ページの初期値（uncontrolled）。既定 1。 */
  defaultPage?: number;
  /** ページ遷移時に次のページ番号を渡す。 */
  onPageChange?: (page: number) => void;
  /** 現在ページの左右に表示する隣接ページ数。既定 1。 */
  siblingCount?: number;
  /** 両端に常に表示するページ数。既定 1。 */
  boundaryCount?: number;
  /** First / Last コントロールを併設する。既定 false。 */
  showEndpoints?: boolean;
  /** 指定すると Page Item / 各コントロールをリンク（a 要素）として描画する。 */
  getHref?: (page: number) => string;
  /** nav のアクセシブルネーム。既定「ページネーション」。 */
  label?: string;
  /** Page Item のアクセシブルネーム生成。既定 `${page} ページ目`。 */
  pageLabel?: (page: number) => string;
  previousLabel?: string;
  nextLabel?: string;
  firstLabel?: string;
  lastLabel?: string;
}

// 操作可能要素の状態レイヤー（base を潰さないよう background-image で合成）。
const INTERACTIVE_LAYER = clsx("hover:state-layer-8", "active:state-layer-16");

// 矢印コントロール: 40px の正方ヒット領域（IconButton 相当）。有効は濃色、disabled は淡色。
const CONTROL_CLASS = clsx(
  "inline-flex items-center justify-center shrink-0",
  "size-component-full-md rounded-md bg-transparent text-on-surface-dim select-none",
  "transition-[background-color,background-image,color,box-shadow] duration-150 ease-in-out",
  FOCUS_VISIBLE_RING,
  "disabled:cursor-not-allowed disabled:[background-image:none] disabled:text-on-surface-bright",
);

// Page Item: 幅 24px・上下 8px のコンパクトなテキスト（角丸/枠なし）。
const ITEM_BASE = clsx(
  "inline-flex items-center justify-center shrink-0 overflow-clip",
  "min-w-[24px] py-padding-xs select-none",
  "transition-[background-color,background-image,color,border-color] duration-150 ease-in-out",
  FOCUS_VISIBLE_RING,
);

// 非現在の Page Item: 淡い前景色。
const ITEM_CLASS = clsx(ITEM_BASE, INTERACTIVE_LAYER, "text-on-surface-bright", "typography-tight-body-medium");

// current は下底 2px のボーダー＋太字の前景色で示す（背景塗りは持たない）。
const CURRENT_CLASS = clsx(
  ITEM_BASE,
  "text-on-surface-dim cursor-default border-b-md border-primary",
  "typography-tight-body-medium-bold",
);

// 省略記号も Page Item と同じ寸法・淡色で並べる。
const ELLIPSIS_CLASS = clsx(ITEM_BASE, "text-on-surface-bright", "typography-tight-body-medium");

const ICON_CLASS = "size-icon-sm";

const ChevronLeft = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={clsx(ICON_CLASS, "rtl:rotate-180")}
    aria-hidden="true"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={clsx(ICON_CLASS, "rtl:rotate-180")}
    aria-hidden="true"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const DoubleChevronLeft = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={clsx(ICON_CLASS, "rtl:rotate-180")}
    aria-hidden="true"
  >
    <polyline points="11 18 5 12 11 6" />
    <polyline points="18 18 12 12 18 6" />
  </svg>
);

const DoubleChevronRight = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={clsx(ICON_CLASS, "rtl:rotate-180")}
    aria-hidden="true"
  >
    <polyline points="13 18 19 12 13 6" />
    <polyline points="6 18 12 12 6 6" />
  </svg>
);

export const Pagination = forwardRef<HTMLElement, PaginationProps>(
  function Pagination(
    {
      count,
      page,
      defaultPage = 1,
      onPageChange,
      siblingCount = 1,
      boundaryCount = 1,
      showEndpoints = false,
      getHref,
      label = "ページネーション",
      pageLabel = (p) => `${p} ページ目`,
      previousLabel = "前のページ",
      nextLabel = "次のページ",
      firstLabel = "最初のページ",
      lastLabel = "最後のページ",
      className,
      ...rest
    },
    ref,
  ) {
    const isControlled = page !== undefined;
    const [internalPage, setInternalPage] = useState(defaultPage);
    const currentPage = isControlled ? page : internalPage;

    if (count <= 1) return null;

    const goTo = (target: number) => {
      if (target === currentPage || target < 1 || target > count) return;
      if (!isControlled) setInternalPage(target);
      onPageChange?.(target);
    };

    const items = getPaginationItems({
      page: currentPage,
      count,
      siblingCount,
      boundaryCount,
    });

    const renderControl = (
      key: string,
      target: number,
      ariaLabel: string,
      icon: ReactNode,
      disabled: boolean,
    ) => {
      // disabled な端コントロールは（リンクモードでも）非操作の button として残し、淡色表示する。
      if (disabled) {
        return (
          <button
            key={key}
            type="button"
            disabled
            aria-label={ariaLabel}
            className={CONTROL_CLASS}
          >
            {icon}
          </button>
        );
      }
      const className = clsx(CONTROL_CLASS, INTERACTIVE_LAYER);
      return getHref ? (
        <a
          key={key}
          href={getHref(target)}
          aria-label={ariaLabel}
          className={className}
          onClick={() => goTo(target)}
        >
          {icon}
        </a>
      ) : (
        <button
          key={key}
          type="button"
          aria-label={ariaLabel}
          className={className}
          onClick={() => goTo(target)}
        >
          {icon}
        </button>
      );
    };

    const renderPageItem = (p: number) => {
      const isCurrent = p === currentPage;
      const ariaLabel = pageLabel(p);
      if (isCurrent) {
        return (
          <button
            key={`page-${p}`}
            type="button"
            aria-current="page"
            aria-label={ariaLabel}
            className={CURRENT_CLASS}
          >
            {p}
          </button>
        );
      }
      return getHref ? (
        <a
          key={`page-${p}`}
          href={getHref(p)}
          aria-label={ariaLabel}
          className={ITEM_CLASS}
          onClick={() => goTo(p)}
        >
          {p}
        </a>
      ) : (
        <button
          key={`page-${p}`}
          type="button"
          aria-label={ariaLabel}
          className={ITEM_CLASS}
          onClick={() => goTo(p)}
        >
          {p}
        </button>
      );
    };

    const atStart = currentPage <= 1;
    const atEnd = currentPage >= count;

    return (
      <nav
        {...rest}
        ref={ref as React.Ref<HTMLElement>}
        aria-label={label}
        className={clsx("flex items-center gap-padding-md", className)}
      >
        {showEndpoints &&
          renderControl("first", 1, firstLabel, <DoubleChevronLeft />, atStart)}
        {renderControl("prev", currentPage - 1, previousLabel, <ChevronLeft />, atStart)}
        {/* ページ番号群は矢印より狭い間隔（gap 4px）で並べる。 */}
        <div className="flex items-center gap-padding-2xs">
          {items.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className={ELLIPSIS_CLASS}
              >
                …
              </span>
            ) : (
              renderPageItem(item)
            ),
          )}
        </div>
        {renderControl("next", currentPage + 1, nextLabel, <ChevronRight />, atEnd)}
        {showEndpoints &&
          renderControl("last", count, lastLabel, <DoubleChevronRight />, atEnd)}
      </nav>
    );
  },
);

Pagination.displayName = "Pagination";
