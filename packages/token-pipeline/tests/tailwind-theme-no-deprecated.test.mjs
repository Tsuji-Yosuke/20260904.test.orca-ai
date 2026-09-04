import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 生成物への回帰テスト（issue #52）。
// deprecated-dimension.json（Figma の (deprecated) Dimension コレクション）のトークンが
// @theme に露出すると、利用側で p-廃止-16 / rounded-廃止-l のようなユーティリティが
// 生成されてしまう。@theme ブロックに廃止トークンが含まれないことを検証する。
const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tailwindTokensCss = readFileSync(
  resolve(packageDir, "generated/tailwind-tokens.css"),
  "utf8"
);

function themeBlock(css) {
  const match = css.match(/@theme \{[\s\S]*?\n\}/);
  assert.ok(match, "@theme ブロックが見つかりません");
  return match[0];
}

test("@theme に廃止トークン由来の変数が無い", () => {
  const theme = themeBlock(tailwindTokensCss);
  const deprecated = theme.match(/^\s*--\S*廃止\S*(?=:)/gm) ?? [];
  assert.deepEqual(deprecated, []);
});

test("@theme の正規トークンは除外されずに残る", () => {
  const theme = themeBlock(tailwindTokensCss);
  // 廃止 glob と同じ namespace（spacing / radius / border-width）の代表トークン
  for (const varName of [
    "--spacing-padding-md:",
    "--spacing-margin-md:",
    "--radius-xl:",
    "--border-width-md:",
    "--color-primary:"
  ]) {
    assert.ok(theme.includes(varName), `${varName} が @theme に無い`);
  }
});
