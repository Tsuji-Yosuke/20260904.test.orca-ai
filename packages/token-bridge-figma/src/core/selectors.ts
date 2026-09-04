import type { StyleTokenDocument, SyncDocument, SyncStyleType, VariableCollectionDocument, VariableTokenDocument } from "./types.js";

export function findCollectionById(document: SyncDocument | undefined, collectionId: string): VariableCollectionDocument | null {
  if (!document) {
    return null;
  }

  return document.variables.find((collection) => collection.extensions.figmaSync.collectionId === collectionId) ?? null;
}

export function findVariableById(
  document: SyncDocument | undefined,
  variableId: string,
  collectionId?: string
): { collection: VariableCollectionDocument; token: VariableTokenDocument } | null {
  if (!document) {
    return null;
  }

  const collections = collectionId
    ? document.variables.filter((c) => c.extensions.figmaSync.collectionId === collectionId)
    : document.variables;

  for (const collection of collections) {
    const token = collection.tokens.find((candidate) => candidate.extensions.figmaSync.variableId === variableId);
    if (token) {
      return { collection, token };
    }
  }

  return null;
}

export function findStyleById(document: SyncDocument | undefined, styleId: string): StyleTokenDocument | null {
  if (!document) {
    return null;
  }

  for (const styleType of Object.keys(document.styles) as SyncStyleType[]) {
    const style = document.styles[styleType].find((candidate) => candidate.extensions.figmaSync.styleId === styleId);
    if (style) {
      return style;
    }
  }

  return null;
}
