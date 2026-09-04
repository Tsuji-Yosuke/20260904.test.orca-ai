import type { PluginConfig, SyncMetadata } from "../core/types.js";

const CONFIG_KEY = "figma-variable-sync/config";
const TOKEN_KEY = "figma-variable-sync/pat";
const ENTITY_META_KEY = "figma-variable-sync/meta";

export interface StoredEntityMetadata extends SyncMetadata {
  sourceId?: string;
  modeIdMap?: Record<string, string>;
  /** Extended Collection の親（source id）。API から取得できた時点で永続化し、
      以後の scan で parentVariableCollectionId が読めない場合の復元元にする（#26）。 */
  parentCollectionId?: string;
}

export function readEntityMetadata(entity: PluginDataMixin): StoredEntityMetadata {
  const raw = entity.getPluginData(ENTITY_META_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as StoredEntityMetadata;
  } catch {
    return {};
  }
}

export function writeEntityMetadata(entity: PluginDataMixin, metadata: StoredEntityMetadata): void {
  entity.setPluginData(ENTITY_META_KEY, JSON.stringify(metadata));
}

export function defaultPluginConfig(): PluginConfig {
  return {
    owner: "",
    repo: "",
    baseBranch: "main",
    targetDir: "tokens",
    patStorageOptIn: true
  };
}

export function readStoredConfig(): PluginConfig {
  const raw = figma.root.getPluginData(CONFIG_KEY);
  if (!raw) {
    return defaultPluginConfig();
  }

  try {
    return { ...defaultPluginConfig(), ...(JSON.parse(raw) as Partial<PluginConfig>) };
  } catch {
    return defaultPluginConfig();
  }
}

export function writeStoredConfig(config: PluginConfig): void {
  figma.root.setPluginData(CONFIG_KEY, JSON.stringify(config));
}

export async function readStoredToken(): Promise<string> {
  return (await figma.clientStorage.getAsync(TOKEN_KEY)) ?? "";
}

export async function writeStoredToken(token: string, persist: boolean): Promise<void> {
  if (!persist) {
    await figma.clientStorage.deleteAsync(TOKEN_KEY);
    return;
  }

  await figma.clientStorage.setAsync(TOKEN_KEY, token);
}
