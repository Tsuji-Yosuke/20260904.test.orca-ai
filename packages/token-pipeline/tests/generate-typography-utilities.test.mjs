import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTypographyUtilities,
  cssVariableSlug
} from "../scripts/generate-typography-utilities.mjs";

test("cssVariableSlug matches token CSS variable naming", () => {
  assert.equal(cssVariableSlug(["Standard", "Body", "LargeBold"]), "standard-body-large-bold");
  assert.equal(cssVariableSlug(["Tight", "Text Link", "Medium"]), "tight-text-link-medium");
});

test("buildTypographyUtilities emits typography utility classes", () => {
  const css = buildTypographyUtilities({
    Standard: {
      Body: {
        Large: {
          $type: "typography",
          $value: {
            textDecoration: "NONE",
            textCase: "ORIGINAL"
          }
        }
      }
    },
    Tight: {
      "Text Link": {
        Medium: {
          $type: "typography",
          $value: {
            textDecoration: "UNDERLINE",
            textCase: "ORIGINAL"
          }
        }
      }
    }
  });

  assert.match(css, /@utility typography-standard-body-large \{/);
  assert.match(css, /font-family: var\(--standard-body-large-font-family\);/);
  assert.match(css, /font-size: var\(--standard-body-large-font-size\);/);
  assert.match(css, /font-weight: var\(--standard-body-large-font-weight\);/);
  assert.match(css, /line-height: var\(--standard-body-large-line-height\);/);
  assert.match(css, /letter-spacing: var\(--standard-body-large-letter-spacing\);/);
  assert.match(css, /text-decoration-line: none;/);
  assert.match(css, /@utility typography-tight-text-link-medium \{/);
  assert.match(css, /text-decoration-line: underline;/);
});

test("buildTypographyUtilities skips underscore-prefixed (_Doc) documentation styles", () => {
  const css = buildTypographyUtilities({
    _Doc: {
      16: {
        "regular (Caption)": {
          $type: "typography",
          $value: { textDecoration: "NONE", textCase: "ORIGINAL" }
        }
      }
    },
    Standard: {
      Body: {
        Large: {
          $type: "typography",
          $value: { textDecoration: "NONE", textCase: "ORIGINAL" }
        }
      }
    }
  });

  // _Doc 由来の不正な utility 名を出さない
  assert.doesNotMatch(css, /_doc|\(caption\)/i);
  // 通常スタイルは出る
  assert.match(css, /@utility typography-standard-body-large \{/);
});

// 生成物への回帰テスト（issue #39）。
// Figma のスタイル名の打ち間違い（Tight/Label/Label 等）があると、期待するクラスが
// 静かに欠けて別名のクラスが生まれる。全組み合わせを機械的に突き合わせて検出する。
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

test("typography utilities cover every density × family × size × bold combination", () => {
  const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const css = readFileSync(resolve(packageDir, "generated/typography-utilities.css"), "utf8");
  const actual = new Set(
    [...css.matchAll(/@utility (typography-[a-z0-9-]+)/g)].map((m) => m[1])
  );

  const densities = ["loose", "standard", "tight"];
  const families = ["body", "display", "headline", "label", "title", "text-link"];
  const sizes = ["large", "medium", "small"];
  const weights = ["", "-bold"];

  const expected = new Set();
  for (const density of densities)
    for (const family of families)
      for (const size of sizes)
        for (const weight of weights)
          expected.add(`typography-${density}-${family}-${size}${weight}`);

  const missing = [...expected].filter((name) => !actual.has(name)).sort();
  const unexpected = [...actual].filter((name) => !expected.has(name)).sort();

  assert.deepEqual(missing, [], `欠けているクラス: ${missing.join(", ")}`);
  assert.deepEqual(unexpected, [], `想定外のクラス: ${unexpected.join(", ")}`);
  assert.equal(actual.size, 108);
});
