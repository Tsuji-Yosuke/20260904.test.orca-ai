// Foundation ページの一覧。本文は design-language の foundations（SSOT）を直接描画する。
export interface FoundationDoc {
  slug: string;
  title: string;
  description: string;
  /** リポジトリルート相対パス。 */
  file: string;
}

export const FOUNDATION_DOCS: FoundationDoc[] = [
  {
    slug: "principles",
    title: "Principles",
    description: "orca デザイン言語の設計原則。すべてのコンポーネント文書の暗黙の前提。",
    file: "packages/design-language/foundations/principles.md",
  },
  {
    slug: "accessibility",
    title: "Accessibility",
    description: "全コンポーネント共通のアクセシビリティ要件。",
    file: "packages/design-language/foundations/accessibility.md",
  },
];
