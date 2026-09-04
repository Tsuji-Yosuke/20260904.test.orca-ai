// Usage セクションに表示するデモのソースコードとハイライト済み HTML。サーバ専用（fs と shiki を使う）。
import { USAGE_DEMOS } from "@/demos";
import { demoSource } from "./demo-source.server";
import { highlightTsx } from "./shiki.server";

export interface UsageSource {
  code: string;
  html: string;
}

/** デモ未整備のコンポーネントは undefined。 */
export async function loadUsageSource(name: string): Promise<UsageSource | undefined> {
  const demo = USAGE_DEMOS[name];
  if (!demo) return undefined;
  const code = demoSource(demo.file);
  return { code, html: await highlightTsx(code) };
}
