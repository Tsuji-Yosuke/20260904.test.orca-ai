import { Button } from "@orca/react";
import { Link } from "@/components/link";
import type { ReactElement } from "react";
import type { ComponentPage } from "@/lib/component-pages.server";

const HERO_ACTION_CLASS =
  "inline-flex h-[var(--spacing-12)] min-w-[calc(var(--spacing-48)+var(--spacing-1))] items-center justify-center rounded-full border-sm border-inverse-on-surface px-[var(--spacing-8)] py-[var(--spacing-2)] text-website-md font-website-semibold leading-website-tight no-underline transition-[background,opacity] duration-150";

const HOME_CARD_CLASS =
  "flex flex-col overflow-hidden rounded-md border-sm border-outline-bright text-on-surface-dim no-underline transition-colors duration-150 hover:border-tertiary";

const SECTION_HEADING_CLASS =
  "mt-[var(--spacing-16)] mb-[var(--spacing-6)] text-website-2xl font-website-medium leading-website-tight website-desktop:text-website-3xl";

const personas = [
  {
    eyebrow: "START DESIGNING",
    title: "for Designer",
    steps: ["Figmaライブラリを導入する", "Foundationのルールを理解する", "コンポーネントを組み合わせて設計する"],
  },
  {
    eyebrow: "START DEVELOPING",
    title: "for Engineer",
    steps: ["パッケージを導入する", "デザイントークンをスタイルに接続する", "コンポーネントを実装・拡張する"],
  },
];

const foundations = [
  { id: "typography", title: "Typography", description: "和文・欧文の書体、タイプスケール、行間のルール。", preview: "type" },
  { id: "color", title: "Color", description: "明度スケールと意味的トークン。Orcaのカラートークンを正本にします。", preview: "color" },
  { id: "design-token", title: "Design Token", description: "色・余白・タイポグラフィを、再利用できる形式で。", preview: "token" },
  { id: "icons", title: "Icon", description: "プロダクトを横断して使う、サイズと表現のルール。", preview: "icon" },
] as const;

const releases = [
  { date: "2026/07/11", badge: "New", note: "デザインシステムサイトを公開しました(v0.0.1)" },
  {
    date: "2026/07/11",
    badge: "Update",
    note: "Foundation / Color — 明度スケールとコントラストチェッカーを公開",
  },
  { date: "2024/12/31", badge: "Update", note: "Components / Button — WCAG 2.2 AAレビューを完了" },
] as const;

