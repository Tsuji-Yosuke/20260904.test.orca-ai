import { notFound } from "next/navigation";
import { componentStorybookUrl } from "@/lib/component-links";
import { componentPage } from "@/lib/component-pages.server";
import { loadDesignDoc } from "@/lib/design-doc.server";
import { hasPlayground } from "@/playground/registry-names";
import { ComponentShell } from "@/views/component-shell";

export default async function ComponentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ name: string }>;
}) {
  const page = componentPage((await params).name);
  if (!page) notFound();
  const { frontmatter } = loadDesignDoc(page.designDoc);

  return (
    <ComponentShell
      page={page}
      figmaUrl={frontmatter.sources?.figma?.[0]}
      storybookUrl={componentStorybookUrl(page.name)}
      hasPlayground={hasPlayground(page.name)}
    >
      {children}
    </ComponentShell>
  );
}
