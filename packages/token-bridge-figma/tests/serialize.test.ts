import test from "node:test";
import assert from "node:assert/strict";

import { parseRepoFilesToSyncDocument } from "../src/core/parse.js";
import { serializeFigmaSnapshotToSyncDocument, serializeSyncDocumentToRepoFiles } from "../src/core/serialize.js";
import type { FigmaSyncSnapshot } from "../src/core/types.js";

test("serializeFigmaSnapshotToSyncDocument serializes variables and styles with hashes and metadata", () => {
  const snapshot: FigmaSyncSnapshot = {
    variables: {
      collections: [
        {
          id: "VariableCollectionId:1:1",
          name: "Semantic",
          defaultModeId: "1:0",
          modes: [
            { modeId: "1:0", name: "Light" },
            { modeId: "1:1", name: "Dark" }
          ]
        }
      ],
      variables: [
        {
          id: "VariableID:1:2",
          collectionId: "VariableCollectionId:1:1",
          name: "color/text/primary",
          resolvedType: "COLOR",
          description: "Primary text",
          valuesByMode: {
            "1:0": { hex: "#ffffffff" },
            "1:1": { alias: "VariableID:1:3" }
          },
          syncMetadata: { syncedHash: "older-hash", managed: true }
        },
        {
          id: "VariableID:1:3",
          collectionId: "VariableCollectionId:1:1",
          name: "color/text/inverse",
          resolvedType: "COLOR",
          description: "",
          valuesByMode: {
            "1:0": { hex: "#000000ff" },
            "1:1": { hex: "#1a1a1aff" }
          }
        }
      ]
    },
    styles: {
      paint: [
        {
          id: "Style:1:4",
          name: "fill/brand",
          description: "Brand fill",
          paints: [{ type: "SOLID", color: { r: 1, g: 0, b: 0 }, opacity: 1 } as SolidPaint],
          boundVariables: { color: "VariableID:1:2" },
          syncMetadata: { syncedHash: "paint-old", managed: true }
        }
      ],
      text: [
        {
          id: "Style:1:5",
          name: "body/md",
          description: "",
          fontName: { family: "Inter", style: "Regular" },
          fontSize: 16,
          lineHeight: { unit: "PIXELS", value: 24 },
          letterSpacing: { unit: "PIXELS", value: 0 },
          paragraphSpacing: 0,
          paragraphIndent: 0,
          textCase: "ORIGINAL",
          textDecoration: "NONE",
          boundVariables: { fontSize: "VariableID:1:6" }
        }
      ],
      effect: [
        {
          id: "Style:1:6",
          name: "shadow/sm",
          description: "",
          effects: [
            {
              type: "DROP_SHADOW",
              color: { r: 0, g: 0, b: 0, a: 0.2 },
              offset: { x: 0, y: 2 },
              radius: 4,
              spread: 0,
              visible: true,
              blendMode: "NORMAL"
            } as DropShadowEffect
          ],
          boundVariables: {}
        }
      ],
      grid: [
        {
          id: "Style:1:7",
          name: "grid/cols",
          description: "",
          layoutGrids: [
            {
              pattern: "COLUMNS",
              alignment: "MIN",
              gutterSize: 24,
              sectionSize: 80,
              count: 12,
              visible: true,
              offset: 0
            } as LayoutGrid
          ],
          boundVariables: {}
        }
      ]
    }
  };

  const document = serializeFigmaSnapshotToSyncDocument(snapshot);
  assert.equal(document.variables.length, 1);
  assert.equal(document.variables[0]?.tokens.length, 2);
  assert.equal(document.styles.paint.length, 1);
  assert.equal(document.styles.text.length, 1);
  assert.equal(document.styles.effect.length, 1);
  assert.equal(document.styles.grid.length, 1);
  assert.match(document.variables[0]!.tokens[0]!.extensions.figmaSync.updatedHash, /^[a-f0-9]{64}$/);
  assert.equal(document.variables[0]!.tokens[0]!.extensions.figmaSync.syncedHash, "older-hash");
  assert.equal(document.styles.paint[0]!.extensions.figmaSync.syncedHash, "paint-old");

  const repoFiles = serializeSyncDocumentToRepoFiles(document, "tokens");
  assert.deepEqual(Object.keys(repoFiles).sort(), [
    "tokens/styles/effect.json",
    "tokens/styles/grid.json",
    "tokens/styles/paint.json",
    "tokens/styles/text.json",
    "tokens/variables/semantic.json"
  ]);

  const parsed = parseRepoFilesToSyncDocument(repoFiles);
  assert.equal(parsed.variables[0]!.tokens[0]!.path.join("/"), "color/text/primary");
  assert.equal(parsed.styles.paint[0]!.path.join("/"), "fill/brand");
  assert.deepEqual(parsed.variables[0]!.tokens[0]!.extensions.figmaSync.modeValues["1:1"], { alias: "VariableID:1:3" });
});

