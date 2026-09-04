// mdast 断片（design-doc.ts が切り出したセクション本文）を React 要素へ変換する。
// サーバコンポーネントから同期的に使う。Markdown 全文の描画は markdown.server.tsx。
import type { ReactNode } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import clsx from "clsx";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Root as HastRoot } from "hast";
import type { Root, RootContent } from "mdast";

const bridge = unified().use(remarkRehype);

/** Markdown 全文の描画（markdown.server.tsx）にも同じ見た目を与えるための共有マッピング。 */
export const markdownComponents = {
  h1: (props: React.ComponentProps<"h1">) => (
    <h1 className="text-website-3xl font-website-semibold leading-website-tight" {...props} />
  ),
  h2: (props: React.ComponentProps<"h2">) => (
    <h2
      className="mt-[var(--spacing-10)] text-website-2xl font-website-semibold leading-website-tight"
      {...props}
    />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3
      className="mt-[var(--spacing-6)] text-website-xl font-website-semibold leading-website-tight"
      {...props}
    />
  ),
  // shiki が付ける className / style（背景色）を受け取りつつ、枠と余白はこちらで決める
  pre: ({ className, ...props }: React.ComponentProps<"pre">) => (
    <pre
      className={clsx(
        "overflow-x-auto rounded-md border-sm border-outline-dim bg-surface-container! p-[var(--spacing-6)] font-website-code text-website-sm leading-website-copy [&_code]:bg-transparent [&_code]:p-0",
        className,
      )}
      {...props}
    />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="leading-website-copy text-on-surface-dim" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul
      className="list-disc space-y-[var(--spacing-1-5)] pl-[var(--spacing-6)] leading-website-copy text-on-surface-dim"
      {...props}
    />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol
      className="list-decimal space-y-[var(--spacing-1-5)] pl-[var(--spacing-6)] leading-website-copy text-on-surface-dim"
      {...props}
    />
  ),
  li: (props: React.ComponentProps<"li">) => <li className="marker:text-on-surface-dim" {...props} />,
  h4: (props: React.ComponentProps<"h4">) => (
    <h4 className="text-website-lg font-website-semibold leading-website-tight" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a
      className="text-on-surface-dim underline underline-offset-[var(--sizing-2xs)] focus-visible:outline-none focus-visible:shadow-focus-outline"
      {...props}
    />
  ),
  code: (props: React.ComponentProps<"code">) => (
    <code
      className="rounded-xs bg-surface-container px-[var(--spacing-1)] py-[var(--spacing-0-5)] font-website-code text-website-sm"
      {...props}
    />
  ),
  table: (props: React.ComponentProps<"table">) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-website-sm leading-website-copy" {...props} />
    </div>
  ),
  th: (props: React.ComponentProps<"th">) => (
    <th
      className="border-b-sm border-outline bg-surface-container px-[var(--spacing-3)] py-[var(--spacing-2)] text-left"
      {...props}
    />
  ),
  td: (props: React.ComponentProps<"td">) => (
    <td
      className="border-b-sm border-outline-dim px-[var(--spacing-3)] py-[var(--spacing-2)] align-top"
      {...props}
    />
  ),
};

export function renderMarkdown(nodes: RootContent[]): ReactNode {
  const root: Root = { type: "root", children: nodes };
  const hast = bridge.runSync(root) as HastRoot;
  return toJsxRuntime(hast, { Fragment, jsx, jsxs, components: markdownComponents });
}
