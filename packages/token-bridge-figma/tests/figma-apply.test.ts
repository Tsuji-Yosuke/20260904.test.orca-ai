import test from "node:test";
import assert from "node:assert/strict";

import { applySyncDocumentToFigma, readLocalSyncDocument } from "../src/plugin/figma.js";
import type { SyncDocument } from "../src/core/types.js";

function createPluginDataMixin() {
  const store = new Map<string, string>();

  return {
    getPluginData(key: string) {
      return store.get(key) ?? "";
    },
    setPluginData(key: string, value: string) {
      store.set(key, value);
    }
  };
}

test("applySyncDocumentToFigma does not auto-delete managed variables missing from import", async () => {
  const collectionData = createPluginDataMixin();
  collectionData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "collection-1", managed: true })
  );

  let variableRemoved = false;
  const variableData = createPluginDataMixin();
  variableData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "var-1", managed: true })
  );

  const collection = {
    id: "actual-collection-1",
    name: "Core",
    defaultModeId: "mode-1",
    modes: [{ modeId: "mode-1", name: "Default" }],
    variableIds: ["actual-var-1"],
    addMode() {},
    renameMode() {},
    removeMode() {},
    remove() {
      throw new Error("collection should not be removed");
    },
    ...collectionData
  } as unknown as VariableCollection;

  const variable = {
    id: "actual-var-1",
    name: "color/text/primary",
    description: "",
    remove() {
      variableRemoved = true;
    },
    ...variableData
  } as unknown as Variable;

  const figmaMock = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getVariableByIdAsync: async (id: string) => (id === "actual-var-1" ? variable : null)
    },
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => []
  };

  const originalFigma = (globalThis as typeof globalThis & { figma?: unknown }).figma;
  Reflect.set(globalThis, "figma", figmaMock);

  const document: SyncDocument = {
    variables: [
      {
        id: "collection-1",
        name: "Core",
        defaultModeId: "mode-1",
        modes: [{ modeId: "mode-1", name: "Default" }],
        extensions: {
          figmaSync: {
            collectionId: "collection-1",
            defaultModeId: "mode-1",
            modes: [{ modeId: "mode-1", name: "Default" }],
            updatedHash: "collection-hash",
            syncedHash: "collection-hash",
            managed: true
          }
        },
        tokens: []
      }
    ],
    styles: {
      paint: [],
      text: [],
      effect: [],
      grid: []
    },
    warnings: []
  };

  try {
    await applySyncDocumentToFigma(document);
    assert.equal(variableRemoved, false);
  } finally {
    Reflect.set(globalThis, "figma", originalFigma);
  }
});

test("applySyncDocumentToFigma does not auto-delete extra modes", async () => {
  const collectionData = createPluginDataMixin();
  collectionData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "collection-1", managed: true })
  );

  let removedModeId: string | null = null;
  const collection = {
    id: "actual-collection-1",
    name: "Core",
    defaultModeId: "mode-1",
    modes: [
      { modeId: "mode-1", name: "Default" },
      { modeId: "mode-2", name: "Dark" }
    ],
    variableIds: [],
    addMode() {},
    renameMode() {},
    removeMode(modeId: string) {
      removedModeId = modeId;
    },
    remove() {
      throw new Error("collection should not be removed");
    },
    ...collectionData
  } as unknown as VariableCollection;

  const figmaMock = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getVariableByIdAsync: async () => null
    },
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => []
  };

  const originalFigma = (globalThis as typeof globalThis & { figma?: unknown }).figma;
  Reflect.set(globalThis, "figma", figmaMock);

  const document: SyncDocument = {
    variables: [
      {
        id: "collection-1",
        name: "Core",
        defaultModeId: "mode-1",
        modes: [{ modeId: "mode-1", name: "Default" }],
        extensions: {
          figmaSync: {
            collectionId: "collection-1",
            defaultModeId: "mode-1",
            modes: [{ modeId: "mode-1", name: "Default" }],
            updatedHash: "collection-hash",
            syncedHash: "collection-hash",
            managed: true
          }
        },
        tokens: []
      }
    ],
    styles: {
      paint: [],
      text: [],
      effect: [],
      grid: []
    },
    warnings: []
  };

  try {
    await applySyncDocumentToFigma(document);
    assert.equal(removedModeId, null);
  } finally {
    Reflect.set(globalThis, "figma", originalFigma);
  }
});

