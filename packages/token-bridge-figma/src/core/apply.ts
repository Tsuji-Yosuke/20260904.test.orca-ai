import { cloneDocument, cloneValue, STYLE_TYPES } from "./document.js";
import type {
  ApplyDiffSelectionsInput,
  StyleTokenDocument,
  SyncDocument,
  SyncStyleType,
  VariableCollectionDocument,
  VariableTokenDocument
} from "./types.js";

function locateCollection(document: SyncDocument, collectionId: string) {
  const index = document.variables.findIndex(
    (collection) => collection.extensions.figmaSync.collectionId === collectionId
  );
  if (index >= 0) {
    return { index, entity: document.variables[index] as VariableCollectionDocument };
  }
  return null;
}

function locateVariable(document: SyncDocument, variableId: string, collectionId?: string) {
  const collections = collectionId
    ? document.variables.filter((c) => c.extensions.figmaSync.collectionId === collectionId)
    : document.variables;
  for (const collection of collections) {
    const index = collection.tokens.findIndex((token) => token.extensions.figmaSync.variableId === variableId);
    if (index >= 0) {
      return { collection, index, entity: collection.tokens[index] as VariableTokenDocument };
    }
  }
  return null;
}

function locateStyle(document: SyncDocument, styleId: string) {
  for (const styleType of STYLE_TYPES) {
    const index = document.styles[styleType].findIndex((style) => style.extensions.figmaSync.styleId === styleId);
    if (index >= 0) {
      return { styleType, index, entity: document.styles[styleType][index] as StyleTokenDocument };
    }
  }
  return null;
}

function upsertCollection(document: SyncDocument, sourceDocument: SyncDocument, collectionId: string): void {
  const sourceLocation = locateCollection(sourceDocument, collectionId);
  if (!sourceLocation) {
    return;
  }

  const targetLocation = locateCollection(document, collectionId);
  if (!targetLocation) {
    document.variables.push(cloneValue(sourceLocation.entity));
    return;
  }

  const merged = cloneValue(sourceLocation.entity);
  merged.tokens = targetLocation.entity.tokens;
  document.variables[targetLocation.index] = merged;
}

function removeCollection(document: SyncDocument, collectionId: string): void {
  const targetLocation = locateCollection(document, collectionId);
  if (targetLocation) {
    document.variables.splice(targetLocation.index, 1);
  }
}

function upsertVariable(document: SyncDocument, sourceDocument: SyncDocument, variableId: string, collectionId?: string): void {
  const sourceLocation = locateVariable(sourceDocument, variableId, collectionId);
  if (!sourceLocation) {
    return;
  }

  const targetLocation = locateVariable(document, variableId, collectionId);
  const copied = cloneValue(sourceLocation.entity);
  if (targetLocation) {
    targetLocation.collection.tokens[targetLocation.index] = copied;
    return;
  }

  let targetCollection = document.variables.find(
    (collection) =>
      collection.extensions.figmaSync.collectionId === sourceLocation.collection.extensions.figmaSync.collectionId
  );

  if (!targetCollection) {
    targetCollection = cloneValue(sourceLocation.collection);
    targetCollection.tokens = [];
    document.variables.push(targetCollection);
  }

  targetCollection.tokens.push(copied);
}

function removeVariable(document: SyncDocument, variableId: string, collectionId?: string): void {
  const targetLocation = locateVariable(document, variableId, collectionId);
  if (targetLocation) {
    targetLocation.collection.tokens.splice(targetLocation.index, 1);
  }
}

function upsertStyle(document: SyncDocument, sourceDocument: SyncDocument, styleId: string): void {
  const sourceLocation = locateStyle(sourceDocument, styleId);
  if (!sourceLocation) {
    return;
  }

  const targetLocation = locateStyle(document, styleId);
  const copied = cloneValue(sourceLocation.entity);
  if (targetLocation) {
    document.styles[targetLocation.styleType][targetLocation.index] = copied;
    return;
  }

  document.styles[sourceLocation.styleType as SyncStyleType].push(copied);
}

function removeStyle(document: SyncDocument, styleId: string): void {
  const targetLocation = locateStyle(document, styleId);
  if (targetLocation) {
    document.styles[targetLocation.styleType].splice(targetLocation.index, 1);
  }
}

export function applyDiffSelections({
  figmaDocument,
  repoDocument,
  diffs,
  resolutions
}: ApplyDiffSelectionsInput): { figmaDocument: SyncDocument; repoDocument: SyncDocument } {
  const nextFigmaDocument = cloneDocument(figmaDocument);
  const nextRepoDocument = cloneDocument(repoDocument);

  for (const diff of diffs) {
    const direction = resolutions[diff.resolutionId] ?? "skip";
    if (direction === "skip") {
      continue;
    }

    if (diff.entityKind === "collection") {
      if (direction === "repo-to-figma") {
        locateCollection(nextRepoDocument, diff.figmaId)
          ? upsertCollection(nextFigmaDocument, nextRepoDocument, diff.figmaId)
          : removeCollection(nextFigmaDocument, diff.figmaId);
      } else {
        locateCollection(nextFigmaDocument, diff.figmaId)
          ? upsertCollection(nextRepoDocument, nextFigmaDocument, diff.figmaId)
          : removeCollection(nextRepoDocument, diff.figmaId);
      }
      continue;
    }

    if (diff.entityKind === "variable") {
      const collectionId = diff.details.collectionId as string | undefined;
      if (direction === "repo-to-figma") {
        locateVariable(nextRepoDocument, diff.figmaId, collectionId)
          ? upsertVariable(nextFigmaDocument, nextRepoDocument, diff.figmaId, collectionId)
          : removeVariable(nextFigmaDocument, diff.figmaId, collectionId);
      } else {
        locateVariable(nextFigmaDocument, diff.figmaId, collectionId)
          ? upsertVariable(nextRepoDocument, nextFigmaDocument, diff.figmaId, collectionId)
          : removeVariable(nextRepoDocument, diff.figmaId, collectionId);
      }
      continue;
    }

    if (direction === "repo-to-figma") {
      locateStyle(nextRepoDocument, diff.figmaId)
        ? upsertStyle(nextFigmaDocument, nextRepoDocument, diff.figmaId)
        : removeStyle(nextFigmaDocument, diff.figmaId);
    } else {
      locateStyle(nextFigmaDocument, diff.figmaId)
        ? upsertStyle(nextRepoDocument, nextFigmaDocument, diff.figmaId)
        : removeStyle(nextRepoDocument, diff.figmaId);
    }
  }

  return {
    figmaDocument: nextFigmaDocument,
    repoDocument: nextRepoDocument
  };
}
