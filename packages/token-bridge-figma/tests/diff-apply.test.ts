import test from "node:test";
import assert from "node:assert/strict";

import { applyDiffSelections } from "../src/core/apply.js";
import { diffSyncDocuments } from "../src/core/diff.js";
import type { SyncDocument } from "../src/core/types.js";

function createDocument(): SyncDocument {
  return {
    variables: [
      {
        id: "collection-1",
        name: "Semantic",
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
            updatedHash: "collection-base",
            syncedHash: "collection-base",
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
            value: { light: "#ffffffff", dark: "#000000ff" },
            extensions: {
              figmaSync: {
                variableId: "var-1",
                collectionId: "collection-1",
                modeValues: {
                  light: { hex: "#ffffffff" },
                  dark: { hex: "#000000ff" }
                },
                updatedHash: "same-hash",
                syncedHash: "same-hash",
                managed: true
              }
            }
          },
          {
            id: "var-2",
            name: "color/text/secondary",
            path: ["color", "text", "secondary"],
            type: "color",
            description: "",
            value: { light: "#666666ff", dark: "#888888ff" },
            extensions: {
              figmaSync: {
                variableId: "var-2",
                collectionId: "collection-1",
                modeValues: {
                  light: { hex: "#666666ff" },
                  dark: { hex: "#888888ff" }
                },
                updatedHash: "figma-hash",
                syncedHash: "repo-hash",
                managed: true
              }
            }
          }
        ]
      }
    ],
    styles: { paint: [], text: [], effect: [], grid: [] },
    warnings: []
  };
}

test("diffSyncDocuments detects update, create and delete", () => {
  const figmaDocument = createDocument();
  const repoDocument = createDocument();

  (repoDocument.variables[0]!.tokens[1]!.value as Record<string, string>).light = "#777777ff";
  repoDocument.variables[0]!.tokens[1]!.extensions.figmaSync.updatedHash = "repo-hash";

  figmaDocument.variables[0]!.tokens.push({
    id: "var-3",
    name: "color/text/tertiary",
    path: ["color", "text", "tertiary"],
    type: "color",
    description: "",
    value: { light: "#222222ff", dark: "#333333ff" },
    extensions: {
      figmaSync: {
        variableId: "var-3",
        collectionId: "collection-1",
        modeValues: {
          light: { hex: "#222222ff" },
          dark: { hex: "#333333ff" }
        },
        updatedHash: "figma-new",
        syncedHash: "",
        managed: false
      }
    }
  });

  repoDocument.variables[0]!.tokens.push({
    id: "var-4",
    name: "color/text/quaternary",
    path: ["color", "text", "quaternary"],
    type: "color",
    description: "",
    value: { light: "#444444ff", dark: "#555555ff" },
    extensions: {
      figmaSync: {
        variableId: "var-4",
        collectionId: "collection-1",
        modeValues: {
          light: { hex: "#444444ff" },
          dark: { hex: "#555555ff" }
        },
        updatedHash: "repo-new",
        syncedHash: "",
        managed: false
      }
    }
  });

  repoDocument.variables[0]!.tokens.push({
    id: "var-5",
    name: "color/text/deleted-in-figma",
    path: ["color", "text", "deleted-in-figma"],
    type: "color",
    description: "",
    value: { light: "#121212ff", dark: "#efefefff" },
    extensions: {
      figmaSync: {
        variableId: "var-5",
        collectionId: "collection-1",
        modeValues: {
          light: { hex: "#121212ff" },
          dark: { hex: "#efefefff" }
        },
        updatedHash: "repo-deleted",
        syncedHash: "",
        managed: true
      }
    }
  });

  const diffs = diffSyncDocuments(figmaDocument, repoDocument);
  assert.equal(diffs.length, 4);
  assert.equal(diffs.find((entry) => entry.figmaId === "var-2")?.changeKind, "update");
  assert.equal(diffs.find((entry) => entry.figmaId === "var-3")?.changeKind, "create");
  assert.equal(diffs.find((entry) => entry.figmaId === "var-4")?.changeKind, "create");
  assert.equal(diffs.find((entry) => entry.figmaId === "var-5")?.changeKind, "delete");
});

