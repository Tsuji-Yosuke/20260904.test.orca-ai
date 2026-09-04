import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  figmaDimensionToTerrazzoDimension,
  figmaRgbaToTerrazzoColor,
  mergeExtendedCollections,
  normalizeFigmaTypography,
  normalizeStyleFiles,
  normalizeVariableDocumentForTerrazzo,
  normalizeStyleDocumentForTerrazzo,
  shouldIncludeStyleDocumentForTerrazzo,
  tailwindThemeVariableName
} from "../scripts/preprocess-tokens.mjs";

test("figmaRgbaToTerrazzoColor converts Figma rgba channels to Terrazzo color objects", () => {
  assert.deepEqual(
    figmaRgbaToTerrazzoColor({ r: 0.25, g: 0.5, b: 0.75, a: 0.2 }),
    {
      colorSpace: "srgb",
      components: [0.25, 0.5, 0.75],
      alpha: 0.2
    }
  );
});

test("figmaDimensionToTerrazzoDimension converts Figma dimension units to CSS units", () => {
  assert.deepEqual(figmaDimensionToTerrazzoDimension(12), { value: 12, unit: "px" });
  assert.deepEqual(
    figmaDimensionToTerrazzoDimension({ value: 120, unit: "PERCENT" }),
    { value: 120, unit: "%" }
  );
  assert.deepEqual(
    figmaDimensionToTerrazzoDimension({ value: 8, unit: "PIXELS" }),
    { value: 8, unit: "px" }
  );
});

test("normalizeStyleDocumentForTerrazzo converts Figma effect shadows to Terrazzo shadows", () => {
  const document = {
    Elevation: {
      Level1: {
        $type: "shadow",
        $value: [
          {
            type: "DROP_SHADOW",
            visible: true,
            radius: 6,
            color: { r: 0.1, g: 0.2, b: 0.3, a: 0.4 },
            offset: { x: 1, y: 2 },
            spread: -1
          },
          {
            type: "INNER_SHADOW",
            visible: true,
            radius: 4,
            color: { r: 0.5, g: 0.6, b: 0.7 },
            offset: { x: 3, y: 4 }
          },
          {
            type: "DROP_SHADOW",
            visible: false,
            radius: 99,
            color: { r: 1, g: 1, b: 1, a: 1 },
            offset: { x: 9, y: 9 },
            spread: 9
          }
        ]
      }
    }
  };

  const normalized = normalizeStyleDocumentForTerrazzo(document);

  assert.deepEqual(normalized.Elevation.Level1.$value, [
    {
      color: {
        colorSpace: "srgb",
        components: [0.1, 0.2, 0.3],
        alpha: 0.4
      },
      offsetX: { value: 1, unit: "px" },
      offsetY: { value: 2, unit: "px" },
      blur: { value: 6, unit: "px" },
      spread: { value: -1, unit: "px" },
      inset: false
    },
    {
      color: {
        colorSpace: "srgb",
        components: [0.5, 0.6, 0.7],
        alpha: 1
      },
      offsetX: { value: 3, unit: "px" },
      offsetY: { value: 4, unit: "px" },
      blur: { value: 4, unit: "px" },
      spread: { value: 0, unit: "px" },
      inset: true
    }
  ]);
  assert.equal(document.Elevation.Level1.$value[0].radius, 6);
});

test("normalizeFigmaTypography adds dimensions and font weight for Terrazzo", () => {
  assert.deepEqual(
    normalizeFigmaTypography({
      fontFamily: "Noto Sans JP",
      fontStyle: "Bold",
      fontSize: 16,
      lineHeight: { value: 150, unit: "PERCENT" },
      letterSpacing: { value: 0, unit: "PIXELS" },
      paragraphSpacing: 0
    }),
    {
      fontFamily: "Noto Sans JP",
      fontStyle: "Bold",
      fontWeight: "bold",
      fontSize: { value: 16, unit: "px" },
      lineHeight: { value: 150, unit: "%" },
      letterSpacing: { value: 0, unit: "px" },
      paragraphSpacing: { value: 0, unit: "px" },
      wordSpacing: undefined
    }
  );
});

