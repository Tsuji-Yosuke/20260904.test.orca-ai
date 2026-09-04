import test from "node:test";
import assert from "node:assert/strict";

import { hasResolutionDirection } from "../src/core/resolutions.js";
import type { DiffEntry } from "../src/core/types.js";

const diffs: DiffEntry[] = [
  {
    resolutionId: "variable:one",
    entityKind: "variable",
    changeKind: "create",
    figmaId: "one",
    jsonPath: "color/text/primary",
    displayName: "color/text/primary",
    details: { missingSide: "repo" }
  },
  {
    resolutionId: "style:two",
    entityKind: "style",
    changeKind: "conflict",
    figmaId: "two",
    jsonPath: "fill/brand",
    displayName: "fill/brand",
    details: { figmaHash: "a", repoHash: "b" }
  }
];

test("hasResolutionDirection detects figma-to-repo selections", () => {
  assert.equal(
    hasResolutionDirection(
      diffs,
      {
        "variable:one": "figma-to-repo",
        "style:two": "skip"
      },
      "figma-to-repo"
    ),
    true
  );
});

test("hasResolutionDirection ignores skipped and opposite selections", () => {
  assert.equal(
    hasResolutionDirection(
      diffs,
      {
        "variable:one": "repo-to-figma",
        "style:two": "skip"
      },
      "figma-to-repo"
    ),
    false
  );
});
