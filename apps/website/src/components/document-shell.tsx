import type { ReactElement, ReactNode } from "react";

export function DocumentShell({
  title,
  description,
  wcag,
  version,
  updated,
  figmaUrl,
  storybookUrl,
  children,
}: {
  title: string;
  description: string;
  wcag?: string;
  version?: string;
  updated?: string;
  figmaUrl?: string;
  storybookUrl?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <article className="min-w-0">
      <header className="bg-website-hero px-[var(--spacing-8)] pt-[var(--spacing-16)] pb-[var(--spacing-16)] text-white website-desktop:px-[var(--spacing-16)] website-desktop:pt-[var(--spacing-18)]">
        <div className="flex flex-col items-start gap-[var(--spacing-8)] website-desktop:flex-row website-desktop:items-end website-desktop:justify-between">
          <div className="min-w-0">
            <h1 className="text-website-4xl font-website-semibold leading-website-solid tracking-website-number">
              {title}
            </h1>
            <p className="mt-[var(--spacing-8)] max-w-[calc(var(--spacing-96)+var(--spacing-80)-var(--spacing-1))] leading-website-body tracking-website-body">
              {description}
            </p>
            {wcag || (version && updated) ? (
              <p className="mt-[var(--spacing-4)] flex flex-wrap items-center gap-[var(--spacing-5)] text-website-md leading-website-body tracking-website-body text-gray-400">
                {wcag ? <span>{wcag}</span> : null}
                {version && updated ? (
                  <span className="inline-flex items-center gap-[var(--spacing-2)]">
                    <span className="size-[calc(var(--spacing-1)+var(--spacing-0-5))] rounded-full bg-primary" aria-hidden />
                    {version} — {updated} 更新
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          {figmaUrl || storybookUrl ? (
            <div className="flex shrink-0 flex-wrap gap-[var(--spacing-3)]">
              {figmaUrl ? (
                <a
                  className="inline-flex h-[var(--spacing-12)] items-center justify-center gap-[var(--spacing-2)] rounded-full border-sm border-white px-[var(--spacing-6)] py-[var(--spacing-2)] text-website-md font-website-semibold leading-website-solid text-white no-underline hover:bg-state-layers-light-opacity-16"
                  href={figmaUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Figma
                  <svg width="10" height="10" viewBox="0 0 9.93333 9.93333" fill="none" aria-hidden>
                    <path
                      d="M0.8 0.8H9.13333V9.13333M9.13333 0.8L0.8 9.13333"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              ) : null}
              {storybookUrl ? (
                <a
                  className="inline-flex h-[var(--spacing-12)] items-center justify-center gap-[var(--spacing-2)] rounded-full border-sm border-white px-[var(--spacing-6)] py-[var(--spacing-2)] text-website-md font-website-semibold leading-website-solid text-white no-underline hover:bg-state-layers-light-opacity-16"
                  href={storybookUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Storybook
                  <svg width="10" height="10" viewBox="0 0 9.93333 9.93333" fill="none" aria-hidden>
                    <path
                      d="M0.8 0.8H9.13333V9.13333M9.13333 0.8L0.8 9.13333"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      {children}
    </article>
  );
}
