import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildOverviewModel } from "@/lib/component-overview";
import { componentPage, componentPages } from "@/lib/component-pages.server";
import { loadDesignDoc } from "@/lib/design-doc.server";
import { loadUsageSource } from "@/lib/usage-demo.server";
import { ComponentOverviewPage } from "@/views/component-overview-page";

interface Params {
  params: Promise<{ name: string }>;
}

export function generateStaticParams() {
  return componentPages().map(({ name }) => ({ name }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = componentPage((await params).name);
  return { title: page?.title };
}

export default async function Page({ params }: Params) {
  const page = componentPage((await params).name);
  if (!page) notFound();
  const model = buildOverviewModel(page, loadDesignDoc(page.designDoc));
  return <ComponentOverviewPage model={model} usage={await loadUsageSource(page.name)} />;
}
