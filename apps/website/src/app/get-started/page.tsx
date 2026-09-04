import type { Metadata } from "next";
import { loadDoc } from "@/lib/docs.server";
import { renderMarkdownDocument } from "@/lib/markdown.server";
import { GetStartedPage } from "@/views/get-started-page";

export function generateMetadata(): Metadata {
  const { title, description } = loadDoc("get-started");
  return { title, description };
}

export default async function Page() {
  return <GetStartedPage body={await renderMarkdownDocument(loadDoc("get-started").markdown)} />;
}
