import {
  createEmptySyncDocument,
  pathToReference,
  slugifyName,
  splitTokenPath,
  styleTokenType,
  variableResolvedTypeToTokenType
} from "./document.js";
import { computeContentHash } from "./hash.js";
import type {
  FigmaEffectStyleSnapshot,
  FigmaGridStyleSnapshot,
  FigmaPaintStyleSnapshot,
  FigmaSyncSnapshot,
  FigmaTextStyleSnapshot,
  FigmaVariableRawValue,
  SyncDocument,
  SyncStyleType,
  VariableCollectionDocument,
  VariableTokenDocument,
  StyleTokenDocument
} from "./types.js";

export function computeCollectionHash(collection: {
  name: string;
  defaultModeId: string;
  modes: Array<{ modeId: string; name: string }>;
}): string {
  return computeContentHash({
    name: collection.name,
    defaultModeId: collection.defaultModeId,
    modes: collection.modes
  });
}

function roundChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}

function toHexChannel(value: number): string {
  return roundChannel(value).toString(16).padStart(2, "0");
}

export function colorToHex(color: RGB | RGBA): string {
  const alpha = "a" in color ? color.a : 1;
  return `#${toHexChannel(color.r)}${toHexChannel(color.g)}${toHexChannel(color.b)}${toHexChannel(alpha)}`;
}

function isAliasValue(
  value: FigmaVariableRawValue
): value is { alias: string } {
  return typeof value === "object" && value !== null && "alias" in value;
}

function isHexValue(
  value: FigmaVariableRawValue
): value is { hex: string } {
  return typeof value === "object" && value !== null && "hex" in value;
}

function serializeVariableModeValue(
  modeValue: FigmaVariableRawValue,
  variableMap: Map<string, { name: string }>
): { normalized: unknown; raw: unknown } {
  if (isAliasValue(modeValue)) {
    const aliasVariable = variableMap.get(modeValue.alias);
    return {
      normalized: aliasVariable ? pathToReference(splitTokenPath(aliasVariable.name)) : `{missing.${modeValue.alias}}`,
      raw: { alias: modeValue.alias }
    };
  }

  if (isHexValue(modeValue)) {
    return { normalized: modeValue.hex, raw: { hex: modeValue.hex } };
  }

  return { normalized: modeValue, raw: modeValue };
}

type StyleSerializerResult =
  | { kind: "value"; value: unknown }
  | { kind: "warning"; warning: SyncDocument["warnings"][number] };

function serializePaintStyle(style: FigmaSyncSnapshot["styles"]["paint"][number]): StyleSerializerResult {
  if (style.paints.length !== 1 || style.paints[0]?.type !== "SOLID") {
    return {
      kind: "warning",
      warning: {
        kind: "unsupported-style" as const,
        styleType: "paint" as const,
        styleId: style.id,
        name: style.name,
        reason: "Only single solid paint styles are supported in v1."
      }
    };
  }

  const paint = style.paints[0];
  return {
    kind: "value",
    value: colorToHex({
      ...paint.color,
      a: paint.opacity ?? 1
    })
  };
}

function serializeTextStyle(style: FigmaSyncSnapshot["styles"]["text"][number]): StyleSerializerResult {
  return {
    kind: "value",
    value: {
      fontFamily: style.fontName.family,
      fontStyle: style.fontName.style,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      paragraphSpacing: style.paragraphSpacing,
      paragraphIndent: style.paragraphIndent,
      textCase: style.textCase,
      textDecoration: style.textDecoration
    }
  };
}

function serializeEffectStyle(style: FigmaSyncSnapshot["styles"]["effect"][number]): StyleSerializerResult {
  const unsupported = style.effects.filter((effect) => effect.type !== "DROP_SHADOW" && effect.type !== "INNER_SHADOW");
  if (unsupported.length > 0) {
    return {
      kind: "warning",
      warning: {
        kind: "unsupported-style" as const,
        styleType: "effect" as const,
        styleId: style.id,
        name: style.name,
        reason: "Only shadow effects are supported in v1."
      }
    };
  }

  return { kind: "value", value: style.effects };
}

function serializeGridStyle(style: FigmaSyncSnapshot["styles"]["grid"][number]): StyleSerializerResult {
  return { kind: "value", value: style.layoutGrids };
}

const styleSerializers: Record<
  SyncStyleType,
  (style: FigmaSyncSnapshot["styles"][SyncStyleType][number]) => StyleSerializerResult
> = {
  paint: (style) => serializePaintStyle(style as FigmaPaintStyleSnapshot),
  text: (style) => serializeTextStyle(style as FigmaTextStyleSnapshot),
  effect: (style) => serializeEffectStyle(style as FigmaEffectStyleSnapshot),
  grid: (style) => serializeGridStyle(style as FigmaGridStyleSnapshot)
};