test("serializeSyncDocumentToRepoFiles outputs DTCG-compatible format with $extensions.mode", () => {
  const snapshot: FigmaSyncSnapshot = {
    variables: {
      collections: [
        {
          id: "col-1",
          name: "Theme",
          defaultModeId: "m-light",
          modes: [
            { modeId: "m-light", name: "Light" },
            { modeId: "m-dark", name: "Dark" }
          ]
        }
      ],
      variables: [
        {
          id: "var-1",
          collectionId: "col-1",
          name: "color/primary",
          resolvedType: "COLOR",
          description: "Primary color",
          valuesByMode: {
            "m-light": { hex: "#111111ff" },
            "m-dark": { hex: "#eeeeeeff" }
          }
        },
        {
          id: "var-2",
          collectionId: "col-1",
          name: "color/accent",
          resolvedType: "COLOR",
          description: "",
          valuesByMode: {
            "m-light": { alias: "var-1" },
            "m-dark": { hex: "#ff0000ff" }
          }
        }
      ]
    },
    styles: { paint: [], text: [], effect: [], grid: [] }
  };

  const document = serializeFigmaSnapshotToSyncDocument(snapshot);
  const repoFiles = serializeSyncDocumentToRepoFiles(document, "tokens");
  const json = JSON.parse(repoFiles["tokens/variables/theme.json"]!);

  // $value should be the default mode's scalar value, not a mode-indexed dict
  assert.equal(json.color.primary.$value, "#111111ff");
  assert.equal(json.color.accent.$value, "{color.primary}");

  // $extensions.mode should have mode names as keys
  assert.deepEqual(json.color.primary.$extensions.mode, {
    Light: "#111111ff",
    Dark: "#eeeeeeff"
  });
  assert.deepEqual(json.color.accent.$extensions.mode, {
    Light: "{color.primary}",
    Dark: "#ff0000ff"
  });

  // figmaSync.modeValues should still use mode IDs
  assert.deepEqual(json.color.primary.$extensions.figmaSync.modeValues["m-light"], { hex: "#111111ff" });
  assert.deepEqual(json.color.accent.$extensions.figmaSync.modeValues["m-light"], { alias: "var-1" });
});

test("serializeSyncDocumentToRepoFiles omits $extensions.mode for single-mode collections", () => {
  const snapshot: FigmaSyncSnapshot = {
    variables: {
      collections: [
        {
          id: "col-1",
          name: "Base",
          defaultModeId: "m-default",
          modes: [{ modeId: "m-default", name: "Default" }]
        }
      ],
      variables: [
        {
          id: "var-1",
          collectionId: "col-1",
          name: "spacing/sm",
          resolvedType: "FLOAT",
          description: "",
          valuesByMode: { "m-default": 8 }
        }
      ]
    },
    styles: { paint: [], text: [], effect: [], grid: [] }
  };

  const document = serializeFigmaSnapshotToSyncDocument(snapshot);
  const repoFiles = serializeSyncDocumentToRepoFiles(document, "tokens");
  const json = JSON.parse(repoFiles["tokens/variables/base.json"]!);

  // $value should be the scalar value
  assert.equal(json.spacing.sm.$value, 8);
  // $extensions.mode should be absent for single-mode
  assert.equal(json.spacing.sm.$extensions.mode, undefined);
});

