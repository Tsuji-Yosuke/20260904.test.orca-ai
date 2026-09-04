import type { ReactNode } from "react";
import { SectionIndex } from "@/components/section-index";

const paths = [
  {
    eyebrow: "START DESIGNING",
    title: "for Designer",
    description: "プロダクト設計で共通の判断基準を使うための導入ルートです。",
    steps: ["Figmaライブラリを導入する", "Foundationのルールを理解する", "コンポーネントを組み合わせて設計する"],
  },
  {
    eyebrow: "START DEVELOPING",
    title: "for Engineer",
    description: "OrcaのトークンとReactコンポーネントを実装へ接続する導入ルートです。",
    steps: ["パッケージを導入する", "デザイントークンをスタイルに接続する", "コンポーネントを実装・拡張する"],
  },
];

export function GetStartedPage({ body }: { body: ReactNode }) {
  return (
    <SectionIndex
      eyebrow="Get started"
      title="共通の基盤から、設計を始める。"
      description="デザイナーとエンジニアが同じ原典を使い、一貫した体験を組み立てるための入口です。"
    >
      <p className="max-w-[calc(var(--spacing-96)+var(--spacing-48))] leading-website-copy text-on-surface-dim">
        役割に応じた入口から全体像をつかみ、実際の導入手順へ進めます。
      </p>
      <div className="mt-[var(--spacing-8)] grid grid-cols-[minmax(0,1fr)] gap-[var(--spacing-4)] website-desktop:grid-cols-[repeat(auto-fit,minmax(var(--spacing-64),1fr))]">
        {paths.map((path) => (
          <article
            className="flex min-h-[var(--spacing-40)] flex-col rounded-md border-sm border-outline-dim bg-surface p-[var(--spacing-6)]"
            key={path.title}
          >
            <p className="font-website-code text-website-2xs font-website-medium leading-website-tight tracking-website-eyebrow text-on-surface">
              {path.eyebrow}
            </p>
            <h2 className="mt-[var(--spacing-3)] text-website-2xl font-website-semibold leading-website-tight">
              {path.title}
            </h2>
            <p className="mt-[var(--spacing-3)] leading-website-copy text-on-surface-dim">
              {path.description}
            </p>
            <ol className="mt-[var(--spacing-6)] flex flex-col gap-[var(--spacing-3)]">
              {path.steps.map((step, index) => (
                <li
                  className="flex gap-[var(--spacing-3)] leading-website-copy text-on-surface-dim"
                  key={step}
                >
                  <span className="shrink-0 font-website-code text-website-xs text-primary">0{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
      <div className="mt-[var(--spacing-16)] max-w-[calc(var(--spacing-96)+var(--spacing-48))] space-y-[var(--spacing-4)]">
        {body}
      </div>
    </SectionIndex>
  );
}
