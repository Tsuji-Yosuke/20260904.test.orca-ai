// Foundation 本文（design-language の foundations、SSOT）をファイルから読む。サーバ専用（fs を使う）。
import { FOUNDATION_DOCS } from "./foundations";
import { readRepoFile } from "./repo-files.server";

/** slug に対応する foundations の Markdown 全文。未定義の slug なら undefined。 */
export function loadFoundationMarkdown(slug: string): string | undefined {
  const doc = FOUNDATION_DOCS.find((entry) => entry.slug === slug);
  return doc ? readRepoFile(doc.file) : undefined;
}