test("serializeFigmaSnapshotToSyncDocument handles Extended Collections (variables shared across parent and child)", () => {
  // In Figma, an Extended Collection shares the same variables as its parent.
  // Each variable's collectionId points to the PARENT collection, but
  // its valuesByMode includes mode entries from BOTH parent and extended collections.
  // The extended collection has its own distinct mode IDs.
  const snapshot: FigmaSyncSnapshot = {
    variables: {
      collections: [
        {
          id: "col-core",
          name: "core",
          defaultModeId: "m-light",
          modes: [
            { modeId: "m-light", name: "light" },
            { modeId: "m-dark", name: "dark" }
          ]
        },
        {
          id: "col-red",
          name: "red",
          defaultModeId: "m-red-light",
          modes: [
            { modeId: "m-red-light", name: "light" },
            { modeId: "m-red-dark", name: "dark" }
          ]
        }
      ],
      variables: [
        {
          id: "var-1",
          collectionId: "col-core",  // Points to PARENT, not extended
          name: "color/text/primary",
          resolvedType: "COLOR",
          description: "Primary text color",
          valuesByMode: {
            "m-light": { hex: "#000000ff" },
            "m-dark": { hex: "#ffffffff" },
            "m-red-light": { hex: "#ff0000ff" },
            "m-red-dark": { hex: "#ffccccff" }
          }
        },
        {
          id: "var-2",
          collectionId: "col-core",
          name: "color/text/secondary",
          resolvedType: "COLOR",
          description: "",
          valuesByMode: {
            "m-light": { hex: "#3f3f3fff" },
            "m-dark": { hex: "#b8b8b8ff" },
            "m-red-light": { hex: "#cc0000ff" },
            "m-red-dark": { hex: "#ff9999ff" }
          }
        }
      ]
    },
    styles: { paint: [], text: [], effect: [], grid: [] }
  };

  const document = serializeFigmaSnapshotToSyncDocument(snapshot);

  // Parent collection should have its tokens
  const coreCollection = document.variables.find((c) => c.name === "core");
  assert.ok(coreCollection, "core collection should exist");
  assert.equal(coreCollection.tokens.length, 2, "core should have 2 tokens");

  // Extended collection should ALSO have its tokens (not be empty)
  const redCollection = document.variables.find((c) => c.name === "red");
  assert.ok(redCollection, "red collection should exist");
  assert.equal(redCollection.tokens.length, 2, "red should have 2 tokens");

  // Core tokens should only have core's mode values
  const corePrimary = coreCollection.tokens.find((t) => t.name === "color/text/primary")!;
  assert.deepEqual(Object.keys(corePrimary.value).sort(), ["m-dark", "m-light"]);

  // Red tokens should only have red's mode values
  const redPrimary = redCollection.tokens.find((t) => t.name === "color/text/primary")!;
  assert.deepEqual(Object.keys(redPrimary.value).sort(), ["m-red-dark", "m-red-light"]);

  // Verify the actual values are correct
  assert.deepEqual(redPrimary.value["m-red-light"], "#ff0000ff");
  assert.deepEqual(redPrimary.value["m-red-dark"], "#ffccccff");

  // Verify repo files are generated correctly for both collections
  const repoFiles = serializeSyncDocumentToRepoFiles(document, "tokens");
  assert.ok(repoFiles["tokens/variables/core.json"], "core.json should be generated");
  assert.ok(repoFiles["tokens/variables/red.json"], "red.json should be generated");

  const redJson = JSON.parse(repoFiles["tokens/variables/red.json"]!);
  assert.equal(redJson.color.text.primary.$value, "#ff0000ff");
  assert.deepEqual(redJson.color.text.primary.$extensions.mode, {
    light: "#ff0000ff",
    dark: "#ffccccff"
  });
});

