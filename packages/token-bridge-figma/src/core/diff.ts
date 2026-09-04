import { STYLE_TYPES } from "./document.js";
import type {
  DiffEntry,
  DiffResolution,
  StyleTokenDocument,
  SyncDocument,
  SyncEntityKind,
  VariableCollectionDocument,
  VariableTokenDocument
} from "./types.js";

type FlattenedEntity =
  | { key: string; entityKind: "collection"; entity: VariableCollectionDocument; collectionId?: string }
  | { key: string; entityKind: "variable"; entity: VariableTokenDocument; collectionId?: string }
  | { key: string; entityKind: "style"; entity: StyleTokenDocument; collectionId?: string };

function entityResolutionId(
  entityKind: SyncEntityKind,
  entity: VariableCollectionDocument | VariableTokenDocument | StyleTokenDocument
): string {
  if (entityKind === "collection") {
    return `collection:${(entity as VariableCollectionDocument).extensions.figmaSync.collectionId}`;
  }
  if (entityKind === "variable") {
    const token = entity as VariableTokenDocument;
    return `variable:${token.extensions.figmaSync.collectionId}:${token.extensions.figmaSync.variableId}`;
  }
  return `style:${(entity as StyleTokenDocument).extensions.figmaSync.styleId}`;
}

function entityId(
  entityKind: SyncEntityKind,
  entity: VariableCollectionDocument | VariableTokenDocument | StyleTokenDocument
): string {
  if (entityKind === "collection") {
    return (entity as VariableCollectionDocument).extensions.figmaSync.collectionId;
  }
  if (entityKind === "variable") {
    return (entity as VariableTokenDocument).extensions.figmaSync.variableId;
  }
  return (entity as StyleTokenDocument).extensions.figmaSync.styleId;
}

function entityHashes(
  entity: VariableCollectionDocument | VariableTokenDocument | StyleTokenDocument
): { updatedHash: string; syncedHash: string; managed: boolean } {
  return {
    updatedHash: entity.extensions.figmaSync.updatedHash,
    syncedHash: entity.extensions.figmaSync.syncedHash,
    managed: entity.extensions.figmaSync.managed
  };
}

function chooseBaselineHash(figmaHash: string, figmaSynced: string, repoHash: string, repoSynced: string): string | null {
  const repoSyncedMatchesFigmaCurrent = Boolean(repoSynced) && repoSynced === figmaHash;
  const figmaSyncedMatchesRepoCurrent = Boolean(figmaSynced) && figmaSynced === repoHash;
  const repoAlreadySynced = Boolean(repoSynced) && repoSynced === repoHash;
  const figmaAlreadySynced = Boolean(figmaSynced) && figmaSynced === figmaHash;
  const bothSidesShareSyncedHash = Boolean(figmaSynced) && figmaSynced === repoSynced;

  if (repoSyncedMatchesFigmaCurrent) {
    return repoSynced;
  }
  if (figmaSyncedMatchesRepoCurrent) {
    return figmaSynced;
  }
  if (repoAlreadySynced) {
    return repoSynced;
  }
  if (figmaAlreadySynced) {
    return figmaSynced;
  }
  if (bothSidesShareSyncedHash) {
    return figmaSynced;
  }
  return null;
}

function classifyChangedEntity(
  figmaEntity: VariableCollectionDocument | VariableTokenDocument | StyleTokenDocument,
  repoEntity: VariableCollectionDocument | VariableTokenDocument | StyleTokenDocument
): { changeKind: "update" | "conflict"; preferredDirection?: DiffResolution } {
  const figmaHashes = entityHashes(figmaEntity);
  const repoHashes = entityHashes(repoEntity);
  const baselineHash = chooseBaselineHash(
    figmaHashes.updatedHash,
    figmaHashes.syncedHash,
    repoHashes.updatedHash,
    repoHashes.syncedHash
  );

  if (!baselineHash) {
    return { changeKind: "conflict" };
  }

  const figmaChanged = figmaHashes.updatedHash !== baselineHash;
  const repoChanged = repoHashes.updatedHash !== baselineHash;

  if (figmaChanged && repoChanged) {
    return { changeKind: "conflict" };
  }
  if (figmaChanged) {
    return { changeKind: "update", preferredDirection: "figma-to-repo" };
  }
  if (repoChanged) {
    return { changeKind: "update", preferredDirection: "repo-to-figma" };
  }

  return { changeKind: "conflict" };
}

