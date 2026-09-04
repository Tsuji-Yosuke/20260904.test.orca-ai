import test from "node:test";
import assert from "node:assert/strict";

import { buildPullRequestFiles, computeLeftoverRepoFilePaths } from "../src/core/export.js";
import type { DiffEntry, SyncDocument } from "../src/core/types.js";

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
            updatedHash: "collection-hash",
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
                updatedHash: "var-1-next",
                syncedHash: "var-1-base",
                managed: true
              }
            }
          }
        ]
      }
    ],
    styles: {
      paint: [
        {
          id: "style-1",
          name: "fill/brand",
          path: ["fill", "brand"],
          styleType: "paint",
          tokenType: "color",
          description: "",
          value: "#ffffffff",
          extensions: {
            figmaSync: {
              styleId: "style-1",
              styleType: "paint",
              updatedHash: "style-1-next",
              syncedHash: "style-1-base",
              managed: true
            }
          }
        }
      ],
      text: [],
      effect: [],
      grid: []
    },
    warnings: []
  };
}

test("buildPullRequestFiles writes only files affected by selected figma-to-repo diffs", () => {
  const document = createDocument();
  const diffs: DiffEntry[] = [
    {
      resolutionId: "variable:var-1",
      entityKind: "variable",
      changeKind: "update",
      figmaId: "var-1",
      jsonPath: "color/text/primary",
      displayName: "color/text/primary",
      details: { preferredDirection: "figma-to-repo" }
    },
    {
      resolutionId: "style:style-1",
      entityKind: "style",
      changeKind: "update",
      figmaId: "style-1",
      jsonPath: "fill/brand",
      displayName: "fill/brand",
      details: { preferredDirection: "figma-to-repo" }
    }
  ];

  const { files } = buildPullRequestFiles({
    document,
    targetDir: "tokens",
    diffs,
    resolutions: {
      "variable:var-1": "figma-to-repo",
      "style:style-1": "skip"
    }
  });

  assert.deepEqual(Object.keys(files), ["tokens/variables/semantic.json"]);

  const variablePayload = JSON.parse(files["tokens/variables/semantic.json"]!);
  assert.equal(
    variablePayload.color.text.primary.$extensions.figmaSync.syncedHash,
    "var-1-next"
  );
});