test("applySyncDocumentToFigma deletes explicitly selected managed variables", async () => {
  const collectionData = createPluginDataMixin();
  collectionData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "collection-1", managed: true })
  );

  let variableRemoved = false;
  const variableData = createPluginDataMixin();
  variableData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "var-1", managed: true })
  );

  const variable = {
    id: "actual-var-1",
    name: "color/text/primary",
    description: "",
    remove() {
      variableRemoved = true;
    },
    ...variableData
  } as unknown as Variable;

  const collection = {
    id: "actual-collection-1",
    name: "Core",
    defaultModeId: "mode-1",
    modes: [{ modeId: "mode-1", name: "Default" }],
    variableIds: ["actual-var-1"],
    addMode() {},
    renameMode() {},
    removeMode() {},
    remove() {},
    ...collectionData
  } as unknown as VariableCollection;

  const figmaMock = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getVariableByIdAsync: async (id: string) => (id === "actual-var-1" ? variable : null)
    },
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => []
  };

  const originalFigma = (globalThis as typeof globalThis & { figma?: unknown }).figma;
  Reflect.set(globalThis, "figma", figmaMock);

  const document: SyncDocument = {
    variables: [],
    styles: {
      paint: [],
      text: [],
      effect: [],
      grid: []
    },
    warnings: []
  };

  try {
    await applySyncDocumentToFigma(document, { deleteVariableIds: ["var-1"] });
    assert.equal(variableRemoved, true);
  } finally {
    Reflect.set(globalThis, "figma", originalFigma);
  }
});

test("applySyncDocumentToFigma maps modes by stored source ids instead of array position", async () => {
  const collectionData = createPluginDataMixin();
  collectionData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({
      sourceId: "collection-1",
      managed: true,
      modeIdMap: {
        light: "actual-light",
        dark: "actual-dark"
      }
    })
  );

  const assignments: Array<{ modeId: string; value: VariableValue }> = [];
  const variableData = createPluginDataMixin();
  const variable = {
    id: "actual-var-1",
    name: "color/text/primary",
    description: "",
    setValueForMode(modeId: string, value: VariableValue) {
      assignments.push({ modeId, value });
    },
    remove() {},
    ...variableData
  } as unknown as Variable;

  const collection = {
    id: "actual-collection-1",
    name: "Core",
    defaultModeId: "actual-light",
    modes: [
      { modeId: "actual-dark", name: "Dark" },
      { modeId: "actual-light", name: "Light" }
    ],
    variableIds: ["actual-var-1"],
    addMode() {},
    renameMode() {},
    removeMode() {},
    remove() {},
    ...collectionData
  } as unknown as VariableCollection;

  const figmaMock = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getVariableByIdAsync: async (id: string) => (id === "actual-var-1" ? variable : null),
      createVariableAlias: (aliased: Variable) => ({ type: "VARIABLE_ALIAS", id: aliased.id })
    },
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => []
  };

  const originalFigma = (globalThis as typeof globalThis & { figma?: unknown }).figma;
  Reflect.set(globalThis, "figma", figmaMock);

  const document: SyncDocument = {
    variables: [
      {
        id: "collection-1",
        name: "Core",
        defaultModeId: "light",
        modes: [
          { modeId: "light", name: "Light" },
          { modeId: "dark", name: "Dark" }
        ],
        extensions: {
          figmaSync: {
            collectionId: "collection-1",
            defaultModeId: "light",
            modes: [
              { modeId: "light", name: "Light" },
              { modeId: "dark", name: "Dark" }
            ],
            updatedHash: "collection-hash",
            syncedHash: "collection-hash",
            managed: true
          }
        },
        tokens: [
          {
            id: "var-1",
            name: "color/text/primary",
            path: ["color", "text", "primary"],
            type: "color",
            description: "",
            value: {},
            extensions: {
              figmaSync: {
                variableId: "var-1",
                collectionId: "collection-1",
                modeValues: {
                  light: { hex: "#ffffffff" },
                  dark: { hex: "#000000ff" }
                },
                updatedHash: "var-hash",
                syncedHash: "var-hash",
                managed: true
              }
            }
          }
        ]
      }
    ],
    styles: {
      paint: [],
      text: [],
      effect: [],
      grid: []
    },
    warnings: []
  };

  try {
    await applySyncDocumentToFigma(document);
    assert.deepEqual(
      assignments.map((entry) => entry.modeId),
      ["actual-light", "actual-dark"]
    );
  } finally {
    Reflect.set(globalThis, "figma", originalFigma);
  }
});

