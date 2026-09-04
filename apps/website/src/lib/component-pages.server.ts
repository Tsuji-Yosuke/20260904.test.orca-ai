// component-meta と design-language 原典 frontmatter を join した、
// ドキュメントサイト向けのコンポーネントページ一覧。サーバ専用（fs を使う）。
import { UI_ITEMS } from "@orca/component-meta";
import { readRepoFile } from "./repo-files.server";

export interface ComponentPage {
  name: string;
  title: string;
  description: string;
  designDoc: string;
}

/** design-language 原典を持つコンポーネントの一覧（サイドバー・一覧ページ・ルーティングの源）。 */
export function componentPages(): ComponentPage[] {
  return UI_ITEMS.filter((item) => item.designDoc !== undefined).map((item) => {
    const designDoc = item.designDoc!;
    const markdown = readRepoFile(designDoc);
    const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim();
    if (!description) {
      throw new Error(`${designDoc}: frontmatter に description がありません`);
    }
    return { name: item.name, title: item.title, description, designDoc };
  });
}

export function componentPage(name: string): ComponentPage | undefined {
  return componentPages().find((page) => page.name === name);
}