function SectionMoreLink({ href }: { href: string }): ReactElement {
  return (
    <Link
      className="inline-flex items-center gap-[var(--spacing-2)] pb-[calc(var(--spacing-1)+var(--spacing-0-5))] text-website-md font-website-medium leading-website-tight text-tertiary no-underline hover:text-primary website-desktop:text-gray-600"
      href={href}
    >
      すべて見る
      <span className="hidden website-desktop:inline" aria-hidden>
        ↗
      </span>
      <svg
        className="block website-desktop:hidden"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path
          d="M4 7.99938L12.0001 8M8.00176 12L12.0001 8L8.00176 4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

function FoundationPreview({ type }: { type: (typeof foundations)[number]["preview"] }): ReactElement {
  if (type === "type") {
    return (
      <span className="text-website-4xl font-website-semibold leading-website-tight">
        Aa <strong className="font-website-bold">あア</strong>
      </span>
    );
  }
  if (type === "color") {
    return (
      <span className="flex" aria-hidden>
        <span className="-ml-[var(--spacing-2)] size-[var(--spacing-9)] rounded-full border-sm border-outline-bright bg-primary first:ml-0" />
        <span className="-ml-[var(--spacing-2)] size-[var(--spacing-9)] rounded-full border-sm border-outline-bright bg-surface first:ml-0" />
        <span className="-ml-[var(--spacing-2)] size-[var(--spacing-9)] rounded-full border-sm border-outline-bright bg-outline first:ml-0" />
        <span className="-ml-[var(--spacing-2)] size-[var(--spacing-9)] rounded-full border-sm border-outline-bright bg-on-surface first:ml-0" />
        <span className="-ml-[var(--spacing-2)] size-[var(--spacing-9)] rounded-full border-sm border-outline-bright bg-inverse-surface first:ml-0" />
      </span>
    );
  }
  if (type === "token") {
    return (
      <code className="rounded-sm bg-gray-1000 px-[var(--spacing-3-5)] py-[var(--spacing-2)] font-website-code text-website-xs text-white">
        var(--color-primary)
      </code>
    );
  }
  return (
    <span className="flex gap-[var(--spacing-6)] text-tertiary" aria-hidden>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3C17.526 3 21 6.474 21 12C21 17.526 17.526 21 12 21C6.474 21 3 17.526 3 12C3 6.474 6.474 3 12 3Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M12 15C12.608 15 13 15.392 13 16C13 16.608 12.608 17 12 17C11.392 17 11 16.608 11 16C11 15.392 11.392 15 12 15Z"
          fill="currentColor"
        />
        <path d="M12 8.5L12 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M6 17C11.4673 17 12.5327 17 18 17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M5.99976 11.9991L18 12M12.0024 18L18 12L12.0024 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function HomePage({ components }: { components: ComponentPage[] }): ReactElement {
  return (
    <div className="min-w-0">
      <section className="relative flex min-h-[calc(100dvh-var(--website-header-height))] items-center justify-center overflow-hidden bg-black website-desktop:min-h-[var(--website-home-hero-height)] website-desktop:justify-start">
        <img
          className="pointer-events-none absolute inset-0 size-full object-cover object-[80%_50%] opacity-60 mix-blend-screen website-desktop:object-[50%_50%]"
          src="/hero-visual.png"
          alt=""
          aria-hidden
        />
        <div className="relative w-min px-[var(--spacing-8)] py-[var(--spacing-16)] website-desktop:w-auto website-desktop:py-[calc(var(--spacing-20)+var(--spacing-2))] website-desktop:pr-[var(--spacing-16)] website-desktop:pl-[calc(var(--spacing-32)+var(--spacing-2))]">
          <h1>
            <span className="sr-only">TOYOTA Primitives</span>
            <img
              className="h-auto w-[calc(var(--spacing-72)+var(--spacing-3))] max-w-none invert website-desktop:w-[calc(var(--spacing-96)+var(--spacing-14))]"
              src="/hero-logo.svg"
              alt=""
              aria-hidden
            />
          </h1>
          <p className="mt-[var(--spacing-7)] flex items-center justify-center gap-[var(--spacing-2)] text-website-md leading-website-tight text-on-surface-bright website-desktop:justify-start">
            <span className="size-[calc(var(--spacing-1)+var(--spacing-0-5))] rounded-full bg-primary" aria-hidden />
            v0.0.1 — 2026/07/11 更新
          </p>
          <div className="mt-[var(--spacing-12)] flex flex-col gap-[var(--spacing-3)] website-desktop:mt-[var(--spacing-18)] website-desktop:flex-row website-desktop:gap-[var(--spacing-7)]">
            <Link
              className={`${HERO_ACTION_CLASS} bg-inverse-on-surface text-black hover:opacity-85`}
              href="/get-started"
            >
              Get started
            </Link>
            <Link
              className={`${HERO_ACTION_CLASS} text-inverse-on-surface hover:bg-state-layers-light-opacity-16`}
              href="/components/button"
            >
              Browse components
            </Link>
          </div>
        </div>
      </section>

      <div className="px-[var(--spacing-8)] pt-[var(--spacing-8)] pb-[var(--spacing-6)] website-desktop:px-[var(--spacing-16)] website-desktop:pt-[var(--spacing-12)] website-desktop:pb-[var(--spacing-10)]">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--spacing-4)] website-desktop:grid-cols-2">
          {personas.map((persona) => (
            <Link
              className="block rounded-md border-sm border-outline-bright bg-surface-container px-[var(--spacing-9)] py-[var(--spacing-8)] text-on-surface-dim no-underline transition-colors duration-150 hover:border-tertiary website-desktop:bg-surface"
              href="/get-started"
              key={persona.title}
            >
              <span className="block text-website-2xs font-website-medium leading-website-tight tracking-website-eyebrow text-on-surface">
                {persona.eyebrow}
              </span>
              <span className="mt-[var(--spacing-2)] block text-website-2xl font-website-semibold leading-website-tight">
                {persona.title}
              </span>
              <ol className="mt-[var(--spacing-5)] flex flex-col gap-[var(--spacing-2-5)]">
                {persona.steps.map((step, index) => (
                  <li className="flex items-center gap-[var(--spacing-3)] leading-website-copy text-on-surface-dim" key={step}>
                    <span className="text-website-xs tracking-website-number text-on-surface">0{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </Link>
          ))}
        </div>

        <h2 className={SECTION_HEADING_CLASS}>Foundation</h2>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--spacing-4)] website-desktop:grid-cols-[repeat(auto-fit,minmax(var(--spacing-56),1fr))]">
          {foundations.map((item) => (
            <Link className={HOME_CARD_CLASS} href={`/foundation#${item.id}`} key={item.id}>
              <span className="flex h-[calc(var(--spacing-32)+var(--spacing-3))] items-center justify-center border-b-sm border-outline-bright bg-surface-container">
                <FoundationPreview type={item.preview} />
              </span>
              <span className="px-[var(--spacing-6)] pt-[var(--spacing-5)] text-website-lg font-website-semibold leading-website-tight">
                {item.title}
              </span>
              <span className="px-[var(--spacing-6)] pt-[calc(var(--spacing-1)+var(--spacing-0-5))] pb-[var(--spacing-6)] leading-website-body text-on-surface-dim">
                {item.description}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-[var(--spacing-16)] mb-[var(--spacing-6)] flex items-end justify-between">
          <h2 className="text-website-2xl font-website-medium leading-website-tight website-desktop:text-website-3xl">
            Components
          </h2>
          <SectionMoreLink href="/components/button" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--spacing-4)] website-desktop:grid-cols-[repeat(auto-fit,minmax(var(--spacing-56),1fr))]">
          {components.map((component) => (
            <article className={`relative ${HOME_CARD_CLASS}`} key={component.name}>
              <div
                className="pointer-events-none flex h-[var(--spacing-24)] items-center justify-center border-b-sm border-outline-bright bg-surface-container"
                aria-hidden
              >
                <Button className="font-website-base" tabIndex={-1}>
                  ラベル
                </Button>
              </div>
              <Link
                className="px-[var(--spacing-4)] py-[var(--spacing-3)] text-website-sm font-website-medium leading-website-tight no-underline after:absolute after:inset-0"
                href={`/components/${component.name}`}
              >
                {component.title}
              </Link>
            </article>
          ))}
        </div>

        <div
          id="changelog"
          className="mt-[var(--spacing-16)] mb-[var(--spacing-6)] flex items-end justify-between"
        >
          <h2 className="text-website-2xl font-website-medium leading-website-tight website-desktop:text-website-3xl">
            Changelog
          </h2>
          <SectionMoreLink href="#changelog" />
        </div>
        <ul className="overflow-hidden website-desktop:rounded-md website-desktop:border-sm website-desktop:border-outline-bright">
          {releases.map((release) => (
            <li
              className="flex flex-wrap gap-x-[var(--spacing-3)] gap-y-[var(--spacing-2)] border-b-sm border-outline-bright px-[var(--spacing-4)] py-[var(--spacing-4)] website-desktop:flex-nowrap website-desktop:items-center website-desktop:gap-[var(--spacing-4)] website-desktop:px-[var(--spacing-6)] website-desktop:last:border-b-0"
              key={`${release.date}-${release.note}`}
            >
              <span className="shrink-0 text-website-xs leading-website-tight tracking-website-body text-gray-600">
                {release.date}
              </span>
              <span
                className={`inline-flex min-w-[var(--spacing-14)] shrink-0 justify-center rounded-full px-[var(--spacing-2-5)] py-[var(--spacing-0-5)] text-website-2xs font-website-medium leading-[1.5] ${release.badge === "New" ? "bg-tertiary text-on-tertiary" : "bg-surface-container text-tertiary"}`}
              >
                {release.badge}
              </span>
              <p className="basis-full leading-website-copy tracking-website-body website-desktop:basis-auto">
                {release.note}
              </p>
            </li>
          ))}
        </ul>

        <h2 className={SECTION_HEADING_CLASS}>Resources</h2>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--spacing-4)] website-desktop:grid-cols-2">
          <a
            className="flex items-center gap-[var(--spacing-4)] rounded-md border-sm border-outline-bright px-[var(--spacing-6)] py-[var(--spacing-5)] text-on-surface-dim no-underline transition-colors duration-150 hover:border-tertiary"
            href="https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-"
            target="_blank"
            rel="noreferrer"
          >
            <span className="flex size-[var(--spacing-11)] shrink-0 items-center justify-center rounded-md bg-gray-1000 font-website-code text-website-xs font-website-semibold text-white">
              F
            </span>
            <span>
              <strong className="block text-website-lg font-website-semibold leading-website-tight">
                Figmaライブラリ
              </strong>
              <span className="mt-[var(--spacing-0-5)] block text-website-md leading-website-copy text-on-surface">
                デザインの起点
              </span>
            </span>
          </a>
          <a
            className="flex items-center gap-[var(--spacing-4)] rounded-md border-sm border-outline-bright px-[var(--spacing-6)] py-[var(--spacing-5)] text-on-surface-dim no-underline transition-colors duration-150 hover:border-tertiary"
            href="https://github.com/orca-ds/orca"
            target="_blank"
            rel="noreferrer"
          >
            <span className="flex size-[var(--spacing-11)] shrink-0 items-center justify-center rounded-md bg-gray-1000 font-website-code text-website-xs font-website-semibold text-white">
              &lt;/&gt;
            </span>
            <span>
              <strong className="block text-website-lg font-website-semibold leading-website-tight">GitHub</strong>
              <span className="mt-[var(--spacing-0-5)] block text-website-md leading-website-copy text-on-surface">
                実装コードとIssueトラッカー
              </span>
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