test("applySyncDocumentToFigma skips cyclic aliases and reports a warning", async () => {
  const collectionData = createPluginDataMixin();
  collectionData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({
      sourceId: "collection-1",
      managed: true,
      modeIdMap: {
        light: "actual-light"
      }
    })
  );

  let assignmentCount = 0;
  const firstVariableData = createPluginDataMixin();
  const secondVariableData = createPluginDataMixin();
  const firstVariable = {
    id: "actual-var-1",
    name: "color/one",
    description: "",
    setValueForMode() {
      assignmentCount += 1;
    },
    remove() {},
    ...firstVariableData
  } as unknown as Variable;
  const secondVariable = {
    id: "actual-var-2",
    name: "color/two",
    description: "",
    setValueForMode() {
      assignmentCount += 1;
    },
    remove() {},
    ...secondVariableData
  } as unknown as Variable;

  const collection = {
    id: "actual-collection-1",
    name: "Core",
    defaultModeId: "actual-light",
    modes: [{ modeId: "actual-light", name: "Light" }],
    variableIds: ["actual-var-1", "actual-var-2"],
    addMode() {},
    renameMode() {},
    removeMode() {},
    remove() {},
    ...collectionData
  } as unknown as VariableCollection;

  const figmaMock = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getVariableByIdAsync: async (id: string) => {
        if (id === "actual-var-1") {
          return firstVariable;
        }
        if (id === "actual-var-2") {
          return secondVariable;
        }
        return null;
      },
      createVariableAlias: (aliased: Variable) => ({ type: "VARIABLE_ALIAS", id: aliased.id })
    },
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => []
  };

  const originalFigma = (globalThis as typeof globalThis & { figma?: unknown }).figma;
  Reflect.set(globalThis, "figma", figmaMock);

  const document: SyncDocument = {
    variables: [
      {
        id: "collection-1",
        name: "Core",
        defaultModeId: "light",
        modes: [{ modeId: "light", name: "Light" }],
        extensions: {
          figmaSync: {
            collectionId: "collection-1",
            defaultModeId: "light",
            modes: [{ modeId: "light", name: "Light" }],
            updatedHash: "collection-hash",
            syncedHash: "collection-hash",
            managed: true
          }
        },
        tokens: [
          {
            id: "var-1",
            name: "color/one",
            path: ["color", "one"],
            type: "color",
            description: "",
            value: {},
            extensions: {
              figmaSync: {
                variableId: "var-1",
                collectionId: "collection-1",
                modeValues: { light: { alias: "var-2" } },
                updatedHash: "var-1",
                syncedHash: "base",
                managed: true
              }
            }
          },
          {
            id: "var-2",
            name: "color/two",
            path: ["color", "two"],
            type: "color",
            description: "",
            value: {},
            extensions: {
              figmaSync: {
                variableId: "var-2",
                collectionId: "collection-1",
                modeValues: { light: { alias: "var-1" } },
                updatedHash: "var-2",
                syncedHash: "base",
                managed: true
              }
            }
          }
        ]
      }
    ],
    styles: {
      paint: [],
      text: [],
      effect: [],
      grid: []
    },
    warnings: []
  };

  try {
    const warnings = await applySyncDocumentToFigma(document);
    assert.equal(assignmentCount, 0);
    assert.match(warnings[0]?.reason ?? "", /cycle/i);
  } finally {
    Reflect.set(globalThis, "figma", originalFigma);
  }
});

