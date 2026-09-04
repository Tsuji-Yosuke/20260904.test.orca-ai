"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";
import clsx from "clsx";
import { Menu } from "@base-ui/react/menu";
import { FOCUS_VISIBLE_RING } from "@/registry/orca/lib/focus-ring";
import {
  IconButton,
  type IconButtonShape,
  type IconButtonSize,
  type IconButtonVariant,
} from "@/registry/orca/ui/icon-button";

export interface DropdownProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: unknown) => void;
  modal?: boolean;
  children?: ReactNode;
}

const DropdownRoot = forwardRef<HTMLDivElement, DropdownProps>(function Dropdown(
  { open, defaultOpen, onOpenChange, modal, children },
  _ref,
) {
  return (
    <Menu.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange as never}
      modal={modal}
    >
      {children}
    </Menu.Root>
  );
});

DropdownRoot.displayName = "Dropdown";

const ICON_CLASS = "inline-flex shrink-0 items-center justify-center";

// Figma `_Dropdown/Menu`（node 10088:9565）実測。
export type DropdownTriggerSize = "sm" | "md" | "lg";

// Trigger は「アイコン（任意）+ 文字ラベル（必須）+ アイコン（任意）」の決まった形のボタンで、
// 任意の要素を差し込めるものではない（Dropdown.md Anatomy 禁止事項）。そのため `render` /
// `disabled`（Figma component set に無く Dropdown.md Open Questions で未確定）/
// `openOnHover` / `delay` / `closeDelay` / `handle` / `payload`（Figma に対応する状態や
// マルチトリガー構成が無い Base UI 固有 props）のような差し替え・逸脱を許す props は公開しない。
export interface DropdownTriggerProps
  extends Omit<
    ComponentProps<typeof Menu.Trigger>,
    | "children"
    | "render"
    | "disabled"
    | "openOnHover"
    | "delay"
    | "closeDelay"
    | "handle"
    | "payload"
  > {
  size?: DropdownTriggerSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Trigger の必須ラベル。アクセシブルネームの源。 */
  children: ReactNode;
}

const TRIGGER_BASE_CLASS = clsx(
  "inline-flex items-center rounded-md bg-surface text-on-surface",
  "gap-margin-lg px-padding-md py-margin-md",
  "whitespace-nowrap cursor-default select-none outline-none",
  "transition-[background-color,background-image,box-shadow] duration-150 ease-in-out",
  FOCUS_VISIBLE_RING,
  // Hover: 黒 8% レイヤー重畳。Expanded（メニュー展開中）と Active（押下中）のときは重ねない。
  "[&:hover:not([data-popup-open]):not([data-pressed])]:state-layer-8",
  // Active（押下中）: 黒 16% レイヤー重畳。Base UI Menu.Trigger の data-pressed で判別する。
  "data-[pressed]:state-layer-16",
);

// Expanded は Menu Surface と視覚的に連続する面として描画する（Dropdown.md Visual
// Semantics）。具体の差分は Open Questions のため、Enabled と同じ面のまま
// Hover/Active レイヤーだけを止める最小実装にしている。

const TRIGGER_SIZE_CLASS: Record<
  DropdownTriggerSize,
  { container: string; text: string; icon: string }
> = {
  sm: {
    container: "h-component-full-sm",
    text: "typography-standard-body-small",
    icon: "size-icon-sm",
  },
  md: {
    container: "h-component-full-md",
    text: "typography-standard-body-medium",
    icon: "size-icon-md",
  },
  lg: {
    container: "h-component-full-lg",
    text: "typography-standard-body-large",
    icon: "size-icon-lg",
  },
};

