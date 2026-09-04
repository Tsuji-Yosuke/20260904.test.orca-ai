import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";
import tailwind from "@terrazzo/plugin-tailwind";
import {
  mergeExtendedCollections,
  normalizeStyleFiles,
  resetTokenBuildDirectory,
  tailwindThemeVariableName
} from "./scripts/preprocess-tokens.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Extended Collection の前処理
//
// プラグインは Extended Collection（例: red）を親（例: core）と別ファイルで出力する。
// Terrazzo に渡す前に、Extended Collection のトークンを親のトークンに
// 追加モード（例: red-light, red-dark）としてマージする。
// ---------------------------------------------------------------------------

const TMP_DIR = resolve(__dirname, ".tmp-tokens");

// ---------------------------------------------------------------------------
// ビルド設定
// ---------------------------------------------------------------------------

const variableFiles = globSync("./tokens/variables/*.json").map((f) =>
  f.startsWith("./") ? f : `./${f}`
);
const styleFiles = globSync("./tokens/styles/*.json").map((f) =>
  f.startsWith("./") ? f : `./${f}`
);

// variable/style の正規化出力は同じ tmp directory に集約するため、
// 各前処理関数ではなく config の入口で一度だけ掃除する。
resetTokenBuildDirectory(TMP_DIR);
const { outputPaths: mergedVariableFiles, extendedModeSelectors } =
  mergeExtendedCollections(variableFiles, TMP_DIR);
const normalizedStyleFiles = normalizeStyleFiles(styleFiles, TMP_DIR);

const tokenFiles = [...mergedVariableFiles, ...normalizedStyleFiles];
// Tailwind の --color-* に変換する Figma token path。
// reference token は CSS の alias 解決用に残し、Tailwind utility としては公開しない。
const tailwindColorTokenPaths = [
  // 色のセマンティック層は Schemes/* から UI/*（面・輪郭・状態）と Brand/*（ブランド配色）へ再編。
  "UI.**",
  "Brand.**",
  "StateLayers.**",
  // パレット色も公開する（issue #51）。アプリ固有の色（お気に入りの黄色等）を
  // セマンティック化しない方針のため、text-yellow-300 のように直接使えるようにする。
  // 使えないと似た色が生値で増えるリスクの方が大きい。
  "Blue.**",
  "Cyan.**",
  "Gray.**",
  "Green.**",
  "Orange.**",
  "Purple.**",
  "Red.**",
  "Yellow.**"
];
// deprecated-dimension.json のトップレベル group（Padding / Border radius / Border /
// Icon stroke width）は廃止コレクション専用。glob に含めると廃止トークンが @theme に
// 露出し、利用側で p-廃止-16 等のユーティリティが生成される（issue #52）。
// 正規トークンはすべて Spacing.* / Sizing.* / Elevation.* 配下にある。
const tailwindSpacingTokenPaths = [
  "Spacing.Padding.**",
  "Spacing.Margin.**",
  "Sizing.Component.**",
  "Sizing.Icon.**"
];
const tailwindRadiusTokenPaths = ["Sizing.Radius.**"];
const tailwindShadowTokenPaths = ["Elevation.**"];
const tailwindBorderWidthTokenPaths = ["Sizing.Border.**"];

export default defineConfig({
  tokens: tokenFiles.length > 0 ? tokenFiles : ["./tokens.json"],
  outDir: "./generated/",
  lint: {
    rules: {
      // プラグインが HEX 文字列で出力するため v2 の厳格チェックを緩和
      "core/valid-color": "warn",
      "core/valid-typography": "warn",
      "core/valid-dimension": "warn",
    },
  },
  plugins: [
    css({
      filename: "tokens.css",
      modeSelectors: [
        { mode: "Light", selectors: ['[data-theme="light"]'] },
        { mode: "Dark", selectors: ['[data-theme="dark"]'] },
        { mode: "light", selectors: ['[data-theme="light"]'] },
        { mode: "dark", selectors: ['[data-theme="dark"]'] },
        // Typography System のベース言語 mode（JP/EN）を data-lang 軸に割り当てる。
        { mode: "JP", selectors: ['[data-lang="ja"]'] },
        { mode: "EN", selectors: ['[data-lang="en"]'] },
        ...extendedModeSelectors,
      ],
    }),
    tailwind({
      // Terrazzo 2.2.0 時点でも template は outDir 相対で解決されるため、
      // generated/ ではなく、このパッケージ直下の template を絶対パスで渡す。
      template: resolve(__dirname, "tailwind.template.css"),
      filename: "tailwind-tokens.css",
      variableName: tailwindThemeVariableName,
      theme: {
        color: tailwindColorTokenPaths,
        spacing: tailwindSpacingTokenPaths,
        radius: tailwindRadiusTokenPaths,
        shadow: tailwindShadowTokenPaths,
        "border-width": tailwindBorderWidthTokenPaths,
        // stroke-width は廃止トークン（Icon stroke width.**）しか無かったため namespace ごと出力しない
      },
    }),
  ],
});
