// design-language 原典（Guide/Spec 2 部構成、規約: packages/design-language/README.md）を
// 表示用の typed model に構造化するパーサ。純粋関数のみ（ファイル読みは design-doc.server.ts）。
import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Heading, PhrasingContent, RootContent } from "mdast";

export interface DesignDocFrontmatter {
  name: string;
  status: "draft" | "review" | "ready" | "deprecated";
  layer: string;
  description?: string;
  wcag?: { reviewed?: string };
  sources?: {
    figma?: string[];
    implementations?: string[];
    storybook?: string[];
  };
}

export interface DesignDocSection {
  title: string;
  nodes: RootContent[];
}

export interface DesignDoc {
  frontmatter: DesignDocFrontmatter;
  /** 規約で 1 つだけ許される、Guide 前の前提セクション（H2。例: Table）。 */
  preamble: DesignDocSection | null;
  guide: DesignDocSection[];
  spec: DesignDocSection[];
  /** Guide/Usage の **Use when** 配下（Do として表示する）。 */
  useWhen: RootContent[];
  /** Guide/Usage の **Do not use when** 配下（Don't として表示する）。 */
  doNotUseWhen: RootContent[];
}

const processor = unified().use(remarkParse).use(remarkGfm);

function headingText(node: Heading): string {
  return node.children
    .map((child) => ("value" in child ? child.value : ""))
    .join("")
    .trim();
}

/** 段落全体が **太字** だけのとき、その文言を返す（Use when / Do not use when の区切り検出）。 */
function boldOnlyParagraph(node: RootContent): string | null {
  if (node.type !== "paragraph" || node.children.length !== 1) return null;
  const only: PhrasingContent | undefined = node.children[0];
  if (!only || only.type !== "strong") return null;
  return only.children
    .map((child) => ("value" in child ? child.value : ""))
    .join("")
    .trim();
}

function splitUsage(nodes: RootContent[]): { useWhen: RootContent[]; doNotUseWhen: RootContent[] } {
  const useWhen: RootContent[] = [];
  const doNotUseWhen: RootContent[] = [];
  let current: RootContent[] | null = null;
  for (const node of nodes) {
    const marker = boldOnlyParagraph(node);
    if (marker === "Use when") {
      current = useWhen;
      continue;
    }
    if (marker === "Do not use when") {
      current = doNotUseWhen;
      continue;
    }
    current?.push(node);
  }
  return { useWhen, doNotUseWhen };
}

export function parseDesignDoc(markdown: string): DesignDoc {
  const { data, content } = matter(markdown);
  const frontmatter = data as DesignDocFrontmatter;
  const root = processor.parse(content);

  let part: "preamble" | "guide" | "spec" = "preamble";
  let preamble: DesignDocSection | null = null;
  const guide: DesignDocSection[] = [];
  const spec: DesignDocSection[] = [];
  let section: DesignDocSection | null = null;

  for (const node of root.children) {
    if (node.type === "heading" && node.depth === 1) continue;
    if (node.type === "heading" && node.depth === 2) {
      const title = headingText(node);
      if (title === "Guide") {
        part = "guide";
        section = null;
      } else if (title === "Spec") {
        part = "spec";
        section = null;
      } else {
        if (part !== "preamble" || preamble !== null) {
          throw new Error(`Guide/Spec 以外の H2 セクションが複数あるか位置が不正です: ${title}`);
        }
        section = { title, nodes: [] };
        preamble = section;
      }
      continue;
    }
    if (node.type === "heading" && node.depth === 3 && part !== "preamble") {
      section = { title: headingText(node), nodes: [] };
      (part === "guide" ? guide : spec).push(section);
      continue;
    }
    section?.nodes.push(node);
  }

  if (guide.length === 0 || spec.length === 0) {
    throw new Error("Guide / Spec の 2 部構成になっていません");
  }

  const usage = guide.find(({ title }) => title === "Usage");
  const { useWhen, doNotUseWhen } = splitUsage(usage?.nodes ?? []);

  return { frontmatter, preamble, guide, spec, useWhen, doNotUseWhen };
}

export function guideSection(doc: DesignDoc, title: string): DesignDocSection | undefined {
  return doc.guide.find((section) => section.title === title);
}
