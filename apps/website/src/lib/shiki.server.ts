// サーバ側で使う shiki highlighter のシングルトン。
import "server-only";

import { createHighlighter, type Highlighter } from "shiki";

export const SHIKI_THEMES = { light: "github-light", dark: "github-dark" } as const;

let promise: Promise<Highlighter> | undefined;

/** サイト内のコードブロックで使う言語をまとめて読み込んだ highlighter。 */
export function getHighlighter(): Promise<Highlighter> {
  promise ??= createHighlighter({
    themes: Object.values(SHIKI_THEMES),
    langs: ["tsx", "bash", "json", "css"],
  });
  return promise;
}

export async function highlightTsx(code: string): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code.trimEnd(), {
    lang: "tsx",
    themes: SHIKI_THEMES,
    defaultColor: "light-dark()",
  });
}
