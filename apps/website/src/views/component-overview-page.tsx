import { AnatomyBlock } from "@/components/anatomy-block";
import { DoDontList } from "@/components/do-dont";
import { OverviewSection, SubSection } from "@/components/section";
import { Toc } from "@/components/toc";
import { UsageDemoBlock } from "@/components/usage-demo";
import type { OverviewModel } from "@/lib/component-overview";
import { renderMarkdown } from "@/lib/markdown";
import type { UsageSource } from "@/lib/usage-demo.server";

export function ComponentOverviewPage({ model, usage }: { model: OverviewModel; usage?: UsageSource }) {
  return (
    <div className="flex gap-[var(--spacing-12)] px-[var(--spacing-8)] py-[var(--spacing-12)] website-desktop:px-[var(--spacing-16)] website-desktop:py-[var(--spacing-18)]">
      <div className="min-w-0 flex-1">
        {model.preamble ? (
          <OverviewSection id="preamble" title={model.preamble.title}>
            {renderMarkdown(model.preamble.nodes)}
          </OverviewSection>
        ) : null}

        <OverviewSection id="usage" title="Usage">
          <UsageDemoBlock name={model.name} source={usage} />
          {renderMarkdown(model.purpose)}
        </OverviewSection>

        <OverviewSection id="anatomy" title="Anatomy">
          <AnatomyBlock name={model.name} />
          {renderMarkdown(model.anatomy)}
        </OverviewSection>

        <OverviewSection id="do-dont" title="Do / Don't">
          <DoDontList kind="do">{renderMarkdown(model.useWhen)}</DoDontList>
          <DoDontList kind="dont">{renderMarkdown(model.doNotUseWhen)}</DoDontList>
        </OverviewSection>

        <OverviewSection id="accessibility" title="Accessibility">
          {renderMarkdown(model.accessibility)}
          <p className="text-website-sm leading-website-copy text-on-surface-dim">
            共通要件は Foundations（packages/design-language/foundations/accessibility.md）を参照。
          </p>
        </OverviewSection>

        {model.changelog ? (
          <OverviewSection id="changelog" title="Changelog">
            <ul className="flex flex-col gap-[var(--spacing-6)]">
              {model.changelog.map(({ version, note }) => (
                <li
                  className="flex items-start gap-[var(--spacing-5)] border-b-sm border-outline-bright pb-[var(--spacing-6)] website-desktop:gap-[var(--spacing-10)]"
                  key={note}
                >
                  <span className="shrink-0 text-website-md font-website-medium leading-website-body tracking-website-body text-tertiary">
                    {version}
                  </span>
                  <p className="leading-website-body tracking-website-body">{note}</p>
                </li>
              ))}
            </ul>
          </OverviewSection>
        ) : null}

        <OverviewSection id="guidelines" title="Guidelines">
          {model.guidelines.map(({ title, nodes }) => (
            <SubSection key={title} title={title}>
              {renderMarkdown(nodes)}
            </SubSection>
          ))}
        </OverviewSection>

        <OverviewSection id="spec" title="Spec">
          <p className="text-website-sm leading-website-copy text-on-surface-dim">
            実装者向けの契約。プラットフォーム実装とテストはここを基準にする。
          </p>
          {model.spec.map(({ title, nodes }) => (
            <SubSection key={title} title={title}>
              {renderMarkdown(nodes)}
            </SubSection>
          ))}
        </OverviewSection>
      </div>
      <aside className="hidden w-[var(--spacing-44)] shrink-0 xl:block">
        <Toc entries={model.toc} />
      </aside>
    </div>
  );
}