test("normalizeVariableDocumentForTerrazzo converts Tailwind length groups to dimensions", () => {
  const document = {
    "Border radius": {
      S: {
        $type: "number",
        $value: 8,
        $extensions: {
          mode: {
            Compact: 6
          }
        }
      }
    },
    Padding: {
      16: {
        $type: "number",
        $value: 16
      }
    },
    Border: {
      2: {
        $type: "number",
        $value: 2
      }
    },
    "Icon stroke width": {
      Regular: {
        Small: {
          $type: "number",
          $value: 1
        }
      }
    },
    "Font Size": {
      14: {
        $type: "number",
        $value: 14
      }
    },
    Spacing: {
      14: {
        $type: "number",
        $value: 56
      },
      Padding: {
        md: {
          $type: "number",
          $value: 24
        }
      }
    },
    Sizing: {
      Component: {
        Full: {
          lg: {
            $type: "number",
            $value: 56
          }
        }
      },
      Icon: {
        md: {
          $type: "number",
          $value: 20
        }
      },
      Radius: {
        xs: {
          $type: "number",
          $value: 4
        }
      },
      Border: {
        sm: {
          $type: "number",
          $value: 1
        }
      }
    },
    Count: {
      Items: {
        $type: "number",
        $value: 3
      }
    }
  };

  const normalized = normalizeVariableDocumentForTerrazzo(document);

  assert.deepEqual(normalized["Border radius"].S, {
    $type: "dimension",
    $value: { value: 8, unit: "px" },
    $extensions: {
      mode: {
        Compact: { value: 6, unit: "px" }
      }
    }
  });
  assert.deepEqual(normalized.Padding[16], {
    $type: "dimension",
    $value: { value: 16, unit: "px" }
  });
  assert.deepEqual(normalized.Border[2], {
    $type: "dimension",
    $value: { value: 2, unit: "px" }
  });
  assert.deepEqual(normalized["Icon stroke width"].Regular.Small, {
    $type: "dimension",
    $value: { value: 1, unit: "px" }
  });
  assert.deepEqual(normalized["Font Size"][14], {
    $type: "dimension",
    $value: { value: 14, unit: "px" }
  });
  assert.deepEqual(normalized.Spacing[14], {
    $type: "dimension",
    $value: { value: 56, unit: "px" }
  });
  assert.deepEqual(normalized.Spacing.Padding.md, {
    $type: "dimension",
    $value: { value: 24, unit: "px" }
  });
  assert.deepEqual(normalized.Sizing.Component.Full.lg, {
    $type: "dimension",
    $value: { value: 56, unit: "px" }
  });
  assert.deepEqual(normalized.Sizing.Icon.md, {
    $type: "dimension",
    $value: { value: 20, unit: "px" }
  });
  assert.deepEqual(normalized.Sizing.Radius.xs, {
    $type: "dimension",
    $value: { value: 4, unit: "px" }
  });
  assert.deepEqual(normalized.Sizing.Border.sm, {
    $type: "dimension",
    $value: { value: 1, unit: "px" }
  });
  assert.deepEqual(normalized.Count.Items, {
    $type: "number",
    $value: 3
  });
  assert.equal(document["Border radius"].S.$type, "number");
});

