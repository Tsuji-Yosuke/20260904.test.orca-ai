import test from "node:test";
import assert from "node:assert/strict";

import { formatDiffStatus } from "../src/ui/diff-status.js";
import type { DiffEntry } from "../src/core/types.js";

test("formatDiffStatus shows a neutral label when GitHub is missing a managed token", () => {
  const entry: DiffEntry = {
    resolutionId: "variable:var-1",
    entityKind: "variable",
    changeKind: "delete",
    figmaId: "var-1",
    jsonPath: "color/text/primary",
    displayName: "color/text/primary",
    details: { missingSide: "repo" }
  };

  assert.equal(formatDiffStatus(entry), "GitHub になし");
});

test("formatDiffStatus keeps update labels unchanged", () => {
  const entry: DiffEntry = {
    resolutionId: "variable:var-1",
    entityKind: "variable",
    changeKind: "update",
    figmaId: "var-1",
    jsonPath: "color/text/primary",
    displayName: "color/text/primary",
    details: { preferredDirection: "repo-to-figma" }
  };

  assert.equal(formatDiffStatus(entry), "GitHub 更新");
});