test("diffSyncDocuments detects a real two-sided conflict", () => {
  const figmaDocument = createDocument();
  const repoDocument = createDocument();

  figmaDocument.variables[0]!.tokens[1]!.extensions.figmaSync.syncedHash = "base";
  figmaDocument.variables[0]!.tokens[1]!.extensions.figmaSync.updatedHash = "figma-next";
  repoDocument.variables[0]!.tokens[1]!.extensions.figmaSync.syncedHash = "base";
  repoDocument.variables[0]!.tokens[1]!.extensions.figmaSync.updatedHash = "repo-next";

  const diff = diffSyncDocuments(figmaDocument, repoDocument).find((entry) => entry.figmaId === "var-2");
  assert.equal(diff?.changeKind, "conflict");
});

test("diffSyncDocuments marks one-sided token changes as update with a preferred direction", () => {
  const figmaDocument = createDocument();
  const repoDocument = createDocument();

  figmaDocument.variables[0]!.tokens[1]!.extensions.figmaSync.syncedHash = "base";
  figmaDocument.variables[0]!.tokens[1]!.extensions.figmaSync.updatedHash = "figma-next";
  repoDocument.variables[0]!.tokens[1]!.extensions.figmaSync.syncedHash = "base";
  repoDocument.variables[0]!.tokens[1]!.extensions.figmaSync.updatedHash = "base";

  const figmaToRepo = diffSyncDocuments(figmaDocument, repoDocument).find((entry) => entry.figmaId === "var-2");
  assert.equal(figmaToRepo?.changeKind, "update");
  assert.equal(figmaToRepo?.details.preferredDirection, "figma-to-repo");

  figmaDocument.variables[0]!.tokens[1]!.extensions.figmaSync.updatedHash = "base";
  repoDocument.variables[0]!.tokens[1]!.extensions.figmaSync.updatedHash = "repo-next";

  const repoToFigma = diffSyncDocuments(figmaDocument, repoDocument).find((entry) => entry.figmaId === "var-2");
  assert.equal(repoToFigma?.changeKind, "update");
  assert.equal(repoToFigma?.details.preferredDirection, "repo-to-figma");
});

test("diffSyncDocuments uses the peer synced hash when one side already advanced its sync base", () => {
  const figmaDocument = createDocument();
  const repoDocument = createDocument();

  figmaDocument.variables[0]!.tokens[1]!.extensions.figmaSync.updatedHash = "merged";
  figmaDocument.variables[0]!.tokens[1]!.extensions.figmaSync.syncedHash = "old-base";
  repoDocument.variables[0]!.tokens[1]!.extensions.figmaSync.updatedHash = "repo-next";
  repoDocument.variables[0]!.tokens[1]!.extensions.figmaSync.syncedHash = "merged";

  const diff = diffSyncDocuments(figmaDocument, repoDocument).find((entry) => entry.figmaId === "var-2");
  assert.equal(diff?.changeKind, "update");
  assert.equal(diff?.details.preferredDirection, "repo-to-figma");
});