test("normalizeVariableDocumentForTerrazzo converts typography references for CSS use", () => {
  const document = {
    "Font Weight": {
      Regular: {
        $type: "string",
        $value: "Regular"
      },
      Bold: {
        $type: "string",
        $value: "Bold"
      }
    },
    "Letter Spacing": {
      2: {
        $type: "number",
        $value: 2
      },
      "-2": {
        $type: "number",
        $value: -2
      }
    },
    Label: {
      FontSize: {
        $type: "number",
        $value: "{Font Size.14}"
      },
      FontWeight: {
        $type: "string",
        $value: "{Font Weight.Regular}"
      },
      LetterSpacing: {
        $type: "number",
        $value: "{Letter Spacing.-2}",
        $extensions: {
          mode: {
            Compact: "{Letter Spacing.-2}"
          }
        }
      }
    }
  };

  const normalized = normalizeVariableDocumentForTerrazzo(document);

  assert.deepEqual(normalized["Font Weight"].Regular, {
    $type: "number",
    $value: 400
  });
  assert.deepEqual(normalized["Font Weight"].Bold, {
    $type: "number",
    $value: 700
  });
  assert.deepEqual(normalized["Letter Spacing"][2], {
    $type: "dimension",
    $value: { value: 2, unit: "px" }
  });
  assert.equal(normalized["Letter Spacing"]["-2"], undefined);
  assert.deepEqual(normalized["Letter Spacing"]["Negative 2"], {
    $type: "dimension",
    $value: { value: -2, unit: "px" }
  });
  assert.equal(normalized.Label.FontSize.$type, "dimension");
  assert.equal(normalized.Label.FontSize.$value, "{Font Size.14}");
  assert.equal(normalized.Label.FontWeight.$type, "number");
  assert.equal(normalized.Label.FontWeight.$value, "{Font Weight.Regular}");
  assert.equal(normalized.Label.LetterSpacing.$type, "dimension");
  assert.equal(normalized.Label.LetterSpacing.$value, "{Letter Spacing.Negative 2}");
  assert.equal(
    normalized.Label.LetterSpacing.$extensions.mode.Compact,
    "{Letter Spacing.Negative 2}"
  );
});

test("normalizeVariableDocumentForTerrazzo handles renamed (no-space) typography reference groups", () => {
  // Figma で Font Size/Font Weight/Letter Spacing がスペース無しの
  // FontSize/FontWeight/LetterSpacing にリネームされても同じ正規化が効くこと。
  const document = {
    FontWeight: {
      Regular: { $type: "string", $value: "Regular" },
      Bold: { $type: "string", $value: "Bold" }
    },
    LetterSpacing: {
      2: { $type: "number", $value: 2 },
      "-2": { $type: "number", $value: -2 }
    },
    FontSize: {
      lg: { $type: "number", $value: 16 }
    },
    Label: {
      FontSize: {
        $type: "number",
        $value: "{FontSize.lg}"
      },
      FontWeight: {
        $type: "string",
        $value: "{FontWeight.Regular}"
      },
      LetterSpacing: {
        $type: "number",
        $value: "{LetterSpacing.-2}"
      }
    }
  };

  const normalized = normalizeVariableDocumentForTerrazzo(document);

  // reference 側（先頭グループが新名）も length として dimension 化される
  assert.deepEqual(normalized.FontSize.lg, {
    $type: "dimension",
    $value: { value: 16, unit: "px" }
  });
  assert.deepEqual(normalized.LetterSpacing[2], {
    $type: "dimension",
    $value: { value: 2, unit: "px" }
  });
  assert.equal(normalized.LetterSpacing["-2"], undefined);
  assert.deepEqual(normalized.LetterSpacing["Negative 2"], {
    $type: "dimension",
    $value: { value: -2, unit: "px" }
  });
  // font weight reference は number 化
  assert.deepEqual(normalized.FontWeight.Regular, { $type: "number", $value: 400 });
  assert.deepEqual(normalized.FontWeight.Bold, { $type: "number", $value: 700 });
  // system 側は dimension/number に揃い、alias 参照も新 prefix で書き換わる
  assert.equal(normalized.Label.FontSize.$type, "dimension");
  assert.equal(normalized.Label.FontWeight.$type, "number");
  assert.equal(normalized.Label.LetterSpacing.$type, "dimension");
  assert.equal(normalized.Label.LetterSpacing.$value, "{LetterSpacing.Negative 2}");
});