function computeVariableHash(token: VariableTokenDocument): string {
  return computeContentHash({
    name: token.name,
    type: token.type,
    description: token.description,
    modeValues: token.extensions.figmaSync.modeValues
  });
}

function computeStyleHash(token: StyleTokenDocument): string {
  return computeContentHash({
    name: token.name,
    styleType: token.styleType,
    description: token.description,
    value: token.value,
    boundVariables: token.extensions.figmaSync.boundVariables ?? {}
  });
}

function collectIntoNestedObject(root: Record<string, unknown>, path: string[], leaf: unknown): void {
  let cursor: Record<string, unknown> = root;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index]!;
    cursor[segment] = (cursor[segment] as Record<string, unknown> | undefined) ?? {};
    cursor = cursor[segment] as Record<string, unknown>;
  }

  const lastSegment = path[path.length - 1];
  if (lastSegment) {
    cursor[lastSegment] = leaf;
  }
}

export function serializeFigmaSnapshotToSyncDocument(snapshot: FigmaSyncSnapshot): SyncDocument {
  const document = createEmptySyncDocument();
  const variableMap = new Map(snapshot.variables.variables.map((variable) => [variable.id, { name: variable.name }]));

  for (const collection of snapshot.variables.collections) {
    const collectionModeIds = new Set(collection.modes.map((m) => m.modeId));

    // Match variables by collectionId first. For Extended Collections (which
    // share variables with a parent collection), variables have the parent's
    // collectionId — so we fall back to matching by mode overlap.
    let matchedVariables = snapshot.variables.variables
      .filter((variable) => variable.collectionId === collection.id);
    if (matchedVariables.length === 0) {
      matchedVariables = snapshot.variables.variables
        .filter((variable) => Object.keys(variable.valuesByMode).some((modeId) => collectionModeIds.has(modeId)));
    }

    const tokens = matchedVariables
      .map<VariableTokenDocument>((variable) => {
        const path = splitTokenPath(variable.name);
        const modeValues: Record<string, unknown> = {};
        const normalizedValue: Record<string, unknown> = {};

        for (const [modeId, modeValue] of Object.entries(variable.valuesByMode)) {
          // Only include mode values that belong to this collection
          if (!collectionModeIds.has(modeId)) {
            continue;
          }
          const serialized = serializeVariableModeValue(modeValue, variableMap);
          modeValues[modeId] = serialized.raw;
          normalizedValue[modeId] = serialized.normalized;
        }

        const token: VariableTokenDocument = {
          id: variable.id,
          name: variable.name,
          path,
          type: variableResolvedTypeToTokenType(variable.resolvedType),
          description: variable.description ?? "",
          value: normalizedValue,
          extensions: {
            figmaSync: {
              variableId: variable.id,
              collectionId: collection.id,
              modeValues,
              updatedHash: "",
              syncedHash: variable.syncMetadata?.syncedHash ?? "",
              managed: Boolean(variable.syncMetadata?.managed)
            }
          }
        };

        token.extensions.figmaSync.updatedHash = computeVariableHash(token);
        return token;
      });

    // Extended Collection なのに親を特定できない場合、独立コレクションとして出力すると
    // 親と同一パスの token を :root で上書きしてしまう（#26 の実害）。warning を出し、
    // repo ファイル出力からの除外用にマークする。
    const missingParent = Boolean(collection.isExtension) && !collection.parentCollectionId;
    if (missingParent) {
      document.warnings.push({
        kind: "sync-error",
        name: collection.name,
        reason:
          "Extended Collection の parentCollectionId を取得できませんでした。" +
          "独立コレクションとして出力すると親コレクションの値を上書きするため、このコレクションは PR に含めません。"
      });
    }

    document.variables.push({
      id: collection.id,
      name: collection.name,
      defaultModeId: collection.defaultModeId,
      modes: collection.modes,
      extensions: {
        figmaSync: {
          collectionId: collection.id,
          ...(missingParent ? { missingParentCollection: true } : {}),
          ...(collection.parentCollectionId ? { parentCollectionId: collection.parentCollectionId } : {}),
          name: collection.name,
          defaultModeId: collection.defaultModeId,
          modes: collection.modes,
          updatedHash: computeCollectionHash(collection),
          syncedHash: collection.syncMetadata?.syncedHash ?? "",
          managed: Boolean(collection.syncMetadata?.managed)
        }
      },
      tokens
    });
  }

  (Object.keys(snapshot.styles) as SyncStyleType[]).forEach((styleType) => {
    for (const style of snapshot.styles[styleType]) {
      const serialized = styleSerializers[styleType](style);

      if (serialized.kind === "warning") {
        document.warnings.push(serialized.warning);
        continue;
      }

      const token: StyleTokenDocument = {
        id: style.id,
        name: style.name,
        path: splitTokenPath(style.name),
        styleType,
        tokenType: styleTokenType(styleType),
        description: style.description ?? "",
        value: serialized.value,
        extensions: {
          figmaSync: {
            styleId: style.id,
            styleType,
            boundVariables: style.boundVariables ?? {},
            grid: styleType === "grid" ? serialized.value : undefined,
            updatedHash: "",
            syncedHash: style.syncMetadata?.syncedHash ?? "",
            managed: Boolean(style.syncMetadata?.managed)
          }
        }
      };

      token.extensions.figmaSync.updatedHash = computeStyleHash(token);
      document.styles[styleType].push(token);
    }
  });

  return document;
}