test("applySyncDocumentToFigma warns when a collection default mode cannot be changed", async () => {
  const collectionData = createPluginDataMixin();
  collectionData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({
      sourceId: "collection-1",
      managed: true,
      modeIdMap: {
        light: "actual-light",
        dark: "actual-dark"
      }
    })
  );

  const collection = {
    id: "actual-collection-1",
    name: "Core",
    defaultModeId: "actual-light",
    modes: [
      { modeId: "actual-light", name: "Light" },
      { modeId: "actual-dark", name: "Dark" }
    ],
    variableIds: [],
    addMode() {},
    renameMode() {},
    removeMode() {},
    remove() {},
    ...collectionData
  } as unknown as VariableCollection;

  const figmaMock = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getVariableByIdAsync: async () => null
    },
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => []
  };

  const originalFigma = (globalThis as typeof globalThis & { figma?: unknown }).figma;
  Reflect.set(globalThis, "figma", figmaMock);

  const document: SyncDocument = {
    variables: [
      {
        id: "collection-1",
        name: "Core",
        defaultModeId: "dark",
        modes: [
          { modeId: "light", name: "Light" },
          { modeId: "dark", name: "Dark" }
        ],
        extensions: {
          figmaSync: {
            collectionId: "collection-1",
            defaultModeId: "dark",
            modes: [
              { modeId: "light", name: "Light" },
              { modeId: "dark", name: "Dark" }
            ],
            updatedHash: "collection-hash",
            syncedHash: "collection-base",
            managed: true
          }
        },
        tokens: []
      }
    ],
    styles: {
      paint: [],
      text: [],
      effect: [],
      grid: []
    },
    warnings: []
  };

  try {
    const warnings = await applySyncDocumentToFigma(document);
    assert.match(warnings[0]?.reason ?? "", /default mode/i);
  } finally {
    Reflect.set(globalThis, "figma", originalFigma);
  }
});

test("readLocalSyncDocument normalizes variable mode ids using stored collection mappings", async () => {
  const collectionData = createPluginDataMixin();
  collectionData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({
      sourceId: "collection-1",
      managed: true,
      modeIdMap: {
        light: "actual-light",
        dark: "actual-dark"
      }
    })
  );

  const variableData = createPluginDataMixin();
  variableData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "var-1", managed: true })
  );

  const collection = {
    id: "actual-collection-1",
    name: "Core",
    defaultModeId: "actual-light",
    modes: [
      { modeId: "actual-light", name: "Light" },
      { modeId: "actual-dark", name: "Dark" }
    ],
    variableIds: ["actual-var-1"],
    remote: false,
    addMode() {},
    renameMode() {},
    removeMode() {},
    remove() {},
    ...collectionData
  } as unknown as VariableCollection;

  const variable = {
    id: "actual-var-1",
    name: "color/text/primary",
    resolvedType: "COLOR",
    description: "",
    variableCollectionId: "actual-collection-1",
    valuesByMode: {
      "actual-light": { r: 1, g: 1, b: 1, a: 1 },
      "actual-dark": { r: 0, g: 0, b: 0, a: 1 }
    },
    remote: false,
    ...variableData
  } as unknown as Variable;

  const figmaMock = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getLocalVariablesAsync: async () => [variable]
    },
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => []
  };

  const originalFigma = (globalThis as typeof globalThis & { figma?: unknown }).figma;
  Reflect.set(globalThis, "figma", figmaMock);

  try {
    const document = await readLocalSyncDocument();
    assert.deepEqual(Object.keys(document.variables[0]!.tokens[0]!.extensions.figmaSync.modeValues), ["light", "dark"]);
  } finally {
    Reflect.set(globalThis, "figma", originalFigma);
  }
});

