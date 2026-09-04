import type { ReactNode } from "react";

/** Overview の表示セクション。id は ToC のアンカーと一致させる。 */
export function OverviewSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="mt-[var(--spacing-16)] scroll-mt-[calc(var(--website-header-height)+var(--website-mobile-section-height)+var(--spacing-16))] first:mt-0 website-desktop:scroll-mt-[calc(var(--website-header-height)+var(--spacing-14)+var(--spacing-5))]"
    >
      <h2 className="text-website-2xl font-website-semibold leading-website-tight">{title}</h2>
      <div className="mt-[var(--spacing-6)] space-y-[var(--spacing-4)]">{children}</div>
    </section>
  );
}

/** セクション内の下位見出し（原典の H3 セクション名を保持して表示する）。 */
export function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pt-[var(--spacing-4)] first:pt-0">
      <h3 className="text-website-xl font-website-semibold leading-website-tight">{title}</h3>
      <div className="mt-[var(--spacing-3)] space-y-[var(--spacing-3)]">{children}</div>
    </div>
  );
}