export function serializeSyncDocumentToRepoFiles(
  document: SyncDocument,
  targetDir: string,
  options?: {
    includeCollectionIds?: Set<string>;
    includeStyleTypes?: Set<SyncStyleType>;
  }
): Record<string, string> {
  const files: Record<string, string> = {};
  const cleanTargetDir = targetDir.replace(/\/+$/g, "");

  // ファイル名はコレクション名由来（slugifyName）のため、同名コレクション
  // （例: Dimension System と Typography System がそれぞれ持つ extended collection "Expressive"）が
  // 同じファイルに衝突して後勝ちで失われる。衝突時は親コレクション名を前置して一意化する。
  const collectionNameById = new Map(
    document.variables.map((collection) => [collection.extensions.figmaSync.collectionId, collection.name])
  );
  const slugUseCount = new Map<string, number>();
  for (const collection of document.variables) {
    const slug = slugifyName(collection.name);
    slugUseCount.set(slug, (slugUseCount.get(slug) ?? 0) + 1);
  }
  const fileSlugFor = (collection: VariableCollectionDocument): string => {
    const baseSlug = slugifyName(collection.name);
    if ((slugUseCount.get(baseSlug) ?? 0) <= 1) {
      return baseSlug;
    }
    const parentId = collection.extensions.figmaSync.parentCollectionId;
    const parentName = parentId ? collectionNameById.get(parentId) : undefined;
    return parentName ? `${slugifyName(parentName)}-${baseSlug}` : baseSlug;
  };

  for (const collection of document.variables) {
    if (options?.includeCollectionIds && !options.includeCollectionIds.has(collection.extensions.figmaSync.collectionId)) {
      continue;
    }
    // 親を特定できなかった Extended Collection は出力しない（#26。warning は document.warnings 側）
    if (collection.extensions.figmaSync.missingParentCollection) {
      continue;
    }

    const payload: Record<string, unknown> = {
      $extensions: {
        figmaSync: collection.extensions.figmaSync
      }
    };

    const modeIdToName = new Map(collection.modes.map((m) => [m.modeId, m.name]));
    const hasMultipleModes = collection.modes.length > 1;

    for (const token of collection.tokens) {
      const tokenValue = token.value as Record<string, unknown>;
      const defaultValue = tokenValue[collection.defaultModeId];

      let modeExtension: Record<string, unknown> | undefined;
      if (hasMultipleModes) {
        modeExtension = {};
        for (const [modeId, val] of Object.entries(tokenValue)) {
          const modeName = modeIdToName.get(modeId) ?? modeId;
          modeExtension[modeName] = val;
        }
      }

      collectIntoNestedObject(payload, token.path, {
        $type: token.type,
        $value: defaultValue,
        $description: token.description,
        $extensions: {
          ...(modeExtension ? { mode: modeExtension } : {}),
          figmaSync: token.extensions.figmaSync
        }
      });
    }

    files[`${cleanTargetDir}/variables/${fileSlugFor(collection)}.json`] = JSON.stringify(payload, null, 2);
  }

  (Object.keys(document.styles) as SyncStyleType[]).forEach((styleType) => {
    if (options?.includeStyleTypes && !options.includeStyleTypes.has(styleType)) {
      return;
    }

    const payload: Record<string, unknown> = {
      $extensions: {
        figmaSync: {
          styleType
        }
      }
    };

    for (const style of document.styles[styleType]) {
      collectIntoNestedObject(payload, style.path, {
        $type: style.tokenType,
        $value: style.value,
        $description: style.description,
        $extensions: {
          figmaSync: style.extensions.figmaSync
        }
      });
    }

    files[`${cleanTargetDir}/styles/${styleType}.json`] = JSON.stringify(payload, null, 2);
  });

  return files;
}
