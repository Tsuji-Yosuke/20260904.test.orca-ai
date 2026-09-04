"use client";

import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { FOCUS_VISIBLE_RING } from "@/registry/orca/lib/focus-ring";

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  /** navigation ランドマークのアクセシブルネーム（必須）。 */
  "aria-label": string;
}

const SidebarRoot = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  { className, children, ...rest },
  ref,
) {
  return (
    <nav
      {...rest}
      ref={ref}
      className={clsx(
        "flex flex-col h-full w-64 shrink-0",
        // コンテナは surface-bright・境界線なし・px 24 / py 32（Figma node 2999:1955 実測）
        "bg-surface-bright px-padding-lg py-padding-xl",
        className,
      )}
    >
      {children}
    </nav>
  );
});

SidebarRoot.displayName = "Sidebar";

const SidebarTop = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function SidebarTop({ className, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        data-sidebar-slot="top"
        // padding はコンテナ側 (px-padding-lg / py-padding-xl) に統一（Figma node 2999:1955 実測）
        className={clsx("shrink-0", className)}
      />
    );
  },
);
SidebarTop.displayName = "Sidebar.Top";

const SidebarMain = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function SidebarMain({ className, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        data-sidebar-slot="main"
        // padding はコンテナ側に統一、Menu Items の gap は 0（Figma node 2999:1955 実測）。
        // overflow-y-auto は clip コンテキストを作り Item の focus リング（box-shadow）を
        // 左右で切ってしまうため付けない（溢れ時の挙動は Figma 仕様なし・Open Questions）。
        className={clsx("flex-1 flex flex-col", className)}
      />
    );
  },
);
SidebarMain.displayName = "Sidebar.Main";

const SidebarBottom = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function SidebarBottom({ className, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        data-sidebar-slot="bottom"
        // padding はコンテナ側に統一、区切り線は無し（Figma node 2999:1955 実測）
        className={clsx("shrink-0", className)}
      />
    );
  },
);
SidebarBottom.displayName = "Sidebar.Bottom";

type SidebarItemBaseProps = {
  /** ラベルの意味を補強する任意アイコン（装飾）。 */
  icon?: ReactNode;
  /**
   * 現在地。視覚は Figma の Current variant 待ち。aria-current と data-current の
   * みを提供する（ユーザー裁定 2026-07-14）。
   */
  current?: boolean;
  /** リンク先。指定すると <a>、未指定で <button>。 */
  href?: string;
  children?: ReactNode;
};

export type SidebarItemProps = SidebarItemBaseProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement> & ButtonHTMLAttributes<HTMLButtonElement>,
    keyof SidebarItemBaseProps
  >;

const ITEM_BASE = [
  "group/item flex items-center gap-margin-md w-full text-left shrink-0",
  // 高さ 40px 固定（min/max 同値, Figma node 2999:14066 実測）+ 角丸 4px
  "h-component-full-sm px-padding-md rounded-sm relative select-none",
  "typography-tight-body-medium-bold no-underline",
  "transition-[background-color,background-image,color] duration-150 ease-in-out",
  FOCUS_VISIBLE_RING,
].join(" ");

// ラベル色は --ui/onsurface #474747（Figma node 2999:1955 実測。on-surface-dim は濃すぎるため修正）
// current の視覚は無い（Figma に Current variant が無いため、Enabled と同じ見た目を使う）。
const ITEM_ENABLED = "text-on-surface hover:state-layer-8";

const SidebarItem = forwardRef<HTMLAnchorElement | HTMLButtonElement, SidebarItemProps>(
  function SidebarItem({ icon, current = false, href, className, children, ...rest }, ref) {
    const content = (
      <>
        {icon && (
          // アイコンスロットは 24px 四方（Figma node 2999:14066 の INSTANCE_SWAP 実測）
          <span
            className="shrink-0 inline-flex items-center justify-center size-icon-lg"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <span className="flex-1 min-w-0 truncate">{children}</span>
      </>
    );

    const classes = clsx(ITEM_BASE, ITEM_ENABLED, className);

    if (href) {
      return (
        <a
          {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          aria-current={current ? "page" : undefined}
          data-current={current || undefined}
          className={classes}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        aria-current={current ? "page" : undefined}
        data-current={current || undefined}
        className={classes}
      >
        {content}
      </button>
    );
  },
);
SidebarItem.displayName = "Sidebar.Item";

export const Sidebar = Object.assign(SidebarRoot, {
  Top: SidebarTop,
  Main: SidebarMain,
  Bottom: SidebarBottom,
  Item: SidebarItem,
});
