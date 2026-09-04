import test from "node:test";
import assert from "node:assert/strict";

import {
  assertGitHubSettings,
  getMissingGitHubSettings,
  normalizePluginConfig
} from "../src/core/config.js";
import type { PluginConfig } from "../src/core/types.js";

function createConfig(overrides: Partial<PluginConfig> = {}): PluginConfig {
  return {
    owner: "orca-ds",
    repo: "orca",
    baseBranch: "main",
    targetDir: "packages/token-pipeline/tokens",
    patStorageOptIn: true,
    ...overrides
  };
}

test("getMissingGitHubSettings reports blank GitHub settings before API access", () => {
  const missing = getMissingGitHubSettings(
    createConfig({ owner: "", repo: "", targetDir: "" }),
    ""
  );

  assert.deepEqual(missing, [
    "GitHub Owner",
    "GitHub Repository",
    "Target Dir",
    "GitHub personal access token"
  ]);
});

test("assertGitHubSettings throws a user-facing message for blank settings", () => {
  assert.throws(
    () => assertGitHubSettings(createConfig({ owner: "", repo: "" }), "secret"),
    /GitHub Owner, GitHub Repository を設定してください。/
  );
});

test("normalizePluginConfig trims text fields used in GitHub paths", () => {
  assert.deepEqual(
    normalizePluginConfig(
      createConfig({
        owner: " orca-ds ",
        repo: " orca ",
        baseBranch: " main ",
        targetDir: " packages/token-pipeline/tokens "
      })
    ),
    createConfig()
  );
});
