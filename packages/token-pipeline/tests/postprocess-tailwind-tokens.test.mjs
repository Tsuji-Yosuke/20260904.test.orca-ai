import test from "node:test";
import assert from "node:assert/strict";

import { postprocessTailwindTokens } from "../scripts/postprocess-tailwind-tokens.mjs";

// Brand/UI/StateLayers の最小構成を持つ color-system.json 相当のソース文書。
const colorSystemDocument = {
  Brand: {
    Primary: {
      $type: "color",
      $value: "{Brand.Black}"
    }
  },
  UI: {
    Disabled: {
      $type: "color",
      $value: "{Gray.200}"
    }
  },
  StateLayers: {
    DarkOpacity: {
      8: {
        $type: "color",
        $value: "#00000014"
      }
    }
  }
};

// tokens.css が実際に生成するセマンティック変数の宣言（対応する var が存在することの検証対象）。
const tokensCss = `:root, [data-theme="light"] {
  --brand-primary: var(--brand-black);
  --ui-disabled: var(--gray-200);
  --state-layers-dark-opacity-8: rgb(0% 0% 0% / 0.07843);
}
`;

test("postprocessTailwindTokens rewrites Brand alias values to the semantic variable", () => {
  const tailwindCss = `@theme {
  --color-primary: var(--brand-black);
}
`;

  const result = postprocessTailwindTokens({ tailwindCss, tokensCss, colorSystemDocument });

  assert.match(result, /--color-primary: var\(--brand-primary\);/);
  assert.doesNotMatch(result, /--color-primary: var\(--brand-black\);/);
});

test("postprocessTailwindTokens rewrites UI alias values to the semantic variable", () => {
  const tailwindCss = `@theme {
  --color-disabled: var(--gray-200);
}
`;

  const result = postprocessTailwindTokens({ tailwindCss, tokensCss, colorSystemDocument });

  assert.match(result, /--color-disabled: var\(--ui-disabled\);/);
  assert.doesNotMatch(result, /--color-disabled: var\(--gray-200\);/);
});

test("postprocessTailwindTokens rewrites raw (non-alias) StateLayers values to the semantic variable", () => {
  // StateLayers は tailwindThemeVariableName が prefix 込みの名前を維持する
  // （tests/preprocess-tokens.test.mjs の「衝突回避のため explicit のまま」を参照）。
  const tailwindCss = `@theme {
  --color-state-layers-dark-opacity-8: rgb(0% 0% 0% / 0.07843);
}
`;

  const result = postprocessTailwindTokens({ tailwindCss, tokensCss, colorSystemDocument });

  assert.match(result, /--color-state-layers-dark-opacity-8: var\(--state-layers-dark-opacity-8\);/);
  assert.doesNotMatch(result, /--color-state-layers-dark-opacity-8: rgb\(/);
});

test("postprocessTailwindTokens throws when the semantic variable is missing from tokens.css", () => {
  const tailwindCss = `@theme {
  --color-primary: var(--brand-black);
}
`;
  const tokensCssWithoutSemanticVariable = `:root, [data-theme="light"] {
  --ui-disabled: var(--gray-200);
  --state-layers-dark-opacity-8: rgb(0% 0% 0% / 0.07843);
}
`;

  assert.throws(() => {
    postprocessTailwindTokens({
      tailwindCss,
      tokensCss: tokensCssWithoutSemanticVariable,
      colorSystemDocument
    });
  }, /brand-primary/);
});

test("postprocessTailwindTokens leaves non-color theme namespaces untouched", () => {
  const tailwindCss = `@theme {
  --color-primary: var(--brand-black);
  --spacing-padding-lg: var(--sizing-2xl);
  --radius-full: var(--sizing-full);
}
`;

  const result = postprocessTailwindTokens({ tailwindCss, tokensCss, colorSystemDocument });

  assert.match(result, /--spacing-padding-lg: var\(--sizing-2xl\);/);
  assert.match(result, /--radius-full: var\(--sizing-full\);/);
});
