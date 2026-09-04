"use client";

import clsx from "clsx";
import { Link } from "@/components/link";
import { usePathname } from "@/lib/router";
import { useEffect, useRef, useState, type ReactElement } from "react";

export interface SectionNavigationItem {
  href: string;
  label: string;
  children?: Array<{
    href: string;
    label: string;
    kind: "tab" | "anchor";
  }>;
}

function itemIsActive(pathname: string, href: string): boolean {
  if (href === "/components") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SectionNavigation({
  label,
  items,
  visibleWhen,
}: {
  label: string;
  items: SectionNavigationItem[];
  visibleWhen?: string;
}): ReactElement {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const current = items.find((item) => itemIsActive(pathname, item.href));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!current || pathname !== current.href) {
      setActiveAnchor(null);
      return;
    }

    const ids = current.children
      ?.filter((child) => child.kind === "anchor")
      .map((child) => child.href.split("#")[1])
      .filter((id): id is string => Boolean(id));
    const firstId = ids?.[0];
    if (!firstId) return;

    const updateActiveAnchor = () => {
      let next = firstId;
      for (const id of ids) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= 160) next = id;
      }
      setActiveAnchor(next);
    };

    updateActiveAnchor();
    document.addEventListener("scroll", updateActiveAnchor, { passive: true });
    window.addEventListener("resize", updateActiveAnchor);
    return () => {
      document.removeEventListener("scroll", updateActiveAnchor);
      window.removeEventListener("resize", updateActiveAnchor);
    };
  }, [current, pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (visibleWhen && !pathname.startsWith(visibleWhen)) return <></>;

  return (
    <>
      <div
        ref={wrapRef}
        className="sticky top-[var(--website-header-height)] z-[80] block border-b-sm border-outline-bright bg-surface-container website-desktop:hidden"
      >
        <button
          ref={toggleRef}
          type="button"
          className="flex h-[var(--spacing-11)] w-full items-center gap-[var(--spacing-2)] px-[var(--spacing-5)] text-left"
          aria-expanded={open}
          aria-controls="mobile-section-panel"
          onClick={() => setOpen((currentOpen) => !currentOpen)}
        >
          <span className="flex min-w-0 flex-1 items-center gap-[var(--spacing-2)] text-website-md leading-website-tight">
            <span className="shrink-0 text-on-surface">{label}</span>
            {current ? (
              <>
                <span aria-hidden>/</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap font-website-semibold text-on-surface-dim">
                  {current.label}
                </span>
              </>
            ) : null}
          </span>
          <svg
            className={clsx("shrink-0 transition-transform duration-150", open && "rotate-180")}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
        <div
          id="mobile-section-panel"
          className="absolute inset-x-0 top-full max-h-[min(65dvh,calc(var(--spacing-96)+var(--spacing-32)+var(--spacing-3)))] overflow-y-auto border-b-sm border-outline-bright bg-surface shadow-level-3"
          hidden={!open}
        >
          <ul className="py-[var(--spacing-2)]">
            {items.map((item) => {
              const active = itemIsActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "block px-[var(--spacing-5)] py-[calc(var(--spacing-2)+var(--spacing-0-5))] text-website-base no-underline hover:bg-surface-container",
                      active ? "font-website-semibold text-primary" : "text-tertiary",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <nav
        className="hidden website-desktop:sticky website-desktop:top-[var(--website-header-height)] website-desktop:block website-desktop:h-[calc(100dvh-var(--website-header-height))] website-desktop:w-[var(--website-sidenav-width)] website-desktop:shrink-0 website-desktop:overflow-y-auto website-desktop:border-r-sm website-desktop:border-outline-bright website-desktop:bg-surface-container website-desktop:pt-[var(--spacing-4)] website-desktop:pb-[var(--spacing-8)]"
        aria-label={`${label}内ナビゲーション`}
      >
        <p className="flex h-[var(--spacing-10)] items-center px-[var(--spacing-4)] text-website-md font-website-medium leading-website-tight text-on-surface">
          {label}
        </p>
        <ul className="mt-[var(--spacing-2)] flex flex-col gap-[var(--spacing-4)]">
          {items.map((item) => {
            const active = itemIsActive(pathname, item.href);
            return (
              <li key={item.href}>
                {active ? (
                  <div className="flex flex-col gap-[var(--spacing-4)] border-y-sm border-outline-bright bg-surface py-[var(--spacing-4)]">
                    <Link
                      href={item.href}
                      aria-current="page"
                      className="px-[var(--spacing-6)] text-website-lg font-website-semibold leading-website-tight text-primary no-underline"
                    >
                      {item.label}
                    </Link>
                    {item.children ? (
                      <ul className="flex flex-col gap-[var(--spacing-2)]">
                        {item.children
                          .filter((child) => child.kind !== "anchor" || pathname === item.href)
                          .map((child) => {
                            const currentTab = pathname === child.href;
                            const anchorId = child.kind === "anchor" ? child.href.split("#")[1] : null;
                            const currentAnchor = anchorId !== null && anchorId === activeAnchor;
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={clsx(
                                    "block px-[var(--spacing-6)] text-website-md leading-website-tight tracking-website-body no-underline",
                                    child.kind === "tab"
                                      ? clsx("font-website-medium text-tertiary hover:text-primary", currentTab && "font-website-semibold")
                                      : clsx(
                                          "text-gray-600 hover:text-tertiary",
                                          currentAnchor && "font-website-semibold text-primary",
                                        ),
                                  )}
                                >
                                  {child.kind === "anchor" ? "↓ " : null}
                                  {child.label}
                                </Link>
                              </li>
                            );
                          })}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className="block px-[var(--spacing-6)] text-website-base leading-website-tight text-tertiary no-underline hover:text-primary"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
