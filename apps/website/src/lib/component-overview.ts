// design-language 原典（DesignDoc）を Overview ページの表示単位に組み替える純粋関数。
// 戻り値は JSON 直列化できる（mdast 断片と文字列のみ）。
import type { RootContent } from "mdast";
import type { TocEntry } from "@/components/toc";
import type { ComponentPage } from "./component-pages.server";
import { guideSection, type DesignDoc, type DesignDocSection } from "./design-doc";

const GUIDELINE_SECTIONS = ["User Mental Model", "Content Model", "Layout And Density"];

const BUTTON_CHANGELOG = [
  {
    version: "v0.0.1",
    note: "Buttonコンポーネントを初回リリース。Type（Primary / Secondary / Ghost）、Size（Large / Medium / Small）、5つのState（Enabled / Hover / Active / Focused / Disabled）を定義しました。",
  },
  {
    version: "v0.0.1",
    note: "WCAG 2.2 AAのアクセシビリティレビューを完了。フォーカスリング（2px / オフセット2px）とDisabled状態のコントラストを調整しました。",
  },
];

export interface ChangelogEntry {
  version: string;
  note: string;
}

export interface OverviewModel {
  name: string;
  preamble: DesignDocSection | null;
  purpose: RootContent[];
  anatomy: RootContent[];
  accessibility: RootContent[];
  useWhen: RootContent[];
  doNotUseWhen: RootContent[];
  guidelines: DesignDocSection[];
  spec: DesignDocSection[];
  /** Changelog を持つコンポーネントだけ非 null（現状 button のみ）。 */
  changelog: ChangelogEntry[] | null;
  toc: TocEntry[];
}

export function buildOverviewModel(page: ComponentPage, doc: DesignDoc): OverviewModel {
  const changelog = page.name === "button" ? BUTTON_CHANGELOG : null;
  return {
    name: page.name,
    preamble: doc.preamble,
    purpose: guideSection(doc, "Purpose")?.nodes ?? [],
    anatomy: guideSection(doc, "Anatomy")?.nodes ?? [],
    accessibility: guideSection(doc, "Accessibility Notes")?.nodes ?? [],
    useWhen: doc.useWhen,
    doNotUseWhen: doc.doNotUseWhen,
    guidelines: doc.guide.filter(({ title }) => GUIDELINE_SECTIONS.includes(title)),
    spec: doc.spec,
    changelog,
    toc: [
      ...(doc.preamble ? [{ id: "preamble", title: doc.preamble.title }] : []),
      { id: "usage", title: "Usage" },
      { id: "anatomy", title: "Anatomy" },
      { id: "do-dont", title: "Do / Don't" },
      { id: "accessibility", title: "Accessibility" },
      ...(changelog ? [{ id: "changelog", title: "Changelog" }] : []),
    ],
  };
}