// #26: parentVariableCollectionId が API から読めない場合、前回 scan で
// pluginData に永続化した値へフォールバックする
test("readLocalSyncDocument falls back to stored parentCollectionId when the API property is missing (#26)", async () => {
  const parentData = createPluginDataMixin();
  parentData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "collection-core" })
  );
  const extData = createPluginDataMixin();
  extData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "collection-corporate", parentCollectionId: "collection-core" })
  );

  const parent = {
    id: "actual-core",
    name: "Color System",
    defaultModeId: "m-1",
    modes: [{ modeId: "m-1", name: "light" }],
    variableIds: [],
    remote: false,
    ...parentData
  } as unknown as VariableCollection;

  // parentVariableCollectionId を持たない extended collection（API 欠落を再現）
  const extended = {
    id: "actual-corporate",
    name: "Corporate",
    defaultModeId: "m-c-1",
    modes: [{ modeId: "m-c-1", name: "light" }],
    variableIds: [],
    isExtension: true,
    remote: false,
    ...extData
  } as unknown as VariableCollection;

  const figmaMock = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [parent, extended],
      getLocalVariablesAsync: async () => []
    },
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => []
  };

  const originalFigma = (globalThis as typeof globalThis & { figma?: unknown }).figma;
  Reflect.set(globalThis, "figma", figmaMock);

  try {
    const document = await readLocalSyncDocument();
    const corporate = document.variables.find((c) => c.name === "Corporate");
    assert.equal(corporate?.extensions.figmaSync.parentCollectionId, "collection-core");
    assert.equal(document.warnings.length, 0);
  } finally {
    Reflect.set(globalThis, "figma", originalFigma);
  }
});

// #26: API から親を解決できた場合は pluginData へ永続化し、以後の欠落に備える。
// どちらからも解決できない場合は warning が出る（serialize 側で検証済みの経路に乗る）
test("readLocalSyncDocument persists a resolved parentCollectionId and warns when unresolvable (#26)", async () => {
  const parentData = createPluginDataMixin();
  parentData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "collection-core" })
  );
  const okData = createPluginDataMixin();
  const brokenData = createPluginDataMixin();

  const parent = {
    id: "actual-core",
    name: "Color System",
    defaultModeId: "m-1",
    modes: [{ modeId: "m-1", name: "light" }],
    variableIds: [],
    remote: false,
    ...parentData
  } as unknown as VariableCollection;

  const okExtended = {
    id: "actual-corporate",
    name: "Corporate",
    defaultModeId: "m-c-1",
    modes: [{ modeId: "m-c-1", name: "light" }],
    variableIds: [],
    isExtension: true,
    parentVariableCollectionId: "actual-core",
    remote: false,
    ...okData
  } as unknown as VariableCollection;

  // API からも pluginData からも親が取れない extended collection
  const brokenExtended = {
    id: "actual-broken",
    name: "Broken Theme",
    defaultModeId: "m-b-1",
    modes: [{ modeId: "m-b-1", name: "light" }],
    variableIds: [],
    isExtension: true,
    remote: false,
    ...brokenData
  } as unknown as VariableCollection;

  const figmaMock = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [parent, okExtended, brokenExtended],
      getLocalVariablesAsync: async () => []
    },
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => []
  };

  const originalFigma = (globalThis as typeof globalThis & { figma?: unknown }).figma;
  Reflect.set(globalThis, "figma", figmaMock);

  try {
    const document = await readLocalSyncDocument();

    // API から解決できた親は source id に正規化され、pluginData に永続化される
    const corporate = document.variables.find((c) => c.name === "Corporate");
    assert.equal(corporate?.extensions.figmaSync.parentCollectionId, "collection-core");
    const persisted = JSON.parse(okData.getPluginData("figma-variable-sync/meta")) as {
      parentCollectionId?: string;
    };
    assert.equal(persisted.parentCollectionId, "collection-core");

    // 解決できないものは warning + repo 出力から除外のマーク
    assert.equal(document.warnings.length, 1);
    assert.equal(document.warnings[0]!.name, "Broken Theme");
    const broken = document.variables.find((c) => c.name === "Broken Theme");
    assert.equal(broken?.extensions.figmaSync.missingParentCollection, true);
  } finally {
    Reflect.set(globalThis, "figma", originalFigma);
  }
});