const DropdownTrigger = forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  function DropdownTrigger(
    { size = "md", leadingIcon, trailingIcon, children, className, ...rest },
    ref,
  ) {
    const sizes = TRIGGER_SIZE_CLASS[size];
    return (
      <Menu.Trigger
        ref={ref}
        data-size={size}
        className={clsx(TRIGGER_BASE_CLASS, sizes.container, className)}
        {...rest}
      >
        {leadingIcon && (
          <span className={clsx(ICON_CLASS, sizes.icon)} aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <span className={clsx("min-w-0 flex-1 truncate text-left", sizes.text)}>
          {children}
        </span>
        {trailingIcon && (
          <span className={clsx(ICON_CLASS, sizes.icon)} aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </Menu.Trigger>
    );
  },
);
DropdownTrigger.displayName = "Dropdown.Trigger";

// Figma `_Dropdown/Menu/MenuUnit`（node 10284:30563）実測。Menu Item を縦に並べるだけの
// 面。見出し・区切り線・入れ子メニューは持たない（Dropdown.md Anatomy 禁止事項）。
export interface DropdownMenuProps {
  children?: ReactNode;
}

const MENU_POPUP_CLASS = clsx(
  // メニューの幅は「トリガーと同じ幅以上、項目が収まる幅まで」。文字ラベルのトリガーでは
  // トリガーと同じ幅になり、IconTrigger（40px）では潰れずに項目の文字が読める幅まで広がる
  "w-max min-w-[var(--anchor-width)] max-h-[min(24rem,var(--available-height))] overflow-y-auto",
  "rounded-md border-sm border-outline-bright bg-surface",
  "outline-none",
);

const DropdownMenu = forwardRef<HTMLDivElement, DropdownMenuProps>(
  function DropdownMenu({ children }, ref) {
    return (
      <Menu.Portal>
        {/* トリガー直下 gap margin-md(4px)。幅はトリガー幅を下限に内容へ追従。 */}
        <Menu.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          className="z-50 outline-none"
        >
          <Menu.Popup ref={ref} className={MENU_POPUP_CLASS}>
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    );
  },
);
DropdownMenu.displayName = "Dropdown.Menu";

// Figma `_Dropdown/Menu/MenuItem`（node 7574:1729）実測。単一種類（leading/trailing icon
// 任意 + label 必須 + disabled 任意）のみ。チェックボックス/ラジオ/破壊的色/サブメニューは
// 持たない（Dropdown.md Anatomy 禁止事項）。実行すると常に閉じるため `closeOnClick` は
// 公開しない。
export interface DropdownItemProps
  extends Omit<
    ComponentProps<typeof Menu.Item>,
    "children" | "render" | "closeOnClick"
  > {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Menu Item の必須ラベル。 */
  children: ReactNode;
}

const ITEM_CLASS = clsx(
  "flex h-component-full-sm items-center gap-margin-lg px-padding-md rounded-md",
  "typography-tight-body-small text-on-surface",
  "cursor-default select-none outline-none",
  // Hover: 黒 8% レイヤー重畳（disabled には付けない）。
  "[&:hover:not([data-disabled])]:state-layer-8",
  // Active（実行瞬間の一時的な押下フィードバック）: 黒 16% レイヤー重畳。
  "[&:active:not([data-disabled])]:state-layer-16",
  // Focused（キーボードによるハイライト）: ポインタ非重畳時のみ focus リング。
  // 判別パターンは internal/option-row.tsx に準拠。ただし Menu Surface は
  // padding 無し + overflow-y-auto（Figma 実測）のため、外向きリングは縁で
  // 切られる。項目のリングだけ内向き（inset）にして全周を見せる。
  "[&[data-highlighted]:not(:hover)]:[box-shadow:inset_0_0_0_var(--border-width-md)_var(--color-outline-focus)]",
  // Disabled: 背景は変えず文字とアイコンの色のみ弱める。
  "data-[disabled]:text-on-disabled data-[disabled]:cursor-not-allowed",
);

const DropdownItem = forwardRef<HTMLDivElement, DropdownItemProps>(
  function DropdownItem(
    { leadingIcon, trailingIcon, children, className, ...rest },
    ref,
  ) {
    return (
      <Menu.Item ref={ref} className={clsx(ITEM_CLASS, className)} {...rest}>
        {leadingIcon && (
          <span className={clsx(ICON_CLASS, "size-icon-sm")} aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {trailingIcon && (
          <span className={clsx(ICON_CLASS, "size-icon-sm")} aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </Menu.Item>
    );
  },
);
DropdownItem.displayName = "Dropdown.Item";

// アイコンだけのボタン（IconButton）でメニューを開くためのトリガー。
// 一覧のカードや行の「…」メニューのように、文字ラベルを置く場所が無いところで使う。
// トリガーにできるのは Trigger とこの IconTrigger だけ。任意の要素を差し込める
// render プロップは今までどおり公開しない（Dropdown.md の禁止事項）。
export interface DropdownIconTriggerProps
  extends Omit<
    ComponentProps<typeof Menu.Trigger>,
    "children" | "render" | "openOnHover" | "delay" | "closeDelay" | "handle" | "payload"
  > {
  /** アクセシブルネーム。IconButton と同じく必須（可視ラベルが無いため）。 */
  label: string;
  /** 中央に配置する単一のアイコン。 */
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  shape?: IconButtonShape;
}

const DropdownIconTrigger = forwardRef<HTMLButtonElement, DropdownIconTriggerProps>(
  function DropdownIconTrigger({ label, icon, variant, size, shape, ...rest }, ref) {
    return (
      <Menu.Trigger
        ref={ref}
        {...rest}
        // aria-haspopup / aria-expanded / 開閉ハンドラは Menu.Trigger が
        // render 先の IconButton にマージする
        render={
          <IconButton label={label} icon={icon} variant={variant} size={size} shape={shape} />
        }
      />
    );
  },
);

DropdownIconTrigger.displayName = "Dropdown.IconTrigger";

export const Dropdown = Object.assign(DropdownRoot, {
  Trigger: DropdownTrigger,
  IconTrigger: DropdownIconTrigger,
  Menu: DropdownMenu,
  Item: DropdownItem,
});
