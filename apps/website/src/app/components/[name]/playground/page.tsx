import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { componentPage } from "@/lib/component-pages.server";
import { hasPlayground, PLAYGROUND_NAMES } from "@/playground/registry-names";
import { Playground } from "@/playground/playground";

interface Params {
  params: Promise<{ name: string }>;
}

export function generateStaticParams() {
  return PLAYGROUND_NAMES.map((name) => ({ name }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = componentPage((await params).name);
  return { title: page ? `${page.title} Playground` : undefined };
}

export default async function PlaygroundPage({ params }: Params) {
  const { name } = await params;
  if (!componentPage(name) || !hasPlayground(name)) notFound();
  return <Playground name={name} />;
}
