// frontmatter を持たないプレーン Markdown 全文（get-started、foundations など）を React 要素へ変換する。
// 見出しに id を付け、コードブロックを shiki でハイライトする。サーバ専用（highlighter を使う）。
import type { ReactNode } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Root as HastRoot } from "hast";
import { markdownComponents } from "./markdown";
import { getHighlighter, SHIKI_THEMES } from "./shiki.server";

export async function renderMarkdownDocument(markdown: string): Promise<ReactNode> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeShikiFromHighlighter, await getHighlighter(), {
      themes: SHIKI_THEMES,
      defaultColor: "light-dark()",
      fallbackLanguage: "text",
    });
  const hast = (await processor.run(processor.parse(markdown))) as HastRoot;
  return toJsxRuntime(hast, { Fragment, jsx, jsxs, components: markdownComponents });
}
