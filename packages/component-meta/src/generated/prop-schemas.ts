// このファイルは scripts/extract-props.ts による生成物。手編集しない。
// 再生成: pnpm --filter @orca/component-meta meta:extract
// CI は meta:check で packages/react とのドリフトを検出する。
import type { ComponentSchema } from "../extract/schema-types";

export const PROP_SCHEMAS = {
  "avatar": {
    "name": "avatar",
    "displayName": "Avatar",
    "props": [
      {
        "name": "src",
        "kind": "string",
        "required": false,
        "jsdoc": "主体の画像 URL。",
        "typeText": "string"
      },
      {
        "name": "name",
        "kind": "string",
        "required": false,
        "jsdoc": "主体の名前（アクセシブルネーム / イニシャル導出に使う）。",
        "typeText": "string"
      },
      {
        "name": "size",
        "kind": "enum",
        "options": [
          "sm",
          "md",
          "lg"
        ],
        "defaultValue": "md",
        "required": false,
        "typeText": "AvatarSize"
      },
      {
        "name": "fallback",
        "kind": "node",
        "required": false,
        "jsdoc": "画像が無い / 失敗時の代替。未指定なら name からイニシャルを表示。",
        "typeText": "ReactNode"
      },
      {
        "name": "decorative",
        "kind": "boolean",
        "defaultValue": false,
        "required": false,
        "jsdoc": "隣接ラベルで名前が提供済みなど、装飾として支援技術から隠す。",
        "typeText": "boolean"
      },
      {
        "name": "className",
        "kind": "string",
        "required": false,
        "typeText": "string"
      }
    ]
  },
  "button": {
    "name": "button",
    "displayName": "Button",
    "props": [
      {
        "name": "variant",
        "kind": "enum",
        "options": [
          "primary",
          "secondary",
          "ghost"
        ],
        "defaultValue": "primary",
        "required": false,
        "typeText": "ButtonVariant"
      },
      {
        "name": "size",
        "kind": "enum",
        "options": [
          "sm",
          "md",
          "lg"
        ],
        "defaultValue": "md",
        "required": false,
        "typeText": "ButtonSize"
      },
      {
        "name": "leadingIcon",
        "kind": "node",
        "required": false,
        "typeText": "ReactNode"
      },
      {
        "name": "trailingIcon",
        "kind": "node",
        "required": false,
        "typeText": "ReactNode"
      }
    ]
  },
  "card": {
    "name": "card",
    "displayName": "Card",
    "props": []
  },
  "checkbox": {
    "name": "checkbox",
    "displayName": "Checkbox",
    "props": [
      {
        "name": "size",
        "kind": "enum",
        "options": [
          "sm",
          "md",
          "lg"
        ],
        "defaultValue": "md",
        "required": false,
        "jsdoc": "密度。Figma の Size 軸（Small/Medium/Large）に対応。既定は md。",
        "typeText": "CheckboxSize"
      },
      {
        "name": "className",
        "kind": "string",
        "required": false,
        "jsdoc": "Base UI 由来の関数形 className（state 依存）は公開せず、文字列のみ受け付ける。",
        "typeText": "string"
      }
    ]
  },
  "chip": {
    "name": "chip",
    "displayName": "Chip",
    "props": [
      {
        "name": "mode",
        "kind": "enum",
        "options": [
          "static",
          "selectable",
          "removable"
        ],
        "defaultValue": "static",
        "required": false,
        "jsdoc": "用途モード。既定は static。",
        "typeText": "ChipMode"
      },
      {
        "name": "size",
        "kind": "enum",
        "options": [
          "sm",
          "md",
          "lg"
        ],
        "defaultValue": "md",
        "required": false,
        "typeText": "ChipSize"
      },
      {
        "name": "leadingIcon",
        "kind": "node",
        "required": false,
        "jsdoc": "Label の意味を補強する任意のアイコン（leading スロット）。",
        "typeText": "ReactNode"
      },
      {
        "name": "trailingIcon",
        "kind": "node",
        "required": false,
        "jsdoc": "任意の付随アイコン（trailing スロット）。removable では削除ボタンが trailing を占める。",
        "typeText": "ReactNode"
      },
      {
        "name": "disabled",
        "kind": "boolean",
        "defaultValue": false,
        "required": false,
        "jsdoc": "enabled / disabled。selectable では native disabled に写像。",
        "typeText": "boolean"
      },
      {
        "name": "selected",
        "kind": "boolean",
        "required": false,
        "jsdoc": "selectable: 選択状態（controlled）。",
        "typeText": "boolean"
      },
      {
        "name": "defaultSelected",
        "kind": "boolean",
        "required": false,
        "jsdoc": "selectable: uncontrolled の初期選択状態。",
        "typeText": "boolean"
      },
      {
        "name": "onSelectedChange",
        "kind": "other",
        "required": false,
        "jsdoc": "selectable: 選択がトグルしたときに次の値を渡す。",
        "typeText": "(selected: boolean) => void"
      },
      {
        "name": "onRemove",
        "kind": "other",
        "required": false,
        "jsdoc": "removable: 削除操作。",
        "typeText": "() => void"
      },
      {
        "name": "removeLabel",
        "kind": "string",
        "required": false,
        "jsdoc": "removable: 削除 button のアクセシブルネーム。未指定かつ children が文字列なら `${children} を削除`。",
        "typeText": "string"
      }
    ]
  },
  "dialog": {
    "name": "dialog",
    "displayName": "Dialog",
    "props": [
      {
        "name": "open",
        "kind": "boolean",
        "required": false,
        "typeText": "boolean"
      },
      {
        "name": "defaultOpen",
        "kind": "boolean",
        "required": false,
        "typeText": "boolean"
      },
      {
        "name": "onOpenChange",
        "kind": "other",
        "required": false,
        "typeText": "(open: boolean, eventDetails: unknown) => void"
      },
      {
        "name": "modal",
        "kind": "boolean",
        "defaultValue": true,
        "required": false,
        "jsdoc": "モーダル（既定 true）。",
        "typeText": "boolean"
      },
      {
        "name": "children",
        "kind": "node",
        "required": false,
        "typeText": "ReactNode"
      }
    ]
  },
  "dropdown": {
    "name": "dropdown",
    "displayName": "Dropdown",
    "props": [
      {
        "name": "open",
        "kind": "boolean",
        "required": false,
        "typeText": "boolean"
      },
      {
        "name": "defaultOpen",
        "kind": "boolean",
        "required": false,
        "typeText": "boolean"
      },
      {
        "name": "onOpenChange",
        "kind": "other",
        "required": false,
        "typeText": "(open: boolean, eventDetails: unknown) => void"
      },
      {
        "name": "modal",
        "kind": "boolean",
        "required": false,
        "typeText": "boolean"
      },
      {
        "name": "children",
        "kind": "node",
        "required": false,
        "typeText": "ReactNode"
      }
    ]
  },
  "icon-button": {
    "name": "icon-button",
    "displayName": "IconButton",
    "props": [
      {
        "name": "label",
        "kind": "string",
        "required": true,
        "jsdoc": "アクセシブルネーム。可視ラベルが無いため必須。",
        "typeText": "string"
      },
      {
        "name": "icon",
        "kind": "node",
        "required": true,
        "jsdoc": "中央に配置する単一のアイコン。",
        "typeText": "ReactNode"
      },
      {
        "name": "variant",
        "kind": "enum",
        "options": [
          "primary",
          "secondary",
          "ghost"
        ],
        "defaultValue": "primary",
        "required": false,
        "typeText": "IconButtonVariant"
      },
      {
        "name": "size",
        "kind": "enum",
        "options": [
          "sm",
          "md",
          "lg"
        ],
        "defaultValue": "md",
        "required": false,
        "typeText": "IconButtonSize"
      },
      {
        "name": "shape",
        "kind": "enum",
        "options": [
          "rounded",
          "circle"
        ],
        "defaultValue": "rounded",
        "required": false,
        "typeText": "IconButtonShape"
      }
    ]
  },
  "pagination": {
    "name": "pagination",
    "displayName": "Pagination",
    "props": [
      {
        "name": "count",
        "kind": "number",
        "required": true,
        "jsdoc": "総ページ数。1 以下のときは何も描画しない。",
        "typeText": "number"
      },
      {
        "name": "page",
        "kind": "number",
        "required": false,
        "jsdoc": "現在ページ（1 始まり、controlled）。",
        "typeText": "number"
      },
      {
        "name": "defaultPage",
        "kind": "number",
        "defaultValue": 1,
        "required": false,
        "jsdoc": "現在ページの初期値（uncontrolled）。既定 1。",
        "typeText": "number"
      },
      {
        "name": "onPageChange",
        "kind": "other",
        "required": false,
        "jsdoc": "ページ遷移時に次のページ番号を渡す。",
        "typeText": "(page: number) => void"
      },
      {
        "name": "siblingCount",
        "kind": "number",
        "defaultValue": 1,
        "required": false,
        "jsdoc": "現在ページの左右に表示する隣接ページ数。既定 1。",
        "typeText": "number"
      },
      {
        "name": "boundaryCount",
        "kind": "number",
        "defaultValue": 1,
        "required": false,
        "jsdoc": "両端に常に表示するページ数。既定 1。",
        "typeText": "number"
      },
      {
        "name": "showEndpoints",
        "kind": "boolean",
        "defaultValue": false,
        "required": false,
        "jsdoc": "First / Last コントロールを併設する。既定 false。",
        "typeText": "boolean"
      },
      {
        "name": "getHref",
        "kind": "other",
        "required": false,
        "jsdoc": "指定すると Page Item / 各コントロールをリンク（a 要素）として描画する。",
        "typeText": "(page: number) => string"
      },
      {
        "name": "label",
        "kind": "string",
        "defaultValue": "ページネーション",
        "required": false,
        "jsdoc": "nav のアクセシブルネーム。既定「ページネーション」。",
        "typeText": "string"
      },
      {
        "name": "pageLabel",
        "kind": "other",
        "required": false,
        "jsdoc": "Page Item のアクセシブルネーム生成。既定 `${page} ページ目`。",
        "typeText": "(page: number) => string"
      },
      {
        "name": "previousLabel",
        "kind": "string",
        "defaultValue": "前のページ",
        "required": false,
        "typeText": "string"
      },
      {
        "name": "nextLabel",
        "kind": "string",
        "defaultValue": "次のページ",
        "required": false,
        "typeText": "string"
      },
      {
        "name": "firstLabel",
        "kind": "string",
        "defaultValue": "最初のページ",
        "required": false,
        "typeText": "string"
      },
      {
        "name": "lastLabel",
        "kind": "string",
        "defaultValue": "最後のページ",
        "required": false,
        "typeText": "string"
      }
    ]
  },
  "search": {
    "name": "search",
    "displayName": "Search",
    "props": [
      {
        "name": "items",
        "kind": "other",
        "required": false,
        "jsdoc": "サジェスト候補。文字列配列。未指定ならサジェスト無しの検索入力。",
        "typeText": "readonly string[]"
      },
      {
        "name": "value",
        "kind": "string",
        "required": false,
        "jsdoc": "入力値（controlled）。",
        "typeText": "string"
      },
      {
        "name": "defaultValue",
        "kind": "string",
        "required": false,
        "jsdoc": "入力値の初期値（uncontrolled）。",
        "typeText": "string"
      },
      {
        "name": "onValueChange",
        "kind": "other",
        "required": false,
        "jsdoc": "入力値が変わるたびに呼ばれる（即時絞り込み）。",
        "typeText": "(value: string) => void"
      },
      {
        "name": "onSubmit",
        "kind": "other",
        "required": false,
        "jsdoc": "Enter 確定（サジェスト未ハイライト時）に現在値で呼ばれる。",
        "typeText": "(value: string) => void"
      },
      {
        "name": "onSelect",
        "kind": "other",
        "required": false,
        "jsdoc": "サジェスト項目を選んだときに呼ばれる。",
        "typeText": "(value: string) => void"
      },
      {
        "name": "placeholder",
        "kind": "string",
        "required": false,
        "typeText": "string"
      },
      {
        "name": "size",
        "kind": "enum",
        "options": [
          "small",
          "medium",
          "large"
        ],
        "defaultValue": "medium",
        "required": false,
        "typeText": "SearchSize"
      },
      {
        "name": "disabled",
        "kind": "boolean",
        "defaultValue": false,
        "required": false,
        "typeText": "boolean"
      },
      {
        "name": "error",
        "kind": "boolean",
        "defaultValue": false,
        "required": false,
        "jsdoc": "バリデーションエラー。輪郭と説明テキストで通知する。",
        "typeText": "boolean"
      },
      {
        "name": "errorMessage",
        "kind": "node",
        "required": false,
        "jsdoc": "error のときの説明テキスト。aria-describedby で結びつく。",
        "typeText": "ReactNode"
      },
      {
        "name": "loading",
        "kind": "boolean",
        "defaultValue": false,
        "required": false,
        "jsdoc": "非同期処理中。Trailing にスピナーを出し aria-busy を立てる。",
        "typeText": "boolean"
      },
      {
        "name": "trailingHint",
        "kind": "node",
        "required": false,
        "jsdoc": "Container 末尾のヒント（⌘K など）。loading 中は隠れる。",
        "typeText": "ReactNode"
      },
      {
        "name": "emptyMessage",
        "kind": "node",
        "defaultValue": "該当する候補がありません",
        "required": false,
        "jsdoc": "サジェストが0件のときの表示。",
        "typeText": "ReactNode"
      },
      {
        "name": "aria-label",
        "kind": "string",
        "required": false,
        "jsdoc": "入力のアクセシブルネーム（プレースホルダー単独に依存しない）。",
        "typeText": "string"
      },
      {
        "name": "clearLabel",
        "kind": "string",
        "defaultValue": "検索語をクリア",
        "required": false,
        "jsdoc": "Clear のアクセシブルネーム。既定「検索語をクリア」。",
        "typeText": "string"
      },
      {
        "name": "className",
        "kind": "string",
        "required": false,
        "typeText": "string"
      }
    ]
  },
  "select": {
    "name": "select",
    "displayName": "Select",
    "props": [
      {
        "name": "items",
        "kind": "other",
        "required": true,
        "typeText": "readonly SelectOption[]"
      },
      {
        "name": "value",
        "kind": "string",
        "required": false,
        "jsdoc": "選択値（controlled）。単一選択のみ。",
        "typeText": "string | null"
      },
      {
        "name": "defaultValue",
        "kind": "string",
        "required": false,
        "jsdoc": "初期選択値（uncontrolled）。",
        "typeText": "string | null"
      },
      {
        "name": "onValueChange",
        "kind": "other",
        "required": false,
        "typeText": "(value: string | null) => void"
      },
      {
        "name": "placeholder",
        "kind": "string",
        "defaultValue": "選択してください",
        "required": false,
        "typeText": "string"
      },
      {
        "name": "size",
        "kind": "enum",
        "options": [
          "small",
          "medium",
          "large"
        ],
        "defaultValue": "medium",
        "required": false,
        "typeText": "SelectSize"
      },
      {
        "name": "disabled",
        "kind": "boolean",
        "defaultValue": false,
        "required": false,
        "typeText": "boolean"
      },
      {
        "name": "readOnly",
        "kind": "boolean",
        "defaultValue": false,
        "required": false,
        "jsdoc": "読み取り専用（値は読めるが操作不可）。",
        "typeText": "boolean"
      },
      {
        "name": "required",
        "kind": "boolean",
        "defaultValue": false,
        "required": false,
        "typeText": "boolean"
      },
      {
        "name": "name",
        "kind": "string",
        "required": false,
        "typeText": "string"
      },
      {
        "name": "error",
        "kind": "boolean",
        "defaultValue": false,
        "required": false,
        "jsdoc": "バリデーションエラー。下線・背景と Error Text 行で通知。",
        "typeText": "boolean"
      },
      {
        "name": "errorMessage",
        "kind": "node",
        "required": false,
        "typeText": "ReactNode"
      },
      {
        "name": "leadingIcon",
        "kind": "node",
        "required": false,
        "jsdoc": "Trigger 先頭の装飾アイコン（Select.md Anatomy の Leading Icon）。アクセシブルネームに寄与しない。",
        "typeText": "ReactNode"
      },
      {
        "name": "aria-label",
        "kind": "string",
        "required": false,
        "jsdoc": "Trigger のアクセシブルネーム（プレースホルダー単独に依存しない）。",
        "typeText": "string"
      },
      {
        "name": "className",
        "kind": "string",
        "required": false,
        "typeText": "string"
      }
    ]
  },
  "sidebar": {
    "name": "sidebar",
    "displayName": "Sidebar",
    "props": [
      {
        "name": "aria-label",
        "kind": "string",
        "required": true,
        "jsdoc": "navigation ランドマークのアクセシブルネーム（必須）。",
        "typeText": "string"
      }
    ]
  },
  "table": {
    "name": "table",
    "displayName": "Table",
    "props": [
      {
        "name": "size",
        "kind": "enum",
        "options": [
          "sm",
          "md",
          "lg"
        ],
        "defaultValue": "md",
        "required": false,
        "jsdoc": "行高（40/48/56px）を決める size。Header Cell / Body Cell 共通。既定は md。",
        "typeText": "TableSize"
      }
    ]
  },
  "tabs": {
    "name": "tabs",
    "displayName": "Tabs",
    "props": [
      {
        "name": "value",
        "kind": "string",
        "required": false,
        "jsdoc": "選択中の Tab value（controlled）。",
        "typeText": "string"
      },
      {
        "name": "defaultValue",
        "kind": "string",
        "required": false,
        "jsdoc": "初期選択値（uncontrolled）。",
        "typeText": "string"
      },
      {
        "name": "onValueChange",
        "kind": "other",
        "required": false,
        "jsdoc": "選択が変わったときに呼ばれる。",
        "typeText": "(value: string) => void"
      },
      {
        "name": "size",
        "kind": "enum",
        "options": [
          "small",
          "medium",
          "large"
        ],
        "defaultValue": "medium",
        "required": false,
        "typeText": "TabsSize"
      },
      {
        "name": "layout",
        "kind": "enum",
        "options": [
          "spread",
          "fit"
        ],
        "defaultValue": "spread",
        "required": false,
        "typeText": "TabsLayout"
      },
      {
        "name": "disabled",
        "kind": "boolean",
        "defaultValue": false,
        "required": false,
        "jsdoc": "Tab List 全体を操作不可にする。",
        "typeText": "boolean"
      },
      {
        "name": "className",
        "kind": "string",
        "required": false,
        "typeText": "string"
      },
      {
        "name": "children",
        "kind": "node",
        "required": false,
        "typeText": "ReactNode"
      }
    ]
  },
} as const satisfies Record<string, ComponentSchema>;