test("shouldIncludeStyleDocumentForTerrazzo excludes Figma grid styles", () => {
  assert.equal(
    shouldIncludeStyleDocumentForTerrazzo({
      $extensions: {
        figmaSync: {
          styleType: "grid"
        }
      }
    }),
    false
  );
  assert.equal(
    shouldIncludeStyleDocumentForTerrazzo({
      $extensions: {
        figmaSync: {
          styleType: "effect"
        }
      }
    }),
    true
  );
});

test("mergeExtendedCollections merges single-mode extended collection values into parent modes", () => {
  const workDir = mkdtempSync(join(tmpdir(), "orca-token-pipeline-"));
  const parentPath = join(workDir, "color-system.json");
  const extendedPath = join(workDir, "corporate.json");
  const outDir = join(workDir, ".tmp-tokens");

  writeFileSync(
    parentPath,
    JSON.stringify({
      $extensions: {
        figmaSync: {
          collectionId: "parent",
          name: "Color System",
          modes: [{ modeId: "light", name: "Light" }]
        }
      },
      Schemes: {
        Primary: {
          Primary: {
            $type: "color",
            $value: "{Brand.Black}",
            $extensions: {
              mode: {
                Light: "{Brand.Black}"
              }
            }
          }
        }
      }
    })
  );

  writeFileSync(
    extendedPath,
    JSON.stringify({
      $extensions: {
        figmaSync: {
          collectionId: "extended",
          parentCollectionId: "parent",
          name: "Corporate",
          defaultModeId: "corporate-light",
          modes: [{ modeId: "corporate-light", name: "Light" }]
        }
      },
      Schemes: {
        Primary: {
          Primary: {
            $type: "color",
            $value: "{Brand.Toyota Red}"
          }
        }
      }
    })
  );

  const { outputPaths, extendedModeSelectors } = mergeExtendedCollections(
    [parentPath, extendedPath],
    outDir
  );
  const merged = JSON.parse(readFileSync(outputPaths[0], "utf8"));

  assert.deepEqual(extendedModeSelectors, [
    {
      mode: "Corporate-Light",
      selectors: ['[data-color-system="corporate"]']
    }
  ]);
  // Terrazzo のモード名一致制約のため、mode キー名自体は変わらない
  assert.equal(extendedModeSelectors[0].mode, "Corporate-Light");
  assert.equal(
    merged.Schemes.Primary.Primary.$extensions.mode["Corporate-Light"],
    "{Brand.Toyota Red}"
  );
});

test("mergeExtendedCollections does not clear existing normalized style files", () => {
  const workDir = mkdtempSync(join(tmpdir(), "orca-token-pipeline-"));
  const parentPath = join(workDir, "color-system.json");
  const stylePath = join(workDir, "effect.json");
  const outDir = join(workDir, ".tmp-tokens");

  writeFileSync(
    parentPath,
    JSON.stringify({
      $extensions: {
        figmaSync: {
          collectionId: "parent",
          name: "Color System",
          modes: [{ modeId: "light", name: "Light" }]
        }
      },
      Schemes: {
        Primary: {
          Primary: {
            $type: "color",
            $value: "{Brand.Black}"
          }
        }
      }
    })
  );
  writeFileSync(
    stylePath,
    JSON.stringify({
      $extensions: {
        figmaSync: {
          styleType: "effect"
        }
      },
      Elevation: {
        Level1: {
          $type: "shadow",
          $value: {
            type: "DROP_SHADOW",
            visible: true,
            radius: 1,
            offset: { x: 0, y: 1 },
            color: { r: 0, g: 0, b: 0, a: 0.2 }
          }
        }
      }
    })
  );

  const [styleOutPath] = normalizeStyleFiles([stylePath], outDir);
  mergeExtendedCollections([parentPath], outDir);

  assert.equal(JSON.parse(readFileSync(styleOutPath, "utf8")).Elevation.Level1.$type, "shadow");
});

