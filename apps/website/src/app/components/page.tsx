import type { Metadata } from "next";
import { componentPages } from "@/lib/component-pages.server";
import { ComponentsIndexPage } from "@/views/components-page";

export const metadata: Metadata = { title: "Components" };

export default function Page() {
  return <ComponentsIndexPage pages={componentPages()} />;
}