test("serializeFigmaSnapshotToSyncDocument handles separate snapshot entries for extended collections (figma.ts real output)", () => {
  // figma.ts creates SEPARATE snapshot variable entries for extended collections,
  // each with collectionId pointing to the extended collection (not the parent).
  // This mimics the real output of readLocalSyncDocument.
  const snapshot: FigmaSyncSnapshot = {
    variables: {
      collections: [
        {
          id: "col-core",
          name: "core",
          defaultModeId: "m-light",
          modes: [
            { modeId: "m-light", name: "light" },
            { modeId: "m-dark", name: "dark" }
          ]
        },
        {
          id: "col-red",
          name: "red",
          defaultModeId: "m-red-light",
          modes: [
            { modeId: "m-red-light", name: "light" },
            { modeId: "m-red-dark", name: "dark" }
          ],
          parentCollectionId: "col-core"
        }
      ],
      variables: [
        // Parent collection variables — managed and synced
        {
          id: "var-1",
          collectionId: "col-core",
          name: "color/text/primary",
          resolvedType: "COLOR",
          description: "Primary text color",
          valuesByMode: {
            "m-light": { hex: "#000000ff" },
            "m-dark": { hex: "#ffffffff" }
          },
          syncMetadata: { managed: true, syncedHash: "core-synced" }
        },
        {
          id: "var-2",
          collectionId: "col-core",
          name: "color/text/secondary",
          resolvedType: "COLOR",
          description: "",
          valuesByMode: {
            "m-light": { hex: "#3f3f3fff" },
            "m-dark": { hex: "#b8b8b8ff" }
          },
          syncMetadata: { managed: true, syncedHash: "core-synced-2" }
        },
        // Extended collection variables — fresh metadata (not inherited from parent)
        {
          id: "var-1",
          collectionId: "col-red",
          name: "color/text/primary",
          resolvedType: "COLOR",
          description: "Primary text color",
          valuesByMode: {
            "m-red-light": { hex: "#ff0000ff" },
            "m-red-dark": { hex: "#ffccccff" }
          }
          // No syncMetadata — extended tokens are tracked independently
        },
        {
          id: "var-2",
          collectionId: "col-red",
          name: "color/text/secondary",
          resolvedType: "COLOR",
          description: "",
          valuesByMode: {
            "m-red-light": { hex: "#cc0000ff" },
            "m-red-dark": { hex: "#ff9999ff" }
          }
        }
      ]
    },
    styles: { paint: [], text: [], effect: [], grid: [] }
  };

  const document = serializeFigmaSnapshotToSyncDocument(snapshot);

  // Both collections should have tokens
  const coreCollection = document.variables.find((c) => c.name === "core");
  assert.ok(coreCollection, "core collection should exist");
  assert.equal(coreCollection.tokens.length, 2, "core should have 2 tokens");

  const redCollection = document.variables.find((c) => c.name === "red");
  assert.ok(redCollection, "red collection should exist");
  assert.equal(redCollection.tokens.length, 2, "red should have 2 tokens");

  // Red tokens should have correct values
  const redPrimary = redCollection.tokens.find((t) => t.name === "color/text/primary")!;
  assert.deepEqual(redPrimary.value, {
    "m-red-light": "#ff0000ff",
    "m-red-dark": "#ffccccff"
  });

  // Red tokens should have extended collectionId
  assert.equal(redPrimary.extensions.figmaSync.collectionId, "col-red");

  // Red collection should have parentCollectionId in its metadata
  assert.equal(redCollection.extensions.figmaSync.parentCollectionId, "col-core");
  // Core collection should NOT have parentCollectionId
  assert.equal(coreCollection.extensions.figmaSync.parentCollectionId, undefined);

  // Parent tokens should retain managed: true from syncMetadata
  const corePrimary = coreCollection.tokens.find((t) => t.name === "color/text/primary")!;
  assert.equal(corePrimary.extensions.figmaSync.managed, true, "parent token should be managed");

  // Extended tokens should NOT inherit parent's managed flag
  assert.equal(redPrimary.extensions.figmaSync.managed, false, "extended token should not be managed");

  // Verify repo files include token data (not just metadata)
  const repoFiles = serializeSyncDocumentToRepoFiles(document, "tokens");
  const redJson = JSON.parse(repoFiles["tokens/variables/red.json"]!);
  assert.equal(redJson.color.text.primary.$value, "#ff0000ff");
  assert.deepEqual(redJson.color.text.primary.$extensions.mode, {
    light: "#ff0000ff",
    dark: "#ffccccff"
  });
  assert.equal(redJson.color.text.secondary.$value, "#cc0000ff");
});

test("serializeSyncDocumentToRepoFiles disambiguates extended collections that share a name", () => {
  const mk = (id: string, name: string, parentCollectionId: string | undefined, modeId: string) => ({
    id,
    name,
    defaultModeId: modeId,
    modes: [{ modeId, name: "Default" }],
    ...(parentCollectionId ? { parentCollectionId } : {})
  });
  const mkVar = (id: string, collectionId: string, modeId: string) => ({
    id: `${id}-var`,
    collectionId,
    name: "Sizing/Component/Full/sm",
    resolvedType: "FLOAT" as const,
    description: "",
    valuesByMode: { [modeId]: 40 } as Record<string, number>
  });

  const snapshot: FigmaSyncSnapshot = {
    variables: {
      collections: [
        mk("dim-sys", "Dimension System", undefined, "d"),
        mk("typ-sys", "Typography System", undefined, "t"),
        mk("color-sys", "Color System", undefined, "c"),
        mk("ext-dim-expr", "Expressive", "dim-sys", "de"),
        mk("ext-typ-expr", "Expressive", "typ-sys", "te"),
        mk("ext-color-corp", "Corporate", "color-sys", "cc")
      ],
      variables: [
        mkVar("dim-sys", "dim-sys", "d"),
        mkVar("typ-sys", "typ-sys", "t"),
        mkVar("color-sys", "color-sys", "c"),
        mkVar("ext-dim-expr", "ext-dim-expr", "de"),
        mkVar("ext-typ-expr", "ext-typ-expr", "te"),
        mkVar("ext-color-corp", "ext-color-corp", "cc")
      ]
    },
    styles: { paint: [], text: [], effect: [], grid: [] }
  };

  const document = serializeFigmaSnapshotToSyncDocument(snapshot);
  const repoFiles = serializeSyncDocumentToRepoFiles(document, "tokens");
  const keys = Object.keys(repoFiles);

  // 同名 "Expressive" が親違いで衝突 → 親名で前置して一意化（後勝ちで消えない）
  assert.ok(keys.includes("tokens/variables/dimension-system-expressive.json"), keys.join(","));
  assert.ok(keys.includes("tokens/variables/typography-system-expressive.json"), keys.join(","));
  assert.ok(!keys.includes("tokens/variables/expressive.json"), keys.join(","));
  // 衝突しない extended（Corporate）は据え置き
  assert.ok(keys.includes("tokens/variables/corporate.json"), keys.join(","));
  // 親コレクションは通常名
  assert.ok(keys.includes("tokens/variables/dimension-system.json"), keys.join(","));
  assert.ok(keys.includes("tokens/variables/typography-system.json"), keys.join(","));
});

