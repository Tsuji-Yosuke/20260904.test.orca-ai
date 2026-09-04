"use client";

import { Link } from "@/components/link";
import { usePathname } from "@/lib/router";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { GLOBAL_NAVIGATION, navigationItemIsActive, navigationSection } from "@/lib/navigation";
import { NavigationIcon } from "./navigation-icon";

function pageLabel(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return undefined;
  const label = segments.at(-1)?.replaceAll("-", " ");
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : undefined;
}

export function SiteHeader(): ReactElement {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const section = navigationSection(pathname);
  const detail = pageLabel(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const breakpoint = getComputedStyle(document.documentElement)
      .getPropertyValue("--website-breakpoint-desktop")
      .trim();
    const media = window.matchMedia(`(width > ${breakpoint})`);
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", onDesktop);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", onDesktop);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-[100] flex h-[var(--website-header-height)] items-center border-b-sm border-outline-bright bg-surface">
        <Link
          className="flex shrink-0 items-center py-0 pr-[var(--spacing-6)] pl-[var(--spacing-5)] no-underline website-desktop:w-[calc(var(--website-rail-width)+var(--website-sidenav-width)+var(--border-width-sm))] website-desktop:pl-[calc(var(--spacing-4)+var(--spacing-0-5))]"
          href="/"
          aria-label="TOYOTA Primitives ホーム"
        >
          <img className="h-auto" src="/top-logo.svg" alt="" width="143" height="12" />
        </Link>
        {section && section.href !== "/" ? (
          <nav
            className="hidden min-w-0 items-center gap-[var(--spacing-2)] text-website-xs leading-website-tight whitespace-nowrap website-desktop:flex"
            aria-label="パンくずリスト"
          >
            <Link className="no-underline hover:text-primary" href={section.href}>
              {section.label}
            </Link>
            {detail ? (
              <>
                <span className="text-on-surface" aria-hidden>
                  /
                </span>
                <span aria-current="page">{detail}</span>
              </>
            ) : null}
          </nav>
        ) : null}
        <button
          ref={buttonRef}
          type="button"
          className="ml-auto mr-[var(--spacing-2)] flex size-[var(--spacing-10)] items-center justify-center rounded-full hover:bg-surface-container aria-expanded:bg-surface-container website-desktop:hidden"
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={open}
          aria-controls="mobile-drawer"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 5 19 19M19 5 5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </header>
      <nav
        id="mobile-drawer"
        className="fixed inset-x-0 top-[var(--website-header-height)] bottom-0 z-[105] animate-website-drawer-in overflow-y-auto bg-surface py-[var(--spacing-6)] website-desktop:hidden"
        hidden={!open}
        aria-label="グローバルナビゲーション"
      >
        <ul>
          {GLOBAL_NAVIGATION.map((item) => {
            const active = navigationItemIsActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "location" : undefined}
                  className={`flex items-center gap-[var(--spacing-4)] px-[var(--spacing-6)] py-[var(--spacing-4)] no-underline hover:bg-surface-container ${active ? "text-primary" : "text-on-surface-dim"}`}
                  onClick={() => setOpen(false)}
                >
                  <NavigationIcon name={item.icon} size={22} />
                  <span className="text-website-base font-website-medium leading-website-tight">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
