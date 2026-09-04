import { signal } from "@preact/signals";
import type {
  DiffEntry,
  DiffResolution,
  PluginConfig,
  PullRequestResult,
  SyncDocument
} from "../core/types.js";
import type { PluginStateSnapshot } from "../shared/messages.js";
import { defaultResolution } from "./default-resolution.js";

export type Screen = "main" | "config";

export type ViewState = {
  config: PluginConfig;
  token: string;
  hasStoredToken: boolean;
  screen: Screen;
  figmaDocument?: SyncDocument;
  repoDocument?: SyncDocument;
  diffs: DiffEntry[];
  resolutions: Record<string, DiffResolution>;
  status: { level: "info" | "success" | "warning"; message: string } | null;
  pullRequest: PullRequestResult | null;
};

export const state = signal<ViewState>({
  config: {
    owner: "",
    repo: "",
    baseBranch: "main",
    targetDir: "tokens",
    patStorageOptIn: true
  },
  token: "",
  hasStoredToken: false,
  screen: "main",
  diffs: [],
  resolutions: {},
  status: null,
  pullRequest: null
});

export function mergeState(snapshot: PluginStateSnapshot): void {
  const current = state.value;
  const next = { ...current };

  if (snapshot.config) {
    next.config = snapshot.config;
  }
  if (typeof snapshot.hasStoredToken === "boolean") {
    next.hasStoredToken = snapshot.hasStoredToken;
  }
  if (snapshot.figmaDocument) {
    next.figmaDocument = snapshot.figmaDocument;
  }
  if (snapshot.repoDocument) {
    next.repoDocument = snapshot.repoDocument;
  }
  if (snapshot.pullRequest) {
    next.pullRequest = snapshot.pullRequest;
  }
  if (snapshot.diffs) {
    next.diffs = snapshot.diffs;
    next.resolutions = Object.fromEntries(
      snapshot.diffs.map((entry) => [
        entry.resolutionId,
        current.resolutions[entry.resolutionId] ?? defaultResolution(entry)
      ])
    );
  }

  state.value = next;
}

export function updateResolution(resolutionId: string, value: DiffResolution): void {
  state.value = {
    ...state.value,
    resolutions: { ...state.value.resolutions, [resolutionId]: value }
  };
}

export function setScreen(screen: Screen): void {
  state.value = { ...state.value, screen };
}

export function setStatus(status: ViewState["status"]): void {
  state.value = { ...state.value, status };
}

export function updateConfig(config: PluginConfig, token: string): void {
  state.value = { ...state.value, config, token, screen: "main" };
}