test("diffSyncDocuments detects tokens in Extended Collections that share variableIds with parent", () => {
  // Extended Collections share the same variables (same variableId) as the parent.
  // The diff must detect tokens in the extended collection as separate entities.
  const figmaDocument: SyncDocument = {
    variables: [
      {
        id: "col-core",
        name: "core",
        defaultModeId: "m-light",
        modes: [
          { modeId: "m-light", name: "light" },
          { modeId: "m-dark", name: "dark" }
        ],
        extensions: {
          figmaSync: {
            collectionId: "col-core",
            defaultModeId: "m-light",
            modes: [
              { modeId: "m-light", name: "light" },
              { modeId: "m-dark", name: "dark" }
            ],
            updatedHash: "core-hash",
            syncedHash: "core-hash",
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
            value: { "m-light": "#000000ff", "m-dark": "#ffffffff" },
            extensions: {
              figmaSync: {
                variableId: "var-1",
                collectionId: "col-core",
                modeValues: {
                  "m-light": { hex: "#000000ff" },
                  "m-dark": { hex: "#ffffffff" }
                },
                updatedHash: "var1-core-hash",
                syncedHash: "var1-core-hash",
                managed: true
              }
            }
          }
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
        extensions: {
          figmaSync: {
            collectionId: "col-red",
            defaultModeId: "m-red-light",
            modes: [
              { modeId: "m-red-light", name: "light" },
              { modeId: "m-red-dark", name: "dark" }
            ],
            updatedHash: "red-hash",
            syncedHash: "red-hash",
            managed: true
          }
        },
        tokens: [
          {
            id: "var-1",  // Same variableId as parent!
            name: "color/text/primary",
            path: ["color", "text", "primary"],
            type: "color",
            description: "",
            value: { "m-red-light": "#ff0000ff", "m-red-dark": "#ffccccff" },
            extensions: {
              figmaSync: {
                variableId: "var-1",
                collectionId: "col-red",  // Different collectionId
                modeValues: {
                  "m-red-light": { hex: "#ff0000ff" },
                  "m-red-dark": { hex: "#ffccccff" }
                },
                updatedHash: "var1-red-hash",
                syncedHash: "",
                managed: false
              }
            }
          }
        ]
      }
    ],
    styles: { paint: [], text: [], effect: [], grid: [] },
    warnings: []
  };

  // Repo side: core has the same token, red collection is empty (no tokens)
  const repoDocument: SyncDocument = {
    variables: [
      {
        ...figmaDocument.variables[0]!,
        tokens: [...figmaDocument.variables[0]!.tokens]
      },
      {
        ...figmaDocument.variables[1]!,
        tokens: []  // red is empty in repo
      }
    ],
    styles: { paint: [], text: [], effect: [], grid: [] },
    warnings: []
  };

  const diffs = diffSyncDocuments(figmaDocument, repoDocument);

  // Core's var-1 should NOT appear as changed (same on both sides)
  const coreVar1Diff = diffs.find(
    (d) => d.entityKind === "variable" && d.details.missingSide !== "repo" &&
           d.resolutionId.includes("col-core")
  );
  assert.equal(coreVar1Diff, undefined, "core var-1 should have no diff");

  // Red's var-1 should appear as a new create
  const redVar1Diff = diffs.find(
    (d) => d.entityKind === "variable" && d.details.missingSide === "repo"
  );
  assert.ok(redVar1Diff, "red's var-1 should be detected as new in repo");
  assert.equal(redVar1Diff.changeKind, "create");
});

test("diffSyncDocuments emits collection diffs for mode changes", () => {
  const figmaDocument = createDocument();
  const repoDocument = createDocument();

  figmaDocument.variables[0]!.extensions.figmaSync.updatedHash = "collection-base";
  figmaDocument.variables[0]!.extensions.figmaSync.syncedHash = "collection-base";
  repoDocument.variables[0]!.modes.push({ modeId: "hc", name: "High Contrast" });
  repoDocument.variables[0]!.extensions.figmaSync.modes.push({ modeId: "hc", name: "High Contrast" });
  repoDocument.variables[0]!.extensions.figmaSync.updatedHash = "collection-next";
  repoDocument.variables[0]!.extensions.figmaSync.syncedHash = "collection-base";

  const diff = diffSyncDocuments(figmaDocument, repoDocument).find((entry) => entry.entityKind === "collection");
  assert.equal(diff?.changeKind, "update");
  assert.equal(diff?.details.preferredDirection, "repo-to-figma");
});

test("applyDiffSelections applies per-item directions and preserves skips", () => {
  const figmaDocument = createDocument();
  const repoDocument = createDocument();

  (repoDocument.variables[0]!.tokens[1]!.value as Record<string, string>).light = "#777777ff";
  repoDocument.variables[0]!.tokens[1]!.extensions.figmaSync.updatedHash = "repo-hash";

  figmaDocument.variables[0]!.tokens.push({
    id: "var-3",
    name: "color/text/tertiary",
    path: ["color", "text", "tertiary"],
    type: "color",
    description: "",
    value: { light: "#222222ff", dark: "#333333ff" },
    extensions: {
      figmaSync: {
        variableId: "var-3",
        collectionId: "collection-1",
        modeValues: {
          light: { hex: "#222222ff" },
          dark: { hex: "#333333ff" }
        },
        updatedHash: "figma-new",
        syncedHash: "",
        managed: false
      }
    }
  });

  const diffs = diffSyncDocuments(figmaDocument, repoDocument);
  const applied = applyDiffSelections({
    figmaDocument,
    repoDocument,
    diffs,
    resolutions: {
      "variable:collection-1:var-2": "repo-to-figma",
      "variable:collection-1:var-3": "figma-to-repo"
    }
  });

  const updatedFigma = applied.figmaDocument.variables[0]!.tokens.find((token) => token.id === "var-2");
  const updatedRepo = applied.repoDocument.variables[0]!.tokens.find((token) => token.id === "var-3");

  assert.equal((updatedFigma!.value as Record<string, string>).light, "#777777ff");
  assert.equal((updatedRepo!.value as Record<string, string>).dark, "#333333ff");
});

test("applyDiffSelections copies extended collection tokens correctly (not parent tokens)", () => {
  // Extended Collections share the same variableId as parent.
  // applyDiffSelections must copy the extended collection's token, not the parent's.
  const figmaDocument: SyncDocument = {
    variables: [
      {
        id: "col-core",
        name: "core",
        defaultModeId: "m-light",
        modes: [
          { modeId: "m-light", name: "light" },
          { modeId: "m-dark", name: "dark" }
        ],
        extensions: {
          figmaSync: {
            collectionId: "col-core",
            defaultModeId: "m-light",
            modes: [
              { modeId: "m-light", name: "light" },
              { modeId: "m-dark", name: "dark" }
            ],
            updatedHash: "core-hash",
            syncedHash: "core-hash",
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
            value: { "m-light": "#000000ff", "m-dark": "#ffffffff" },
            extensions: {
              figmaSync: {
                variableId: "var-1",
                collectionId: "col-core",
                modeValues: { "m-light": { hex: "#000000ff" }, "m-dark": { hex: "#ffffffff" } },
                updatedHash: "var1-core",
                syncedHash: "var1-core",
                managed: true
              }
            }
          }
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
        extensions: {
          figmaSync: {
            collectionId: "col-red",
            defaultModeId: "m-red-light",
            modes: [
              { modeId: "m-red-light", name: "light" },
              { modeId: "m-red-dark", name: "dark" }
            ],
            updatedHash: "red-hash",
            syncedHash: "red-hash",
            managed: true
          }
        },
        tokens: [
          {
            id: "var-1",  // Same variableId as parent!
            name: "color/text/primary",
            path: ["color", "text", "primary"],
            type: "color",
            description: "",
            value: { "m-red-light": "#ff0000ff", "m-red-dark": "#ffccccff" },
            extensions: {
              figmaSync: {
                variableId: "var-1",
                collectionId: "col-red",
                modeValues: { "m-red-light": { hex: "#ff0000ff" }, "m-red-dark": { hex: "#ffccccff" } },
                updatedHash: "var1-red-new",
                syncedHash: "",
                managed: false
              }
            }
          }
        ]
      }
    ],
    styles: { paint: [], text: [], effect: [], grid: [] },
    warnings: []
  };

  // Repo: core has same token, red collection exists but has no tokens
  const repoDocument: SyncDocument = {
    variables: [
      JSON.parse(JSON.stringify(figmaDocument.variables[0])),
      {
        ...JSON.parse(JSON.stringify(figmaDocument.variables[1])),
        tokens: []
      }
    ],
    styles: { paint: [], text: [], effect: [], grid: [] },
    warnings: []
  };

  const diffs = diffSyncDocuments(figmaDocument, repoDocument);

  // Find the diff for the red collection's var-1
  const redDiff = diffs.find(
    (d) => d.entityKind === "variable" && d.details.collectionId === "col-red"
  );
  assert.ok(redDiff, "should detect red's var-1 as diff");

  const applied = applyDiffSelections({
    figmaDocument,
    repoDocument,
    diffs,
    resolutions: {
      [redDiff.resolutionId]: "figma-to-repo"
    }
  });

  // The red collection in the repo should now have the token
  const redCollection = applied.repoDocument.variables.find(
    (c) => c.extensions.figmaSync.collectionId === "col-red"
  );
  assert.ok(redCollection, "red collection should exist in repo");
  assert.equal(redCollection.tokens.length, 1, "red should have 1 token");

  // The token should have RED values, not core's values
  const redToken = redCollection.tokens[0]!;
  assert.equal(redToken.extensions.figmaSync.collectionId, "col-red");
  assert.deepEqual(redToken.value, { "m-red-light": "#ff0000ff", "m-red-dark": "#ffccccff" });
});

test("applyDiffSelections works without structuredClone", () => {
  const originalStructuredClone = globalThis.structuredClone;
  Reflect.set(globalThis, "structuredClone", undefined);

  try {
    const figmaDocument = createDocument();
    const repoDocument = createDocument();

    (repoDocument.variables[0]!.tokens[1]!.value as Record<string, string>).light = "#777777ff";
    repoDocument.variables[0]!.tokens[1]!.extensions.figmaSync.updatedHash = "repo-hash";

    const diffs = diffSyncDocuments(figmaDocument, repoDocument);
    const applied = applyDiffSelections({
      figmaDocument,
      repoDocument,
      diffs,
      resolutions: {
        "variable:collection-1:var-2": "repo-to-figma"
      }
    });

    const updatedFigma = applied.figmaDocument.variables[0]!.tokens.find((token) => token.id === "var-2");
    assert.equal((updatedFigma!.value as Record<string, string>).light, "#777777ff");
  } finally {
    Reflect.set(globalThis, "structuredClone", originalStructuredClone);
  }
});
