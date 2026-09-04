import type { DiffEntry, DiffResolution, PluginConfig, PullRequestResult, SyncDocument } from "../core/types.js";

export type PluginRequest =
  | { type: "load-initial-state" }
  | { type: "save-config"; config: PluginConfig; token: string }
  | { type: "resize-window"; width: number; height: number }
  | { type: "refresh-diff"; config: PluginConfig }
  | { type: "scan-figma" }
  | { type: "load-repo"; config: PluginConfig }
  | { type: "compute-diff"; config: PluginConfig }
  | { type: "export-figma-to-github"; config: PluginConfig }
  | { type: "import-repo-to-figma"; config: PluginConfig }
  | { type: "apply-selected"; config: PluginConfig; resolutions: Record<string, DiffResolution> };

export interface PluginStateSnapshot {
  config?: PluginConfig;
  hasStoredToken?: boolean;
  figmaDocument?: SyncDocument;
  repoDocument?: SyncDocument;
  diffs?: DiffEntry[];
  pullRequest?: PullRequestResult | null;
}

export type PluginResponse =
  | { type: "state"; state: PluginStateSnapshot }
  | { type: "status"; level: "info" | "success" | "warning"; message: string }
  | { type: "error"; message: string };
