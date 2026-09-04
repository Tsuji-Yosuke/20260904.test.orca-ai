import type { Metadata } from "next";
import { FoundationPage } from "@/views/foundation-page";

export const metadata: Metadata = { title: "Foundation" };

export default function Page() {
  return <FoundationPage />;
}
