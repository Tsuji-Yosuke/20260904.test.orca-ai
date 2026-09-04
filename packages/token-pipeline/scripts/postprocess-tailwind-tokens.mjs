import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { cssVariableSlug, tailwindThemeVariableName, walkTokens } from "./preprocess-tokens.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(__dirname, "..");

// terrazzo.config.mjs の tailwindColorTokenPaths（UI.**/Brand.**/StateLayers.**）と対応する、
// セマンティック色変数を持つ group。ここに無い group（Figma の生プリミティブ等）は対象外。
const SEMANTIC_COLOR_GROUPS = ["Brand", "UI", "StateLayers"];

// tokens.css の中に、対応するセマンティック変数の宣言（--xxx:）が実在するか検証する。
// 推測でのマッピングを避け、無い場合はビルドを fail させて静かなズレの再発を防ぐ。
function assertSemanticVariableExists(tokensCss, semanticVarName, tokenId) {
  if (!tokensCss.includes(`${semanticVarName}:`)) {
    throw new Error(
      `[postprocess-tailwind-tokens] ${tokenId} に対応するセマンティック変数 ${semanticVarName} が generated/tokens.css に見つかりません。`
    );
  }
}

/**
 * colorSystemDocument（tokens/variables/color-system.json 相当）の Brand/UI/StateLayers group を
 * 走査し、Tailwind theme の --color-* 変数名 → tokens.css のセマンティック変数名 の対応表を作る。
 *
 * Tailwind 側の変数名は @terrazzo/plugin-tailwind の実際の命名（グループ prefix を除いた残りの
 * token path から作る defaultName）を再現したうえで、既存の tailwindThemeVariableName にそのまま
 * 通す。tokens.css 側の変数名は @terrazzo/plugin-css が生成する完全な token path の slug。
 */
export function buildSemanticColorVariableMap(colorSystemDocument, tokensCss) {
  const map = new Map();

  for (const group of SEMANTIC_COLOR_GROUPS) {
    const groupDocument = colorSystemDocument[group];
    if (!groupDocument) continue;

    walkTokens(groupDocument, (token, relativePath) => {
      if (token.$type !== "color") return;

      const tokenPath = [group, ...relativePath];
      const tokenId = tokenPath.join(".");

      // plugin-tailwind の defaultName は `--color-<token path 全体>` の形（グループ prefix 込み）。
      // 最終名は tailwindThemeVariableName が決める（UI/Brand は末尾名、StateLayers は prefix 込みのまま）。
      const defaultName = `--color-${cssVariableSlug(tokenPath)}`;
      const tailwindVarName = tailwindThemeVariableName(defaultName, {
        path: ["color"],
        token: { id: tokenId }
      });

      const semanticVarName = `--${cssVariableSlug(tokenPath)}`;
      assertSemanticVariableExists(tokensCss, semanticVarName, tokenId);

      map.set(tailwindVarName, semanticVarName);
    });
  }

  return map;
}

// @theme ブロック内の --color-* 宣言の値だけを、対応するセマンティック変数への var() 参照に
// 書き換える。変数名（= Tailwind utility 名）は変更しない。map に無い --color-* 宣言
// （Figma の生プリミティブ等）はそのまま残す。spacing/radius/shadow 等の namespace には触れない。
export function rewriteTailwindColorTheme(tailwindCss, semanticColorVariableMap) {
  return tailwindCss.replace(
    /^(\s*)(--color-[a-z0-9-]+): ([^;]+);/gm,
    (match, indent, varName) => {
      const semanticVarName = semanticColorVariableMap.get(varName);
      if (!semanticVarName) return match;
      return `${indent}${varName}: var(${semanticVarName});`;
    }
  );
}

// tailwind CSS 文字列 + tokens CSS 文字列 + ソース token 文書 → 書き換え済み CSS 文字列。
export function postprocessTailwindTokens({ tailwindCss, tokensCss, colorSystemDocument }) {
  const semanticColorVariableMap = buildSemanticColorVariableMap(colorSystemDocument, tokensCss);
  return rewriteTailwindColorTheme(tailwindCss, semanticColorVariableMap);
}

// CLI から呼ばれたときに、tz build 済みの generated/tailwind-tokens.css を
// generated/tokens.css と tokens/variables/color-system.json をもとに書き換える。
export function postprocessTailwindTokensFile({
  tailwindTokensPath = resolve(packageDir, "generated/tailwind-tokens.css"),
  tokensCssPath = resolve(packageDir, "generated/tokens.css"),
  colorSystemPath = resolve(packageDir, "tokens/variables/color-system.json")
} = {}) {
  const tailwindCss = readFileSync(tailwindTokensPath, "utf8");
  const tokensCss = readFileSync(tokensCssPath, "utf8");
  const colorSystemDocument = JSON.parse(readFileSync(colorSystemPath, "utf8"));

  const nextTailwindCss = postprocessTailwindTokens({ tailwindCss, tokensCss, colorSystemDocument });

  writeFileSync(tailwindTokensPath, nextTailwindCss);
  return tailwindTokensPath;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  postprocessTailwindTokensFile();
}
