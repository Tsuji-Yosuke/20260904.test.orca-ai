import { createEmptySyncDocument, isReferenceValue, referenceToPath } from "./document.js";
import { computeContentHash } from "./hash.js";
import { computeCollectionHash } from "./serialize.js";
import type { StyleTokenDocument, SyncDocument, SyncStyleType, VariableTokenDocument } from "./types.js";

function walkTokenTree(
  node: Record<string, unknown>,
  path: string[],
  visit: (path: string[], tokenNode: Record<string, unknown>) => void
): void {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) {
      continue;
    }

    if (
      value &&
      typeof value === "object" &&
      "$type" in (value as Record<string, unknown>) &&
      "$value" in (value as Record<string, unknown>)
    ) {
      visit([...path, key], value as Record<string, unknown>);
      continue;
    }

    walkTokenTree(value as Record<string, unknown>, [...path, key], visit);
  }
}

function classifyRawValue(value: unknown): unknown {
  if (isReferenceValue(value)) {
    return { alias: referenceToPath(value).join("/") };
  }
  if (typeof value === "string" && value.startsWith("#")) {
    return { hex: value };
  }
  return value;
}

function isLegacyModeIndexedValue(rawValue: unknown, modeExtension: unknown): boolean {
  return (
    rawValue !== null &&
    typeof rawValue === "object" &&
    !Array.isArray(rawValue) &&
    !modeExtension
  );
}

function parseLegacyValueByMode(rawValue: Record<string, unknown>): { normalized: Record<string, unknown>; modeValues: Record<string, unknown> } {
  const normalized: Record<string, unknown> = {};
  const modeValues: Record<string, unknown> = {};

  for (const [modeId, value] of Object.entries(rawValue)) {
    normalized[modeId] = value;
    modeValues[modeId] = classifyRawValue(value);
  }

  return { normalized, modeValues };
}

function parseDtcgValue(
  rawValue: unknown,
  modeExtension: Record<string, unknown> | undefined,
  modeNameToId: Map<string, string>,
  defaultModeId: string
): { normalized: Record<string, unknown>; modeValues: Record<string, unknown> } {
  const normalized: Record<string, unknown> = {};
  const modeValues: Record<string, unknown> = {};

  if (modeExtension) {
    for (const [modeName, value] of Object.entries(modeExtension)) {
      const modeId = modeNameToId.get(modeName) ?? modeName;
      normalized[modeId] = value;
      modeValues[modeId] = classifyRawValue(value);
    }
  } else {
    normalized[defaultModeId] = rawValue;
    modeValues[defaultModeId] = classifyRawValue(rawValue);
  }

  return { normalized, modeValues };
}

function collectionNameFromFilePath(filePath: string): string {
  return filePath.split("/")[filePath.split("/").length - 1]!.replace(/\.json$/g, "");
}

