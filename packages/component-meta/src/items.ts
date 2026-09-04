// コンポーネントカタログの手書きメタデータ。registry とドキュメントサイトが共有する。
// name はアイテム名（公開 API）。designDoc は design-language 原典（Chips ↔ chip の
// 命名差はここで明示的に対応づける）。files は配布するソース（リポジトリルート相対）。
// 依存関係はここに書かない — apps/registry の catalog が import 文から機械算出する。
// 説明文は designDoc がある場合は原典 frontmatter の description が正本
// （規約: packages/design-language/README.md）。designDoc の無いアイテムだけ
// description をここに書く。

export interface ItemMeta {
  name: string;
  title: string;
  /** designDoc の無いアイテム用。designDoc があるアイテムは原典 frontmatter を正とし、ここに書かない。 */
  description?: string;
  designDoc?: string;
  files: string[];
}

const ui = (name: string) => `packages/react/src/ui/${name}`;
const lib = (name: string) => `packages/react/src/lib/${name}`;
const doc = (name: string) => `packages/design-language/components/${name}/${name}.md`;

export const UI_ITEMS: ItemMeta[] = [
  {
    name: "avatar",
    title: "Avatar",
    designDoc: doc("Avatar"),
    files: [ui("avatar.tsx"), ui("avatar-unit.tsx")],
  },
  {
    name: "button",
    title: "Button",
    designDoc: doc("Button"),
    files: [ui("button.tsx")],
  },
  {
    name: "card",
    title: "Card",
    designDoc: doc("Card"),
    files: [ui("card.tsx")],
  },
  {
    name: "checkbox",
    title: "Checkbox",
    designDoc: doc("Checkbox"),
    files: [ui("checkbox.tsx")],
  },
  {
    name: "chip",
    title: "Chip",
    designDoc: doc("Chips"),
    files: [ui("chip.tsx")],
  },
  {
    name: "dialog",
    title: "Dialog",
    designDoc: doc("Dialog"),
    files: [ui("dialog.tsx")],
  },
  {
    name: "dropdown",
    title: "Dropdown",
    designDoc: doc("Dropdown"),
    files: [ui("dropdown.tsx")],
  },
  {
    name: "icon-button",
    title: "IconButton",
    designDoc: doc("IconButton"),
    files: [ui("icon-button.tsx")],
  },
  {
    name: "pagination",
    title: "Pagination",
    designDoc: doc("Pagination"),
    files: [ui("pagination.tsx"), ui("get-pagination-items.ts")],
  },
  {
    name: "search",
    title: "Search",
    designDoc: doc("Search"),
    files: [ui("search.tsx")],
  },
  {
    name: "select",
    title: "Select",
    designDoc: doc("Select"),
    files: [ui("select.tsx")],
  },
  {
    name: "sidebar",
    title: "Sidebar",
    designDoc: doc("Sidebar"),
    files: [ui("sidebar.tsx")],
  },
  {
    name: "table",
    title: "Table",
    designDoc: doc("Table"),
    files: [ui("table.tsx")],
  },
  {
    name: "tabs",
    title: "Tabs",
    designDoc: doc("Tabs"),
    files: [ui("tabs.tsx")],
  },
];

export const LIB_ITEMS: ItemMeta[] = [
  {
    name: "focus-ring",
    title: "Focus ring",
    description: "focus-visible 時のフォーカスリングを与える共通クラス定数。",
    files: [lib("focus-ring.ts")],
  },
  {
    name: "option-row",
    title: "Option row",
    description: "Select / Search が共有するオプション行の視覚プリミティブ。",
    files: [lib("option-row.tsx")],
  },
];
