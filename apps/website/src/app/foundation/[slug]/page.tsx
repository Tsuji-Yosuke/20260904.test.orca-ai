import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FOUNDATION_DOCS } from "@/lib/foundations";
import { loadFoundationMarkdown } from "@/lib/foundations.server";
import { renderMarkdownDocument } from "@/lib/markdown.server";
import { FoundationDocPage } from "@/views/foundation-doc-page";

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return FOUNDATION_DOCS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const doc = FOUNDATION_DOCS.find((entry) => entry.slug === slug);
  return { title: doc?.title, description: doc?.description };
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const markdown = loadFoundationMarkdown(slug);
  if (markdown === undefined) notFound();
  return <FoundationDocPage body={await renderMarkdownDocument(markdown)} />;
}
