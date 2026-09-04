export type SyncStyleType = "paint" | "text" | "effect" | "grid";
export type SyncEntityKind = "variable" | "style" | "collection";
export type DiffChangeKind = "create" | "update" | "delete" | "unsupported" | "conflict";
export type DiffResolution = "figma-to-repo" | "repo-to-figma" | "skip";

export interface PluginConfig {
  owner: string;
  repo: string;
  baseBranch: string;
  targetDir: string;
  patStorageOptIn: boolean;
}

export interface PluginSecrets {
  personalAccessToken: string;
}

export interface FigmaSyncWarning {
  kind: "unsupported-style" | "unsupported-token" | "sync-error";
  styleType?: SyncStyleType;
  styleId?: string;
  name: string;
  reason: string;
}

export interface FigmaVariableAliasValue {
  alias: string;
}

export interface FigmaHexColorValue {
  hex: string;
}

export type FigmaVariableRawValue =
  | FigmaVariableAliasValue
  | FigmaHexColorValue
  | string
  | number
  | boolean;

export interface FigmaVariableCollectionSnapshot {
  id: string;
  name: string;
  defaultModeId: string;
  modes: Array<{ modeId: string; name: string }>;
  /** Extended Collection（テーマ）かどうか。parentCollectionId 欠落の検出に使う（#26）。 */
  isExtension?: boolean;
  parentCollectionId?: string;
  syncMetadata?: SyncMetadata;
}

export interface FigmaVariableSnapshot {
  id: string;
  collectionId: string;
  name: string;
  resolvedType: VariableResolvedDataType;
  description: string;
  valuesByMode: Record<string, FigmaVariableRawValue>;
  syncMetadata?: SyncMetadata;
}

export interface FigmaStyleSnapshot {
  id: string;
  name: string;
  description: string;
  syncMetadata?: SyncMetadata;
}

export interface FigmaPaintStyleSnapshot extends FigmaStyleSnapshot {
  paints: Paint[];
  boundVariables: Record<string, string | string[]>;
}

export interface FigmaTextStyleSnapshot extends FigmaStyleSnapshot {
  fontName: FontName;
  fontSize: number;
  lineHeight: LineHeight;
  letterSpacing: LetterSpacing;
  paragraphSpacing: number;
  paragraphIndent: number;
  textCase: TextCase;
  textDecoration: TextDecoration;
  boundVariables: Record<string, string>;
}

export interface FigmaEffectStyleSnapshot extends FigmaStyleSnapshot {
  effects: Effect[];
  boundVariables: Record<string, string | string[]>;
}

export interface FigmaGridStyleSnapshot extends FigmaStyleSnapshot {
  layoutGrids: LayoutGrid[];
  boundVariables: Record<string, string | string[]>;
}

export interface FigmaSyncSnapshot {
  variables: {
    collections: FigmaVariableCollectionSnapshot[];
    variables: FigmaVariableSnapshot[];
  };
  styles: {
    paint: FigmaPaintStyleSnapshot[];
    text: FigmaTextStyleSnapshot[];
    effect: FigmaEffectStyleSnapshot[];
    grid: FigmaGridStyleSnapshot[];
  };
}

export interface SyncMetadata {
  syncedHash?: string;
  managed?: boolean;
}

export interface VariableTokenDocument {
  id: string;
  name: string;
  path: string[];
  type: "color" | "number" | "string" | "boolean" | "unknown";
  description: string;
  value: Record<string, unknown>;
  extensions: {
    figmaSync: {
      variableId: string;
      collectionId: string;
      modeValues: Record<string, unknown>;
      updatedHash: string;
      syncedHash: string;
      managed: boolean;
    };
  };
}

export interface VariableCollectionDocument {
  id: string;
  name: string;
  defaultModeId: string;
  modes: Array<{ modeId: string; name: string }>;
  extensions: {
    figmaSync: {
      collectionId: string;
      /** Extended Collection なのに親が特定できなかった場合 true。repo ファイル出力から
          除外される（#26）。除外の理由は document.warnings に入り、プラグイン UI の
          警告一覧に「PR に含めません」という文言で表示される。 */
      missingParentCollection?: boolean;
      parentCollectionId?: string;
      name?: string;
      defaultModeId: string;
      modes: Array<{ modeId: string; name: string }>;
      updatedHash: string;
      syncedHash: string;
      managed: boolean;
    };
  };
  tokens: VariableTokenDocument[];
}

export interface StyleTokenDocument {
  id: string;
  name: string;
  path: string[];
  styleType: SyncStyleType;
  tokenType: "color" | "typography" | "shadow" | "other";
  description: string;
  value: unknown;
  extensions: {
    figmaSync: {
      styleId: string;
      styleType: SyncStyleType;
      boundVariables?: Record<string, unknown>;
      grid?: unknown;
      updatedHash: string;
      syncedHash: string;
      managed: boolean;
    };
  };
}

export interface SyncDocument {
  variables: VariableCollectionDocument[];
  styles: Record<SyncStyleType, StyleTokenDocument[]>;
  warnings: FigmaSyncWarning[];
}

export interface DiffEntry {
  resolutionId: string;
  entityKind: SyncEntityKind;
  changeKind: DiffChangeKind;
  figmaId: string;
  jsonPath: string;
  displayName: string;
  details: Record<string, unknown>;
}

export interface ApplyDiffSelectionsInput {
  figmaDocument: SyncDocument;
  repoDocument: SyncDocument;
  diffs: DiffEntry[];
  resolutions: Record<string, DiffResolution>;
}

export interface PullRequestResult {
  number: number;
  html_url: string;
}