test("serializeFigmaSnapshotToSyncDocument warns when an extension collection has no parentCollectionId (#26)", () => {
  const snapshot: FigmaSyncSnapshot = {
    variables: {
      collections: [
        {
          id: "col-corporate",
          name: "Corporate",
          defaultModeId: "m-light",
          modes: [{ modeId: "m-light", name: "light" }],
          isExtension: true
          // parentCollectionId が取得できなかったケース
        }
      ],
      variables: [
        {
          id: "var-1",
          collectionId: "col-corporate",
          name: "Brand/Primary",
          resolvedType: "COLOR",
          description: "",
          valuesByMode: { "m-light": { hex: "#eb0a1eff" } }
        }
      ]
    },
    styles: { paint: [], text: [], effect: [], grid: [] }
  };

  const document = serializeFigmaSnapshotToSyncDocument(snapshot);

  assert.equal(document.warnings.length, 1);
  assert.equal(document.warnings[0]!.kind, "sync-error");
  assert.equal(document.warnings[0]!.name, "Corporate");
  assert.match(document.warnings[0]!.reason, /parentCollectionId/);

  // 独立コレクションとして黙って出力しない: repo ファイルからは除外される
  const files = serializeSyncDocumentToRepoFiles(document, "tokens");
  const variableFiles = Object.keys(files).filter((path) => path.includes("/variables/"));
  assert.deepEqual(variableFiles, []);
});

test("serializeFigmaSnapshotToSyncDocument keeps extension collections with parentCollectionId out of the warning path (#26)", () => {
  const snapshot: FigmaSyncSnapshot = {
    variables: {
      collections: [
        {
          id: "col-core",
          name: "core",
          defaultModeId: "m-light",
          modes: [{ modeId: "m-light", name: "light" }]
        },
        {
          id: "col-corporate",
          name: "Corporate",
          defaultModeId: "m-c-light",
          modes: [{ modeId: "m-c-light", name: "light" }],
          isExtension: true,
          parentCollectionId: "col-core"
        }
      ],
      variables: [
        {
          id: "var-1",
          collectionId: "col-core",
          name: "Brand/Primary",
          resolvedType: "COLOR",
          description: "",
          valuesByMode: { "m-light": { hex: "#000000ff" } }
        },
        {
          id: "var-1",
          collectionId: "col-corporate",
          name: "Brand/Primary",
          resolvedType: "COLOR",
          description: "",
          valuesByMode: { "m-c-light": { hex: "#eb0a1eff" } }
        }
      ]
    },
    styles: { paint: [], text: [], effect: [], grid: [] }
  };

  const document = serializeFigmaSnapshotToSyncDocument(snapshot);
  assert.equal(document.warnings.length, 0);

  const files = serializeSyncDocumentToRepoFiles(document, "tokens");
  const variableFiles = Object.keys(files).filter((path) => path.includes("/variables/"));
  assert.deepEqual(variableFiles.sort(), ["tokens/variables/core.json", "tokens/variables/corporate.json"]);
  const corporate = JSON.parse(files["tokens/variables/corporate.json"]!) as {
    $extensions: { figmaSync: { parentCollectionId?: string } };
  };
  assert.equal(corporate.$extensions.figmaSync.parentCollectionId, "col-core");
});
