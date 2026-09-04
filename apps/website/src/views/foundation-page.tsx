import { Link } from "@/components/link";
import { SectionIndex } from "@/components/section-index";
import { FOUNDATION_DOCS } from "@/lib/foundations";

const foundations = [
  { id: "typography", title: "Typography", description: "和文・欧文の書体、タイプスケール、行間を定めます。このWebサイトの表示用タイポグラフィは、共有トークンと区別してサイト内に閉じています。" },
  { id: "color", title: "Color", description: "ブランドとUIの意味をカラートークンに接続します。このサイトもOrcaの色とfocus tokenを正本として使います。" },
  { id: "design-token", title: "Design Token", description: "色、余白、サイズ、状態をデザインと実装の双方から参照できる名前へ変換します。" },
  { id: "icons", title: "Icon", description: "操作と情報の意味を一貫して伝えるために、形状、サイズ、バリエーションを管理します。" },
];

export function FoundationPage() {
  return (
    <SectionIndex
      eyebrow="Foundation"
      title="体験の一貫性を支える、共通言語。"
      description="プロダクトを横断して再利用する、視覚とインタラクションの基礎ルールです。"
    >
      <p className="max-w-[calc(var(--spacing-96)+var(--spacing-48))] leading-website-copy text-on-surface-dim">
        Orcaのdesign-languageと生成トークンを原典として、デザインと実装の判断を接続します。
      </p>
      <div className="mt-[var(--spacing-8)] grid gap-[var(--spacing-12)]">
        {foundations.map((foundation) => (
          <section
            className="scroll-mt-[calc(var(--website-header-height)+var(--spacing-6))] border-t-sm border-outline-dim pt-[var(--spacing-8)] first:border-t-0 first:pt-0"
            id={foundation.id}
            key={foundation.id}
          >
            <h2 className="text-website-2xl font-website-semibold leading-website-tight">{foundation.title}</h2>
            <p className="mt-[var(--spacing-3)] max-w-[calc(var(--spacing-96)+var(--spacing-48))] leading-website-copy text-on-surface-dim">
              {foundation.description}
            </p>
          </section>
        ))}
      </div>
      <section className="mt-[var(--spacing-16)] border-t-sm border-outline-dim pt-[var(--spacing-8)]">
        <h2 className="text-website-2xl font-website-semibold leading-website-tight">
          Foundation documents
        </h2>
        <ul className="mt-[var(--spacing-6)] grid grid-cols-[minmax(0,1fr)] gap-[var(--spacing-4)] website-desktop:grid-cols-2">
          {FOUNDATION_DOCS.map(({ slug, title, description }) => (
            <li key={slug}>
              <Link
                href={`/foundation/${slug}`}
                className="flex h-full flex-col rounded-md border-sm border-outline-dim p-[var(--spacing-6)] no-underline transition-colors duration-150 hover:border-outline hover:bg-surface-container"
              >
                <strong className="text-website-xl font-website-semibold leading-website-tight">
                  {title}
                </strong>
                <span className="mt-[var(--spacing-3)] leading-website-copy text-on-surface-dim">
                  {description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SectionIndex>
  );
}
