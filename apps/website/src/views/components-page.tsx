import type { ReactElement } from "react";
import { Link } from "@/components/link";
import { SectionIndex } from "@/components/section-index";
import type { ComponentPage } from "@/lib/component-pages.server";

export function ComponentsIndexPage({ pages }: { pages: ComponentPage[] }): ReactElement {
  return (
    <SectionIndex
      eyebrow="Components"
      title="プロダクトを組み立てる、再利用可能な部品。"
      description="Orcaのdesign-languageを原典に、意味、状態、アクセシビリティをReact実装へ接続します。"
    >
      <p className="max-w-[calc(var(--spacing-96)+var(--spacing-48))] leading-website-copy text-on-surface-dim">
        コンポーネントを選ぶと、概要と参照しているデザイン原典を確認できます。
      </p>
      <ul className="mt-[var(--spacing-8)] grid grid-cols-[minmax(0,1fr)] gap-[var(--spacing-4)] website-desktop:grid-cols-[repeat(auto-fit,minmax(var(--spacing-64),1fr))]">
        {pages.map(({ name, title, description, designDoc }) => (
          <li key={name}>
            <Link
              className="flex min-h-[var(--spacing-40)] flex-col rounded-md border-sm border-outline-dim bg-surface p-[var(--spacing-6)] text-on-surface-dim no-underline transition-[background,border-color] duration-150 hover:border-outline hover:bg-surface-container"
              href={`/components/${name}`}
            >
              <span className="font-website-code text-website-2xs font-website-medium leading-website-tight tracking-website-eyebrow text-on-surface">
                COMPONENT
              </span>
              <strong className="mt-[var(--spacing-3)] text-website-xl font-website-semibold leading-website-tight">
                {title}
              </strong>
              <span className="mt-[var(--spacing-3)] leading-website-copy text-on-surface-dim">{description}</span>
              <span className="mt-auto block pt-[var(--spacing-6)] font-website-code text-website-xs leading-website-tight text-on-surface">
                {designDoc}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SectionIndex>
  );
}