export function parseRepoFilesToSyncDocument(repoFiles: Record<string, string>): SyncDocument {
  const document = createEmptySyncDocument();

  for (const [filePath, fileContents] of Object.entries(repoFiles)) {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(fileContents) as Record<string, unknown>;
    } catch (error) {
      document.warnings.push({
        kind: "sync-error",
        name: filePath,
        reason: error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON."
      });
      continue;
    }

    if (filePath.includes("/variables/")) {
      const collectionMeta = ((payload.$extensions as Record<string, unknown> | undefined)?.figmaSync ??
        {}) as Record<string, unknown>;
      const fallbackCollectionName = collectionNameFromFilePath(filePath);

      const collection = {
        id: String(collectionMeta.collectionId ?? filePath),
        name: String(collectionMeta.name ?? fallbackCollectionName),
        defaultModeId: String(collectionMeta.defaultModeId ?? ""),
        modes: (collectionMeta.modes as Array<{ modeId: string; name: string }> | undefined) ?? [],
        extensions: {
          figmaSync: {
            collectionId: String(collectionMeta.collectionId ?? filePath),
            name: String(collectionMeta.name ?? fallbackCollectionName),
            defaultModeId: String(collectionMeta.defaultModeId ?? ""),
            modes: (collectionMeta.modes as Array<{ modeId: string; name: string }> | undefined) ?? [],
            updatedHash:
              String(collectionMeta.updatedHash ?? "") ||
              computeCollectionHash({
                name: String(collectionMeta.name ?? fallbackCollectionName),
                defaultModeId: String(collectionMeta.defaultModeId ?? ""),
                modes: (collectionMeta.modes as Array<{ modeId: string; name: string }> | undefined) ?? []
              }),
            syncedHash: String(collectionMeta.syncedHash ?? ""),
            managed: Boolean(collectionMeta.managed)
          }
        },
        tokens: [] as VariableTokenDocument[]
      };

      const modeNameToId = new Map(collection.modes.map((m: { modeId: string; name: string }) => [m.name, m.modeId]));

      walkTokenTree(payload, [], (path, tokenNode) => {
        const tokenExtensions = (tokenNode.$extensions as Record<string, unknown> | undefined) ?? {};
        const extensions = (tokenExtensions.figmaSync ?? {}) as Record<string, unknown>;
        const modeExtension = tokenExtensions.mode as Record<string, unknown> | undefined;

        let parsedValue: { normalized: Record<string, unknown>; modeValues: Record<string, unknown> };
        if (isLegacyModeIndexedValue(tokenNode.$value, modeExtension)) {
          parsedValue = parseLegacyValueByMode(tokenNode.$value as Record<string, unknown>);
        } else {
          parsedValue = parseDtcgValue(tokenNode.$value, modeExtension, modeNameToId, collection.defaultModeId);
        }

        const modeValues = (extensions.modeValues as Record<string, unknown> | undefined) ?? parsedValue.modeValues;
        const token: VariableTokenDocument = {
          id: String(extensions.variableId ?? path.join("/")),
          name: path.join("/"),
          path,
          type: String(tokenNode.$type) as VariableTokenDocument["type"],
          description: String(tokenNode.$description ?? ""),
          value: parsedValue.normalized,
          extensions: {
            figmaSync: {
              variableId: String(extensions.variableId ?? path.join("/")),
              collectionId: String(extensions.collectionId ?? collection.id),
              modeValues,
              updatedHash:
                String(extensions.updatedHash ?? "") ||
                computeContentHash({
                  name: path.join("/"),
                  type: tokenNode.$type,
                  description: tokenNode.$description ?? "",
                  modeValues
                }),
              syncedHash: String(extensions.syncedHash ?? ""),
              managed: Boolean(extensions.managed)
            }
          }
        };
        collection.tokens.push(token);
      });

      document.variables.push(collection);
      continue;
    }

    if (filePath.includes("/styles/")) {
      const styleType = filePath.split("/")[filePath.split("/").length - 1]!.replace(/\.json$/g, "") as SyncStyleType;

      walkTokenTree(payload, [], (path, tokenNode) => {
        const extensions = ((tokenNode.$extensions as Record<string, unknown> | undefined)?.figmaSync ??
          {}) as Record<string, unknown>;
        const style: StyleTokenDocument = {
          id: String(extensions.styleId ?? path.join("/")),
          name: path.join("/"),
          path,
          styleType,
          tokenType: String(tokenNode.$type) as StyleTokenDocument["tokenType"],
          description: String(tokenNode.$description ?? ""),
          value: tokenNode.$value,
          extensions: {
            figmaSync: {
              styleId: String(extensions.styleId ?? path.join("/")),
              styleType,
              boundVariables: extensions.boundVariables as Record<string, unknown> | undefined,
              grid: extensions.grid,
              updatedHash:
                String(extensions.updatedHash ?? "") ||
                computeContentHash({
                  name: path.join("/"),
                  styleType,
                  description: tokenNode.$description ?? "",
                  value: tokenNode.$value
                }),
              syncedHash: String(extensions.syncedHash ?? ""),
              managed: Boolean(extensions.managed)
            }
          }
        };
        document.styles[styleType].push(style);
      });
    }
  }

  return document;
}
