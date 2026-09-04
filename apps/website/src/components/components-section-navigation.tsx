import type { ReactElement } from "react";
import type { ComponentPage } from "@/lib/component-pages.server";
import { hasPlayground } from "@/playground/registry-names";
import { SectionNavigation } from "./section-navigation";

export function ComponentsSectionNavigation({
  pages,
}: {
  pages: Pick<ComponentPage, "name" | "title">[];
}): ReactElement {
  const items = pages.map(({ name, title }) => ({
    href: `/components/${name}`,
    label: title,
    children: [
      { href: `/components/${name}`, label: "Overview", kind: "tab" as const },
      { href: `/components/${name}#usage`, label: "Usage", kind: "anchor" as const },
      { href: `/components/${name}#anatomy`, label: "Anatomy", kind: "anchor" as const },
      { href: `/components/${name}#do-dont`, label: "Do / Don't", kind: "anchor" as const },
      { href: `/components/${name}#accessibility`, label: "Accessibility", kind: "anchor" as const },
      { href: `/components/${name}#changelog`, label: "Changelog", kind: "anchor" as const },
      ...(hasPlayground(name)
        ? [{ href: `/components/${name}/playground`, label: "Playground", kind: "tab" as const }]
        : []),
    ],
  }));

  return <SectionNavigation label="Components" items={items} visibleWhen="/components" />;
}