test("tailwindThemeVariableName removes redundant Schemes category prefixes", () => {
  assert.equal(
    tailwindThemeVariableName("--color-schemes-primary-primary", {
      path: ["color"],
      token: { id: "Schemes.Primary.Primary" }
    }),
    "--color-primary"
  );
  assert.equal(
    tailwindThemeVariableName("--color-schemes-primary-on-primary", {
      path: ["color"],
      token: { id: "Schemes.Primary.OnPrimary" }
    }),
    "--color-on-primary"
  );
  assert.equal(
    tailwindThemeVariableName("--color-state-layers-hover", {
      path: ["color"],
      token: { id: "StateLayers.Hover" }
    }),
    "--color-state-layers-hover"
  );
});

test("tailwindThemeVariableName drops UI/Brand category prefixes for color utilities", () => {
  // UI/* と Brand/* は末尾名で公開（旧 Schemes と同じ規則）
  assert.equal(
    tailwindThemeVariableName("--color-ui-surface-bright", {
      path: ["color"],
      token: { id: "UI.SurfaceBright" }
    }),
    "--color-surface-bright"
  );
  assert.equal(
    tailwindThemeVariableName("--color-ui-outline-focus", {
      path: ["color"],
      token: { id: "UI.OutlineFocus" }
    }),
    "--color-outline-focus"
  );
  assert.equal(
    tailwindThemeVariableName("--color-brand-primary", {
      path: ["color"],
      token: { id: "Brand.Primary" }
    }),
    "--color-primary"
  );
  assert.equal(
    tailwindThemeVariableName("--color-brand-on-primary", {
      path: ["color"],
      token: { id: "Brand.OnPrimary" }
    }),
    "--color-on-primary"
  );
  // StateLayers は従来どおり末尾名にしない（衝突回避のため explicit のまま）
  assert.equal(
    tailwindThemeVariableName("--color-state-layers-dark-opacity-8", {
      path: ["color"],
      token: { id: "StateLayers.DarkOpacity.8" }
    }),
    "--color-state-layers-dark-opacity-8"
  );
});

test("tailwindThemeVariableName removes redundant dimension category prefixes", () => {
  assert.equal(
    tailwindThemeVariableName("--spacing-padding-16", {
      path: ["spacing"],
      token: { id: "Padding.16" }
    }),
    "--spacing-16"
  );
  assert.equal(
    tailwindThemeVariableName("--radius-border-radius-xs", {
      path: ["radius"],
      token: { id: "Border radius.XS" }
    }),
    "--radius-xs"
  );
  assert.equal(
    tailwindThemeVariableName("--border-width-border-1", {
      path: ["border-width"],
      token: { id: "Border.1" }
    }),
    "--border-width-1"
  );
  assert.equal(
    tailwindThemeVariableName("--spacing-spacing-14", {
      path: ["spacing"],
      token: { id: "Spacing.14" }
    }),
    "--spacing-spacing-14"
  );
  assert.equal(
    tailwindThemeVariableName("--spacing-spacing-padding-md", {
      path: ["spacing"],
      token: { id: "Spacing.Padding.md" }
    }),
    "--spacing-padding-md"
  );
  assert.equal(
    tailwindThemeVariableName("--spacing-spacing-margin-md", {
      path: ["spacing"],
      token: { id: "Spacing.Margin.md" }
    }),
    "--spacing-margin-md"
  );
  assert.equal(
    tailwindThemeVariableName("--spacing-sizing-component-full-lg", {
      path: ["spacing"],
      token: { id: "Sizing.Component.Full.lg" }
    }),
    "--spacing-component-full-lg"
  );
  assert.equal(
    tailwindThemeVariableName("--spacing-sizing-icon-md", {
      path: ["spacing"],
      token: { id: "Sizing.Icon.md" }
    }),
    "--spacing-icon-md"
  );
  assert.equal(
    tailwindThemeVariableName("--radius-sizing-radius-xs", {
      path: ["radius"],
      token: { id: "Sizing.Radius.xs" }
    }),
    "--radius-xs"
  );
  assert.equal(
    tailwindThemeVariableName("--border-width-sizing-border-sm", {
      path: ["border-width"],
      token: { id: "Sizing.Border.sm" }
    }),
    "--border-width-sm"
  );
  assert.equal(
    tailwindThemeVariableName("--radius-sizing-icon-md", {
      path: ["radius"],
      token: { id: "Sizing.Icon.md" }
    }),
    "--radius-sizing-icon-md"
  );
});

