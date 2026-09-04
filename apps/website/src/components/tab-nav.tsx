"use client";

import { Link } from "@/components/link";
import { usePathname } from "@/lib/router";
import clsx from "clsx";

export interface TabItem {
  href: string;
  label: string;
  /** false のときリンクにせず「準備中」として表示する。 */
  available: boolean;
}

/** Overview / Playground の全幅タブ切替（Figma 案の見た目）。 */
export function TabNav({ items }: { items: TabItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="コンポーネント表示"
      className="sticky top-[calc(var(--website-header-height)+var(--website-mobile-section-height))] z-[70] flex border-t-sm border-gray-800 bg-website-hero website-desktop:top-[var(--website-header-height)] website-desktop:z-[80]"
    >
      {items.map(({ href, label, available }) => {
        const active = pathname === href;
        const base =
          "flex flex-1 items-center justify-center px-[var(--spacing-2)] py-[var(--spacing-4)] text-website-base font-website-bold leading-website-copy text-white no-underline";
        if (!available) {
          return (
            <span key={href} className={clsx(base, "text-gray-400")}>
              {label}
            </span>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              base,
              active
                ? "bg-website-hero-tab-active shadow-[inset_0_var(--border-width-md)_0_var(--color-white)]"
                : "hover:bg-state-layers-light-opacity-8",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
