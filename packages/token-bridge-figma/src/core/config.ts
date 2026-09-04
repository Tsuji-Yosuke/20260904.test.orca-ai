import type { PluginConfig } from "./types.js";

export function normalizePluginConfig(config: PluginConfig): PluginConfig {
  return {
    ...config,
    owner: config.owner.trim(),
    repo: config.repo.trim(),
    baseBranch: config.baseBranch.trim(),
    targetDir: config.targetDir.trim()
  };
}

export function getMissingGitHubSettings(config: PluginConfig, token: string): string[] {
  const normalized = normalizePluginConfig(config);
  const missing: string[] = [];

  if (!normalized.owner) {
    missing.push("GitHub Owner");
  }
  if (!normalized.repo) {
    missing.push("GitHub Repository");
  }
  if (!normalized.baseBranch) {
    missing.push("Base Branch");
  }
  if (!normalized.targetDir) {
    missing.push("Target Dir");
  }
  if (!token.trim()) {
    missing.push("GitHub personal access token");
  }

  return missing;
}

export function assertGitHubSettings(config: PluginConfig, token: string): void {
  const missing = getMissingGitHubSettings(config, token);
  if (missing.length > 0) {
    throw new Error(`${missing.join(", ")} を設定してください。`);
  }
}
