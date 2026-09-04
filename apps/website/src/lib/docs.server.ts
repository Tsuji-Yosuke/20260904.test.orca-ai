// サイト自前コンテンツ（content/docs 配下の Markdown）。design-language の原典は
// ここに置かず、専用パーサ（src/lib/design-doc.ts）で直接描画する。サーバ専用（fs を使う）。
import matter from "gray-matter";
import { readWebsiteFile } from "./repo-files.server";

export interface Doc {
  title: string;
  description: string;
  /** frontmatter を除いた本文。 */
  markdown: string;
}

/** content/docs/<slug>.md を frontmatter と本文に分けて返す。 */
export function loadDoc(slug: string): Doc {
  const { data, content } = matter(readWebsiteFile(`content/docs/${slug}.md`));
  const { title, description } = data as { title: string; description: string };
  return { title, description, markdown: content };
}
