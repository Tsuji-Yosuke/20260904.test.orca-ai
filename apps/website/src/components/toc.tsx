"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

export interface TocEntry {
  id: string;
  title: string;
}

/**
 * 表示中のセクション id を返す。viewport 上部（高さの 20% の位置）の基準線より上にある
 * 最後のセクションを選ぶ。どのセクションも基準線に達していなければ最初のセクションを選ぶ。
 */
function useActiveAnchor(ids: string[]): string | undefined {
  const [active, setActive] = useState<string>();
  useEffect(() => {
    const update = () => {
      const line = window.innerHeight * 0.2;
      let current = ids[0];
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ids]);
  return active;
}

export function Toc({ entries }: { entries: TocEntry[] }) {
  const ids = useMemo(() => entries.map(({ id }) => id), [entries]);
  const active = useActiveAnchor(ids);
  return (
    <nav
      aria-label="このページの目次"
      className="sticky top-[calc(var(--website-header-height)+var(--spacing-20))] rounded-md border-sm border-outline-bright bg-surface px-[var(--spacing-4)] py-[var(--spacing-6)]"
    >
      <ul className="space-y-[var(--spacing-2)]">
        {entries.map(({ id, title }) => (
          <li key={id}>
            <a
              data-active={active === id}
              href={`#${id}`}
              className={clsx(
                "flex items-center gap-[var(--spacing-1)] text-website-md leading-website-tight tracking-website-body no-underline",
                active === id
                  ? "font-website-semibold text-primary"
                  : "text-gray-600 hover:text-tertiary",
              )}
            >
              <svg className="shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M7.99938 4L8 12M12 8.002L8 12L4 8.002"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
