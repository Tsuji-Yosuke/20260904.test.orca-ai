"use client";

import {
  createContext,
  forwardRef,
  useContext,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { FOCUS_VISIBLE_RING } from "@/registry/orca/lib/focus-ring";

export type TabsSize = "small" | "medium" | "large";
export type TabsLayout = "spread" | "fit";

interface TabsStyleContextValue {
  size: TabsSize;
  layout: TabsLayout;
  disabled: boolean;
}

const TabsStyleContext = createContext<TabsStyleContextValue>({
  size: "medium",
  layout: "spread",
  disabled: false,
});

export interface TabsProps {
  /** 選択中の Tab value（controlled）。 */
  value?: string;
  /** 初期選択値（uncontrolled）。 */
  defaultValue?: string;
  /** 選択が変わったときに呼ばれる。 */
  onValueChange?: (value: string) => void;
  size?: TabsSize;
  layout?: TabsLayout;
  /** Tab List 全体を操作不可にする。 */
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    value,
    defaultValue,
    onValueChange,
    size = "medium",
    layout = "spread",
    disabled = false,
    className,
    children,
  },
  ref,
) {
  return (
    <TabsStyleContext.Provider value={{ size, layout, disabled }}>
      <BaseTabs.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => onValueChange?.(next as string)}
        className={clsx("flex flex-col", className)}
      >
        {children}
      </BaseTabs.Root>
    </TabsStyleContext.Provider>
  );
});

Tabs.displayName = "Tabs";

const LAYOUT_CLASS: Record<TabsLayout, string> = {
  spread: "flex w-full",
  // fit はタブの内容幅に収める。ルート（flex-col）の交差軸 stretch により
  // TabList が親の幅まで引き伸ばされ下線が伸びるため、self-start で止める（issue #50）。
  // ルート側に items-start を付けると TabPanel まで shrink-to-fit になるので、ここで打ち消す。
  fit: "inline-flex max-w-full overflow-x-auto self-start",
};

export interface TabListProps {
  "aria-label"?: string;
  className?: string;
  children?: ReactNode;
}

export const TabList = forwardRef<HTMLDivElement, TabListProps>(function TabList(
  { className, children, ...rest },
  ref,
) {
  const { layout } = useContext(TabsStyleContext);
  return (
    <BaseTabs.List
      {...rest}
      ref={ref}
      // 手動活性化（フォーカス移動では切り替えず Enter/Space/クリックで確定）
      activateOnFocus={false}
      data-layout={layout}
      className={clsx(
        LAYOUT_CLASS[layout],
        "items-stretch border-b-sm border-outline-dim",
        className,
      )}
    >
      {children}
    </BaseTabs.List>
  );
});

TabList.displayName = "TabList";

const SIZE_CLASS: Record<TabsSize, { padding: string; label: string; icon: string }> = {
  small: {
    padding: "px-padding-md py-padding-sm",
    // Figma 実データ（node 1161:3903）: 全 State で Bold
    label: "typography-tight-body-small-bold",
    icon: "size-icon-sm",
  },
  medium: {
    padding: "px-padding-lg py-padding-md",
    label: "typography-tight-body-medium-bold",
    icon: "size-icon-sm",
  },
  large: {
    padding: "px-padding-xl py-padding-lg",
    label: "typography-tight-body-large-bold",
    icon: "size-icon-md",
  },
};

export interface TabProps {
  /** この Tab を一意に識別する値。対応する TabPanel の value と一致させる。 */
  value: string;
  /** 任意の先頭アイコン（装飾）。 */
  icon?: ReactNode;
  /** 任意の末尾バッジ（件数・状態など補助情報）。 */
  badge?: ReactNode;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { value, icon, badge, disabled = false, className, children },
  ref,
) {
  const ctx = useContext(TabsStyleContext);
  const isDisabled = disabled || ctx.disabled;
  const sizes = SIZE_CLASS[ctx.size];

  return (
    <BaseTabs.Tab
      ref={ref}
      value={value}
      disabled={isDisabled}
      data-size={ctx.size}
      className={clsx(
        "inline-flex items-center justify-center gap-margin-sm shrink-0",
        // Tab 自身の下線を TabList の下線（border-b-sm = --sizing-border-sm）にぴったり重ねる。
        // 以前は `-mb-sm` としていたが、"sm" は margin スケールの実キー名（spacing-margin-sm =
        // --sizing-2xs = 2px）と一致せず Tailwind に無視され margin-bottom は 0px のままだった。
        // TabList の border-bottom-width と同じ --sizing-border-sm（1px）を直接参照して打ち消す。
        "-mb-[var(--sizing-border-sm)] border-b-sm whitespace-nowrap select-none",
        "transition-[color,border-color,background-image] duration-150 ease-in-out",
        FOCUS_VISIBLE_RING,
        // Base UI の Tabs.Tab は roving tabindex 維持のため無効時も native disabled を
        // 付けず aria-disabled + data-disabled で表現する。Tailwind の `disabled:`（:disabled
        // 疑似クラス）は発火しないため `data-[disabled]:` を使う。
        "data-[disabled]:cursor-not-allowed data-[disabled]:text-on-disabled data-[disabled]:border-on-disabled",
        // 非選択でも常に 1px の下線を表示し、文字色・太さは state 間で不変（強調は下線のみが担う）
        "border-outline text-on-surface hover:bg-surface-container",
        // 選択中は下線のみ 2px / primary 色に切り替え、文字色は変えない
        // Base UI の Tabs.Tab は選択中を data-selected ではなく data-active で表す
        "data-[active]:border-b-md data-[active]:border-primary",
        sizes.padding,
        sizes.label,
        ctx.layout === "spread" && "flex-1",
        className,
      )}
    >
      {icon && (
        <span
          className={clsx("shrink-0 inline-flex items-center justify-center", sizes.icon)}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span>{children}</span>
      {badge && <span className="shrink-0 inline-flex items-center">{badge}</span>}
    </BaseTabs.Tab>
  );
});

Tab.displayName = "Tab";

export interface TabPanelProps {
  /** 対応する Tab の value と一致させる。 */
  value: string;
  className?: string;
  children?: ReactNode;
}

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  function TabPanel({ value, className, children }, ref) {
    return (
      <BaseTabs.Panel
        ref={ref}
        value={value}
        keepMounted
        className={clsx("focus-visible:outline-none", className)}
      >
        {children}
      </BaseTabs.Panel>
    );
  },
);

TabPanel.displayName = "TabPanel";