function flattenDocument(document: SyncDocument): FlattenedEntity[] {
  const entities: FlattenedEntity[] = [];

  for (const collection of document.variables) {
    entities.push({
      key: `collection:${collection.extensions.figmaSync.collectionId}`,
      entityKind: "collection",
      entity: collection
    });

    for (const token of collection.tokens) {
      // Include collectionId in the key so that Extended Collections (which share
      // the same variableId as the parent) produce distinct entries in the diff.
      const variableKey = token.extensions.figmaSync.variableId
        ? `${token.extensions.figmaSync.collectionId}:${token.extensions.figmaSync.variableId}`
        : `variable:${collection.id}:${token.name}`;
      entities.push({
        key: variableKey,
        entityKind: "variable",
        entity: token,
        collectionId: collection.extensions.figmaSync.collectionId
      });
    }
  }

  for (const styleType of STYLE_TYPES) {
    for (const style of document.styles[styleType]) {
      entities.push({
        key: style.extensions.figmaSync.styleId || `style:${styleType}:${style.name}`,
        entityKind: "style",
        entity: style
      });
    }
  }

  return entities;
}

export function diffSyncDocuments(figmaDocument: SyncDocument, repoDocument: SyncDocument): DiffEntry[] {
  const figmaMap = new Map(flattenDocument(figmaDocument).map((entry) => [entry.key, entry]));
  const repoMap = new Map(flattenDocument(repoDocument).map((entry) => [entry.key, entry]));
  const keys = new Set([...figmaMap.keys(), ...repoMap.keys()]);
  const diffs: DiffEntry[] = [];

  for (const key of keys) {
    const figmaEntry = figmaMap.get(key);
    const repoEntry = repoMap.get(key);

    if (figmaEntry && repoEntry) {
      const figmaHash = figmaEntry.entity.extensions.figmaSync.updatedHash;
      const repoHash = repoEntry.entity.extensions.figmaSync.updatedHash;

      if (figmaHash === repoHash) {
        continue;
      }

      const classified = classifyChangedEntity(figmaEntry.entity, repoEntry.entity);

      diffs.push({
        resolutionId: entityResolutionId(figmaEntry.entityKind, figmaEntry.entity),
        entityKind: figmaEntry.entityKind,
        changeKind: classified.changeKind,
        figmaId: entityId(figmaEntry.entityKind, figmaEntry.entity),
        jsonPath: repoEntry.entity.name,
        displayName: figmaEntry.entity.name,
        details: {
          figmaHash,
          repoHash,
          preferredDirection: classified.preferredDirection,
          collectionId: figmaEntry.collectionId
        }
      });
      continue;
    }

    const onlyEntry = (figmaEntry ?? repoEntry)!;
    const metadata = onlyEntry.entity.extensions.figmaSync;
    const changeKind = metadata.managed ? "delete" : "create";

    diffs.push({
      resolutionId: entityResolutionId(onlyEntry.entityKind, onlyEntry.entity),
      entityKind: onlyEntry.entityKind,
      changeKind,
      figmaId: entityId(onlyEntry.entityKind, onlyEntry.entity),
      jsonPath: onlyEntry.entity.name,
      displayName: onlyEntry.entity.name,
      details: {
        missingSide: figmaEntry ? "repo" : "figma",
        collectionId: onlyEntry.collectionId,
        // style の delete 差分（Figma 側に実体が無い）は、削除適用後の文書から
        // findStyleById で styleType を引けなくなるため、diff 生成時点の
        // styleType をここに残しておく。
        styleType: onlyEntry.entityKind === "style" ? onlyEntry.entity.styleType : undefined
      }
    });
  }

  return diffs.sort((left, right) => left.displayName.localeCompare(right.displayName));
}
