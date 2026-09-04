import type { ReactNode } from "react";

/** ドット地のデモキャンバス（Figma 案の見た目）。 */
export function DemoCanvas({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[var(--spacing-64)] items-center justify-center rounded-t-md border-sm border-b-0 border-outline-dim bg-[radial-gradient(var(--color-outline-dim)_1px,transparent_1px)] [background-size:16px_16px] p-padding-2xl">
      {children}
    </div>
  );
}