// Figma で変数を「複製」すると pluginData（sourceId 等）までコピーされ、
// 別々の変数が同じ sourceId を名乗る。ID で対応を取る同期が 1 変数に潰れて見え、
// 片方が常に欠落していた（PR #67〜#70 の調査で確定した実事故）。
test("readLocalSyncDocument treats variables with a duplicated sourceId as new variables", async () => {
  const collectionData = createPluginDataMixin();
  collectionData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "collection-1" })
  );

  // 本来の持ち主: sourceId が自分の id と一致
  const originalData = createPluginDataMixin();
  originalData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "var-original", managed: true, syncedHash: "h1" })
  );
  // 複製で作られた変数: 別の id なのに同じ sourceId を持つ
  const duplicatedData = createPluginDataMixin();
  duplicatedData.setPluginData(
    "figma-variable-sync/meta",
    JSON.stringify({ sourceId: "var-original", managed: true, syncedHash: "h1" })
  );

  const collection = {
    id: "actual-collection-1",
    name: "Dimension System",
    defaultModeId: "m1",
    modes: [{ modeId: "m1", name: "Default" }],
    variableIds: ["var-original", "var-duplicated"],
    remote: false,
    ...collectionData
  } as unknown as VariableCollection;

  const original = {
    id: "var-original",
    name: "Spacing/Padding/4xl",
    resolvedType: "FLOAT",
    description: "",
    variableCollectionId: "actual-collection-1",
    valuesByMode: { m1: 64 },
    remote: false,
    ...originalData
  } as unknown as Variable;

  const duplicated = {
    id: "var-duplicated",
    name: "Spacing/Padding/3xl",
    resolvedType: "FLOAT",
    description: "",
    variableCollectionId: "actual-collection-1",
    valuesByMode: { m1: 48 },
    remote: false,
    ...duplicatedData
  } as unknown as Variable;

  const figmaMock = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getLocalVariablesAsync: async () => [original, duplicated]
    },
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => []
  };

  const originalFigma = (globalThis as typeof globalThis & { figma?: unknown }).figma;
  Reflect.set(globalThis, "figma", figmaMock);

  try {
    const document = await readLocalSyncDocument();
    const tokens = document.variables[0]!.tokens;
    const ids = tokens.map((t) => t.extensions.figmaSync.variableId).sort();

    // 2 つの変数が別々の id で残る（潰れない）
    assert.equal(tokens.length, 2);
    assert.deepEqual(ids, ["var-duplicated", "var-original"]);

    // 複製側は「新しい変数」として扱う（引き継いだ managed / syncedHash を持たない）
    const dup = tokens.find((t) => t.extensions.figmaSync.variableId === "var-duplicated")!;
    assert.equal(dup.extensions.figmaSync.managed, false);
    assert.equal(dup.extensions.figmaSync.syncedHash, "");

    // pluginData も修復され、次回以降も正しい id を名乗る
    const healed = JSON.parse(duplicatedData.getPluginData("figma-variable-sync/meta")) as {
      sourceId?: string;
    };
    assert.equal(healed.sourceId, "var-duplicated");
  } finally {
    Reflect.set(globalThis, "figma", originalFigma);
  }
});
