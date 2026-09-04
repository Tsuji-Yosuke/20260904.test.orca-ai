"use client";

import { Link } from "@/components/link";
import { usePathname } from "@/lib/router";
import type { ReactElement } from "react";
import { GLOBAL_NAVIGATION, navigationItemIsActive } from "@/lib/navigation";
import { NavigationIcon } from "./navigation-icon";

export function GlobalNav(): ReactElement {
  const pathname = usePathname();

  return (
    <nav
      className="hidden website-desktop:fixed website-desktop:top-[var(--website-header-height)] website-desktop:bottom-0 website-desktop:left-0 website-desktop:z-[60] website-desktop:flex website-desktop:w-[var(--website-rail-width)] website-desktop:shrink-0 website-desktop:flex-col website-desktop:overflow-hidden website-desktop:border-r-sm website-desktop:border-outline-bright website-desktop:bg-surface"
      aria-label="グローバルナビゲーション"
    >
      <ul className="flex flex-col items-center gap-[var(--spacing-4)] overflow-y-auto py-[var(--spacing-4)]">
        {GLOBAL_NAVIGATION.map((item) => {
          const active = navigationItemIsActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "location" : undefined}
                className={`group flex w-[var(--spacing-14)] flex-col items-center gap-[var(--spacing-1)] no-underline ${active ? "text-primary" : "text-on-surface-dim"}`}
              >
                <span
                  className={`flex h-[var(--spacing-9)] w-[calc(var(--spacing-12)+var(--spacing-0-5))] items-center justify-center rounded-lg transition-colors duration-150 ${active ? "bg-primary-container" : "group-hover:bg-surface-container"}`}
                >
                  <NavigationIcon name={item.icon} />
                </span>
                <span className="text-center text-website-2xs font-website-medium leading-website-tight tracking-website-compact whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
