import test from "node:test";
import assert from "node:assert/strict";

import type { DiffEntry } from "../src/core/types.js";
import { defaultResolution } from "../src/ui/default-resolution.js";

// 過渡期方針: repo を Figma の鏡にするため、初期選択は原則 figma-to-repo。
// figma-to-repo は Figma を一切変更せず、repo を Figma に合わせる（無いものは repo から除去）。

test("defaultResolution defaults a GitHub-missing delete to figma-to-repo (re-add to repo)", () => {
  const entry: DiffEntry = {
    resolutionId: "variable:one",
    entityKind: "variable",
    changeKind: "delete",
    figmaId: "one",
    jsonPath: "color/text/primary",
    displayName: "color/text/primary",
    details: { missingSide: "repo" }
  };

  assert.equal(defaultResolution(entry), "figma-to-repo");
});

test("defaultResolution defaults a Figma-missing delete to figma-to-repo (remove from repo)", () => {
  const entry: DiffEntry = {
    resolutionId: "variable:one",
    entityKind: "variable",
    changeKind: "delete",
    figmaId: "one",
    jsonPath: "color/text/primary",
    displayName: "color/text/primary",
    details: { missingSide: "figma" }
  };

  assert.equal(defaultResolution(entry), "figma-to-repo");
});

test("defaultResolution defaults updates to figma-to-repo, overriding preferredDirection", () => {
  const entry: DiffEntry = {
    resolutionId: "variable:one",
    entityKind: "variable",
    changeKind: "update",
    figmaId: "one",
    jsonPath: "color/text/primary",
    displayName: "color/text/primary",
    details: { preferredDirection: "repo-to-figma" }
  };

  assert.equal(defaultResolution(entry), "figma-to-repo");
});

test("defaultResolution defaults conflicts to figma-to-repo (was skip)", () => {
  const entry: DiffEntry = {
    resolutionId: "variable:one",
    entityKind: "variable",
    changeKind: "conflict",
    figmaId: "one",
    jsonPath: "color/text/primary",
    displayName: "color/text/primary",
    details: {}
  };

  assert.equal(defaultResolution(entry), "figma-to-repo");
});

test("defaultResolution defaults a GitHub-only create to figma-to-repo (remove orphan from repo)", () => {
  const entry: DiffEntry = {
    resolutionId: "variable:one",
    entityKind: "variable",
    changeKind: "create",
    figmaId: "one",
    jsonPath: "color/text/primary",
    displayName: "color/text/primary",
    details: { missingSide: "figma" }
  };

  assert.equal(defaultResolution(entry), "figma-to-repo");
});
