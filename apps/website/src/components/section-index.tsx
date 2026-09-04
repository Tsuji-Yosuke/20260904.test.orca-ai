import type { ReactElement, ReactNode } from "react";

export function SectionIndex({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="min-w-0">
      <header className="bg-inverse-surface px-[var(--spacing-5)] py-[var(--spacing-16)] text-inverse-on-surface website-desktop:px-[var(--spacing-16)] website-desktop:py-[var(--spacing-20)]">
        <p className="font-website-code text-website-xs font-website-medium leading-website-tight tracking-website-eyebrow text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-[var(--spacing-4)] max-w-[calc(var(--spacing-96)+var(--spacing-48))] text-website-4xl font-website-semibold leading-website-tight">
          {title}
        </h1>
        <p className="mt-[var(--spacing-5)] max-w-[calc(var(--spacing-96)+var(--spacing-48))] text-website-lg leading-website-copy text-on-surface-bright">
          {description}
        </p>
      </header>
      <div className="px-[var(--spacing-5)] pt-[var(--spacing-12)] pb-[var(--spacing-20)] website-desktop:px-[var(--spacing-16)] website-desktop:pt-[var(--spacing-18)] website-desktop:pb-[var(--spacing-28)]">
        {children}
      </div>
    </div>
  );
}
