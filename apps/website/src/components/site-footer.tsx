import type { ReactElement } from "react";

export function SiteFooter(): ReactElement {
  return (
    <footer className="overflow-hidden bg-surface pt-[var(--spacing-16)] website-desktop:pt-[calc(var(--spacing-24)+var(--spacing-6))]">
      <p className="sr-only">TOYOTA Primitives</p>
      <img className="hidden h-auto w-full website-desktop:block" src="/footer-logo.svg" alt="" aria-hidden />
      <p
        className="flex items-center justify-center gap-[var(--spacing-2-5)] px-[var(--spacing-5)] pb-[var(--spacing-6)] text-website-4xl leading-website-solid website-desktop:hidden"
        aria-hidden
      >
        <span className="font-website-bold">TOYOTA</span>
        <span>Primitives</span>
      </p>
    </footer>
  );
}