test("mergeExtendedCollections maps Expressive/Productive to data-density and language to data-lang", () => {
  const workDir = mkdtempSync(join(tmpdir(), "orca-density-"));
  const outDir = join(workDir, ".tmp-tokens");
  const write = (file, data) => {
    const p = join(workDir, file);
    writeFileSync(p, JSON.stringify(data));
    return p;
  };
  const parentMeta = (collectionId, name, modes) => ({
    $extensions: { figmaSync: { collectionId, name, modes } },
    Sizing: { sm: { $type: "number", $value: 1, $extensions: { mode: {} } } }
  });
  const extMeta = (collectionId, parentCollectionId, name, modes) => ({
    $extensions: { figmaSync: { collectionId, parentCollectionId, name, defaultModeId: modes[0].modeId, modes } },
    Sizing: { sm: { $type: "number", $value: 2 } }
  });

  const dim = write("dimension-system.json", parentMeta("dim", "Dimension System", [{ modeId: "d", name: "Default" }]));
  const typ = write("typography-system.json", parentMeta("typ", "Typography System", [{ modeId: "jp", name: "JP" }, { modeId: "en", name: "EN" }]));
  const dimExpr = write("dimension-system-expressive.json", extMeta("de", "dim", "Expressive", [{ modeId: "ded", name: "Default" }]));
  const dimProd = write("dimension-system-productive.json", extMeta("dp", "dim", "Productive", [{ modeId: "dpd", name: "Default" }]));
  const typExpr = write("typography-system-expressive.json", extMeta("te", "typ", "Expressive", [{ modeId: "tej", name: "JP" }, { modeId: "tee", name: "EN" }]));

  const { extendedModeSelectors } = mergeExtendedCollections([dim, typ, dimExpr, dimProd, typExpr], outDir);

  const byMode = Object.fromEntries(extendedModeSelectors.map((s) => [s.mode, s.selectors]));
  // density 軸: 言語を持たない寸法(Dimension)は data-density のみ
  assert.deepEqual(byMode["Expressive-Default"], ['[data-density="expressive"]']);
  assert.deepEqual(byMode["Productive-Default"], ['[data-density="productive"]']);
  // density × lang: 言語を持つ文字(Typography)は data-density と data-lang の複合
  assert.deepEqual(byMode["Expressive-JP"], ['[data-density="expressive"][data-lang="ja"]']);
  assert.deepEqual(byMode["Expressive-EN"], ['[data-density="expressive"][data-lang="en"]']);
  // data-theme には密度を出さない
  assert.ok(!extendedModeSelectors.some((s) => s.selectors.some((sel) => /data-theme="(Expressive|Productive)/.test(sel))));
});

test("mergeExtendedCollections maps Color System extended collections to data-color-system, with Dark composed with data-theme", () => {
  const workDir = mkdtempSync(join(tmpdir(), "orca-color-system-"));
  const outDir = join(workDir, ".tmp-tokens");
  const write = (file, data) => {
    const p = join(workDir, file);
    writeFileSync(p, JSON.stringify(data));
    return p;
  };
  const parentMeta = (collectionId, name, modes) => ({
    $extensions: { figmaSync: { collectionId, name, modes } },
    Schemes: { Primary: { Primary: { $type: "color", $value: "{Brand.Black}", $extensions: { mode: {} } } } }
  });
  const extMeta = (collectionId, parentCollectionId, name, modes) => ({
    $extensions: { figmaSync: { collectionId, parentCollectionId, name, defaultModeId: modes[0].modeId, modes } },
    Schemes: { Primary: { Primary: { $type: "color", $value: "{Brand.Toyota Red}" } } }
  });

  const parent = write(
    "color-system.json",
    parentMeta("cs", "Color System", [{ modeId: "light", name: "Light" }])
  );
  const corporate = write(
    "color-system-corporate.json",
    extMeta("corp", "cs", "Corporate", [
      { modeId: "corp-light", name: "Light" },
      { modeId: "corp-dark", name: "Dark" }
    ])
  );

  const { extendedModeSelectors } = mergeExtendedCollections([parent, corporate], outDir);
  const byMode = Object.fromEntries(extendedModeSelectors.map((s) => [s.mode, s.selectors]));

  // color-system 軸: Light（既定）は data-color-system 単独
  assert.deepEqual(byMode["Corporate-Light"], ['[data-color-system="corporate"]']);
  // Dark は data-color-system と data-theme の複合
  assert.deepEqual(byMode["Corporate-Dark"], ['[data-color-system="corporate"][data-theme="dark"]']);
});

test("mergeExtendedCollections slugifies Color System extended collection names for data-color-system", () => {
  const workDir = mkdtempSync(join(tmpdir(), "orca-color-system-slug-"));
  const outDir = join(workDir, ".tmp-tokens");
  const write = (file, data) => {
    const p = join(workDir, file);
    writeFileSync(p, JSON.stringify(data));
    return p;
  };
  const parentMeta = (collectionId, name, modes) => ({
    $extensions: { figmaSync: { collectionId, name, modes } },
    Schemes: { Primary: { Primary: { $type: "color", $value: "{Brand.Black}", $extensions: { mode: {} } } } }
  });
  const extMeta = (collectionId, parentCollectionId, name, modes) => ({
    $extensions: { figmaSync: { collectionId, parentCollectionId, name, defaultModeId: modes[0].modeId, modes } },
    Schemes: { Primary: { Primary: { $type: "color", $value: "{Brand.Deep Blue}" } } }
  });

  const parent = write(
    "color-system.json",
    parentMeta("cs", "Color System", [{ modeId: "light", name: "Light" }])
  );
  const deepBlue = write(
    "color-system-deep-blue.json",
    extMeta("db", "cs", "Deep Blue", [{ modeId: "db-light", name: "Light" }])
  );

  const { extendedModeSelectors } = mergeExtendedCollections([parent, deepBlue], outDir);
  const byMode = Object.fromEntries(extendedModeSelectors.map((s) => [s.mode, s.selectors]));

  assert.deepEqual(byMode["Deep Blue-Light"], ['[data-color-system="deep-blue"]']);
});

test("mergeExtendedCollections falls back to data-theme for unknown extended collections whose parent is not Color System", () => {
  const workDir = mkdtempSync(join(tmpdir(), "orca-unknown-parent-"));
  const outDir = join(workDir, ".tmp-tokens");
  const write = (file, data) => {
    const p = join(workDir, file);
    writeFileSync(p, JSON.stringify(data));
    return p;
  };
  const parentMeta = (collectionId, name, modes) => ({
    $extensions: { figmaSync: { collectionId, name, modes } },
    Sizing: { sm: { $type: "number", $value: 1, $extensions: { mode: {} } } }
  });
  const extMeta = (collectionId, parentCollectionId, name, modes) => ({
    $extensions: { figmaSync: { collectionId, parentCollectionId, name, defaultModeId: modes[0].modeId, modes } },
    Sizing: { sm: { $type: "number", $value: 2 } }
  });

  const parent = write(
    "mystery-system.json",
    parentMeta("ms", "Mystery System", [{ modeId: "light", name: "Light" }])
  );
  const extended = write(
    "mystery-system-special.json",
    extMeta("sp", "ms", "Special", [{ modeId: "sp-light", name: "Light" }])
  );

  const { extendedModeSelectors } = mergeExtendedCollections([parent, extended], outDir);
  const byMode = Object.fromEntries(extendedModeSelectors.map((s) => [s.mode, s.selectors]));

  assert.deepEqual(byMode["Special-Light"], ['[data-theme="Special-Light"]']);
});

// コレクション差し替え方式（2026-08 の Figma 再構成）: Expressive / Productive は
// 親情報（parentCollectionId）を持たない独立コレクションとして export される。
// 名前で Dimension System に畳み込み、従来どおり :root + data-density の CSS を維持する。
test("mergeExtendedCollections folds sibling density collections into Dimension System by name", () => {
  const workDir = mkdtempSync(join(tmpdir(), "orca-token-pipeline-"));
  const basePath = join(workDir, "dimension-system.json");
  const productivePath = join(workDir, "productive.json");
  const outDir = join(workDir, ".tmp-tokens");

  writeFileSync(
    basePath,
    JSON.stringify({
      $extensions: {
        figmaSync: {
          collectionId: "dimension-base",
          name: "Dimension System",
          modes: [{ modeId: "default", name: "Default" }]
        }
      },
      Sizing: {
        Radius: {
          xl: { $type: "number", $value: "{Sizing.lg}" }
        }
      }
    })
  );

  // 親情報なし・単一モードの独立コレクション（新方式の productive）
  writeFileSync(
    productivePath,
    JSON.stringify({
      $extensions: {
        figmaSync: {
          collectionId: "dimension-productive",
          name: "Productive",
          defaultModeId: "productive-default",
          modes: [{ modeId: "productive-default", name: "Default" }]
        }
      },
      Sizing: {
        Radius: {
          xl: { $type: "number", $value: "{Sizing.sm}" }
        }
      }
    })
  );

  const { outputPaths, extendedModeSelectors } = mergeExtendedCollections(
    [basePath, productivePath],
    outDir
  );

  // productive.json は独立ファイルとして出力されない（:root を上書きしない）
  assert.equal(outputPaths.length, 1);
  const merged = JSON.parse(readFileSync(outputPaths[0], "utf8"));

  // 値は Dimension System の追加モードとして畳み込まれる
  assert.equal(
    merged.Sizing.Radius.xl.$extensions.mode["Productive-Default"],
    "{Sizing.sm}"
  );
  assert.deepEqual(extendedModeSelectors, [
    {
      mode: "Productive-Default",
      selectors: ['[data-density="productive"]']
    }
  ]);
});

test("mergeExtendedCollections keeps unrelated parentless collections as independent files", () => {
  const workDir = mkdtempSync(join(tmpdir(), "orca-token-pipeline-"));
  const basePath = join(workDir, "dimension-system.json");
  const otherPath = join(workDir, "color-references.json");
  const outDir = join(workDir, ".tmp-tokens");

  const base = {
    $extensions: {
      figmaSync: { collectionId: "dimension-base", name: "Dimension System", modes: [] }
    }
  };
  const other = {
    $extensions: {
      figmaSync: { collectionId: "refs", name: "Color References", modes: [] }
    }
  };
  writeFileSync(basePath, JSON.stringify(base));
  writeFileSync(otherPath, JSON.stringify(other));

  const { outputPaths } = mergeExtendedCollections([basePath, otherPath], outDir);
  assert.equal(outputPaths.length, 2);
});

// パレット色（Yellow/300 等）の @theme 露出（issue #51）。
// アプリ固有の色をセマンティック化しない方針にしたため、パレットを直接
// text-yellow-300 のように使えるようにする。変数名はグループ名込みにして
// パレット間の衝突（--color-300 が Yellow と Red で潰し合う）を防ぐ。
test("tailwindThemeVariableName keeps the palette group in the variable name", () => {
  assert.equal(
    tailwindThemeVariableName("--color-300", { path: ["color"], token: { id: "Yellow.300" } }),
    "--color-yellow-300"
  );
  assert.equal(
    tailwindThemeVariableName("--color-400", { path: ["color"], token: { id: "Gray.400" } }),
    "--color-gray-400"
  );
  assert.equal(
    tailwindThemeVariableName("--color-500", { path: ["color"], token: { id: "Red.500" } }),
    "--color-red-500"
  );
});