test("buildPullRequestFiles includes the collection of a deleted variable even when it is the only figma-to-repo change", () => {
  // 再現条件: コレクション A の変数1件が figma 側で削除され（figma-to-repo delete diff）、
  // それ以外に当該コレクションの変更が無い。削除適用後（A から var-1 を除去済み）の
  // 文書を document に渡す。
  const document: SyncDocument = {
    variables: [
      {
        id: "collection-a",
        name: "Collection A",
        defaultModeId: "light",
        modes: [{ modeId: "light", name: "Light" }],
        extensions: {
          figmaSync: {
            collectionId: "collection-a",
            defaultModeId: "light",
            modes: [{ modeId: "light", name: "Light" }],
            updatedHash: "collection-a-hash",
            syncedHash: "collection-a-hash",
            managed: true
          }
        },
        tokens: []
      },
      {
        id: "collection-b",
        name: "Collection B",
        defaultModeId: "light",
        modes: [{ modeId: "light", name: "Light" }],
        extensions: {
          figmaSync: {
            collectionId: "collection-b",
            defaultModeId: "light",
            modes: [{ modeId: "light", name: "Light" }],
            updatedHash: "collection-b-hash",
            syncedHash: "collection-b-hash",
            managed: true
          }
        },
        tokens: [
          {
            id: "var-b1",
            name: "color/text/secondary",
            path: ["color", "text", "secondary"],
            type: "color",
            description: "",
            value: { light: "#111111ff" },
            extensions: {
              figmaSync: {
                variableId: "var-b1",
                collectionId: "collection-b",
                modeValues: { light: { hex: "#111111ff" } },
                updatedHash: "var-b1-hash",
                syncedHash: "var-b1-hash",
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

  const diffs: DiffEntry[] = [
    {
      resolutionId: "variable:var-a1",
      entityKind: "variable",
      changeKind: "delete",
      figmaId: "var-a1",
      jsonPath: "color/text/deleted",
      displayName: "color/text/deleted",
      details: { missingSide: "figma", collectionId: "collection-a" }
    }
  ];

  const { files } = buildPullRequestFiles({
    document,
    targetDir: "tokens",
    diffs,
    resolutions: {
      "variable:var-a1": "figma-to-repo"
    }
  });

  assert.ok(
    "tokens/variables/collection-a.json" in files,
    "collection containing the deleted variable must be regenerated"
  );
});

test("buildPullRequestFiles includes the paint styles file for a deleted style even when it is the only figma-to-repo change", () => {
  // 再現条件: paint style 1件が figma 側で削除され（figma-to-repo delete diff）、
  // それ以外に変更が無い。削除適用後（styles.paint が空）の文書を document に渡す。
  const document: SyncDocument = {
    variables: [],
    styles: { paint: [], text: [], effect: [], grid: [] },
    warnings: []
  };

  const diffs: DiffEntry[] = [
    {
      resolutionId: "style:style-deleted",
      entityKind: "style",
      changeKind: "delete",
      figmaId: "style-deleted",
      jsonPath: "fill/deleted",
      displayName: "fill/deleted",
      details: { missingSide: "figma", styleType: "paint" }
    }
  ];

  const { files } = buildPullRequestFiles({
    document,
    targetDir: "tokens",
    diffs,
    resolutions: {
      "style:style-deleted": "figma-to-repo"
    }
  });

  assert.ok(
    "tokens/styles/paint.json" in files,
    "styles file for the deleted style's type must be regenerated"
  );
});

test("buildPullRequestFiles advances syncedHash for a full export", () => {
  const document = createDocument();

  const { files } = buildPullRequestFiles({
    document,
    targetDir: "tokens"
  });

  const variablePayload = JSON.parse(files["tokens/variables/semantic.json"]!);
  const stylePayload = JSON.parse(files["tokens/styles/paint.json"]!);

  assert.equal(variablePayload.$extensions.figmaSync.syncedHash, "collection-hash");
  assert.equal(variablePayload.color.text.primary.$extensions.figmaSync.syncedHash, "var-1-next");
  assert.equal(stylePayload.fill.brand.$extensions.figmaSync.syncedHash, "style-1-next");
});

// #23: コレクションをリネーム/削除しても旧 JSON が残り続ける問題。
// 「repo にあるが今回の出力に無い variables ファイル」のうち、
// 対象コレクションのものだけを削除パスとして返す。
function repoVariablesFile(collectionId: string): string {
  return JSON.stringify({ $extensions: { figmaSync: { collectionId } } });
}

test("computeLeftoverRepoFilePaths detects the old file after a collection rename (#23)", () => {
  const document = createDocument(); // collection-1 "Semantic" のみ
  const { files: nextFiles } = buildPullRequestFiles({ document, targetDir: "tokens" });

  const orphans = computeLeftoverRepoFilePaths({
    repoFiles: {
      // リネーム前の旧ファイル（同じ collectionId、旧 slug）
      "tokens/variables/old-semantic.json": repoVariablesFile("collection-1"),
      // 今回も書かれる現行ファイルは削除しない
      "tokens/variables/semantic.json": repoVariablesFile("collection-1")
    },
    nextFiles,
    document
  });

  assert.deepEqual(orphans, ["tokens/variables/old-semantic.json"]);
});

test("computeLeftoverRepoFilePaths detects files of collections deleted from Figma on full export (#23)", () => {
  const document = createDocument();
  const { files: nextFiles } = buildPullRequestFiles({ document, targetDir: "tokens" });

  const orphans = computeLeftoverRepoFilePaths({
    repoFiles: {
      "tokens/variables/semantic.json": repoVariablesFile("collection-1"),
      // Figma 側に存在しないコレクションのファイル
      "tokens/variables/legacy.json": repoVariablesFile("collection-gone")
    },
    nextFiles,
    document
  });

  assert.deepEqual(orphans, ["tokens/variables/legacy.json"]);
});

test("computeLeftoverRepoFilePaths limits deletions to included collections on partial export (#23)", () => {
  const document = createDocument();
  const { files: nextFiles } = buildPullRequestFiles({ document, targetDir: "tokens" });

  const orphans = computeLeftoverRepoFilePaths({
    repoFiles: {
      // 部分適用の対象コレクションの古いファイル → 削除する
      "tokens/variables/old-semantic.json": repoVariablesFile("collection-1"),
      // 対象外コレクションのファイル → 触らない
      "tokens/variables/other.json": repoVariablesFile("collection-other")
    },
    nextFiles,
    document,
    includeCollectionIds: new Set(["collection-1"])
  });

  assert.deepEqual(orphans, ["tokens/variables/old-semantic.json"]);
});

test("computeLeftoverRepoFilePaths ignores styles files and unparsable JSON (#23)", () => {
  const document = createDocument();
  const { files: nextFiles } = buildPullRequestFiles({ document, targetDir: "tokens" });

  const orphans = computeLeftoverRepoFilePaths({
    repoFiles: {
      "tokens/styles/paint.json": "{}",
      "tokens/variables/broken.json": "not-json"
    },
    nextFiles,
    document
  });

  assert.deepEqual(orphans, []);
});

test("computeLeftoverRepoFilePaths keeps files of collections withheld for missing parent (#23 x #26)", () => {
  const document = createDocument();
  // parentCollectionId 欠落で出力保留になった extended collection（#26）
  document.variables.push({
    id: "collection-corporate",
    name: "Corporate",
    defaultModeId: "m-1",
    modes: [{ modeId: "m-1", name: "light" }],
    extensions: {
      figmaSync: {
        collectionId: "collection-corporate",
        missingParentCollection: true,
        defaultModeId: "m-1",
        modes: [{ modeId: "m-1", name: "light" }],
        updatedHash: "h",
        syncedHash: "",
        managed: true
      }
    },
    tokens: []
  });
  const { files: nextFiles } = buildPullRequestFiles({ document, targetDir: "tokens" });

  const orphans = computeLeftoverRepoFilePaths({
    repoFiles: {
      // 保留コレクションの既存ファイル: 出力には無いが削除してはいけない
      "tokens/variables/corporate.json": repoVariablesFile("collection-corporate")
    },
    nextFiles,
    document
  });

  assert.deepEqual(orphans, []);
});

test("buildPullRequestFiles returns deletePaths when repoFiles are provided (#23)", () => {
  const document = createDocument();
  const { files, deletePaths } = buildPullRequestFiles({
    document,
    targetDir: "tokens",
    repoFiles: {
      "tokens/variables/old-semantic.json": repoVariablesFile("collection-1")
    }
  });
  assert.ok(Object.keys(files).length > 0);
  assert.deepEqual(deletePaths, ["tokens/variables/old-semantic.json"]);
});
