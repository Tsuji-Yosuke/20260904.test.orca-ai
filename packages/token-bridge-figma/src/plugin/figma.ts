import { tokenTypeToVariableResolvedType } from "../core/document.js";
import { colorToHex, computeCollectionHash, serializeFigmaSnapshotToSyncDocument } from "../core/serialize.js";
import type {
  FigmaEffectStyleSnapshot,
  FigmaGridStyleSnapshot,
  FigmaPaintStyleSnapshot,
  FigmaSyncSnapshot,
  FigmaSyncWarning,
  FigmaTextStyleSnapshot,
  FigmaVariableRawValue,
  StyleTokenDocument,
  SyncDocument,
  VariableTokenDocument
} from "../core/types.js";
import { STYLE_TYPES } from "../core/document.js";
import { readEntityMetadata, type StoredEntityMetadata, writeEntityMetadata } from "./storage.js";

type MappedCollection = {
  collection: VariableCollection;
  sourceId: string;
  modeMap: Map<string, string>;
  warnings: FigmaSyncWarning[];
};

function normalizeAliasId(actualToSourceId: Map<string, string>, aliasId: string): string {
  return actualToSourceId.get(aliasId) ?? aliasId;
}

function normalizeArrayBoundVariables(
  boundVariables: Record<string, VariableAlias[]> | undefined,
  actualToSourceId: Map<string, string>
): Record<string, string | string[]> {
  const normalized: Record<string, string | string[]> = {};
  for (const [field, aliases] of Object.entries(boundVariables ?? {})) {
    normalized[field] = aliases.map((alias) => normalizeAliasId(actualToSourceId, alias.id));
  }
  return normalized;
}

function normalizeSingleBoundVariables(
  boundVariables: Record<string, VariableAlias | undefined> | undefined,
  actualToSourceId: Map<string, string>
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [field, alias] of Object.entries(boundVariables ?? {})) {
    if (alias) {
      normalized[field] = normalizeAliasId(actualToSourceId, alias.id);
    }
  }
  return normalized;
}

function readSourceId(entity: PluginDataMixin & { id: string }): string {
  return readEntityMetadata(entity).sourceId ?? entity.id;
}

// Figma で変数を「複製」すると pluginData（sourceId / managed / syncedHash）までコピーされ、
// 別々の変数が同じ sourceId を名乗る。ID で対応を取る同期では 2 つの変数が 1 つに潰れて見え、
// 片方が常に欠落する（PR #67〜#70 の実事故）。sourceId の持ち主を 1 つに定め、
// それ以外は「新しい変数」として扱い、pluginData も修復する。
// 持ち主の優先順位: sourceId が自分自身の id と一致する変数 > 先に現れた変数。
function healDuplicatedSourceIds(variables: Variable[]): void {
  const claimants = new Map<string, Variable[]>();
  for (const variable of variables) {
    const sourceId = readEntityMetadata(variable).sourceId;
    if (!sourceId) continue;
    const list = claimants.get(sourceId) ?? [];
    list.push(variable);
    claimants.set(sourceId, list);
  }

  for (const [sourceId, list] of claimants) {
    if (list.length < 2) continue;
    const owner = list.find((v) => v.id === sourceId) ?? list[0]!;
    for (const variable of list) {
      if (variable === owner) continue;
      // 引き継いだ同期履歴（managed / syncedHash / sourceId）を破棄し、新規変数として扱う
      writeEntityMetadata(variable, { sourceId: variable.id });
    }
  }
}

function hexToRgba(hex: string): RGBA {
  const normalized = hex.replace(/^#/, "");
  const source = normalized.length === 6 ? `${normalized}ff` : normalized;
  const parse = (index: number): number => parseInt(source.slice(index, index + 2), 16) / 255;
  return {
    r: parse(0),
    g: parse(2),
    b: parse(4),
    a: parse(6)
  };
}

export function createSolidPaintFromHex(hex: string): SolidPaint {
  const rgba = hexToRgba(hex);
  return {
    type: "SOLID",
    color: {
      r: rgba.r,
      g: rgba.g,
      b: rgba.b
    },
    opacity: rgba.a
  };
}

function isVariableAliasValue(value: unknown): value is { alias: string } {
  return typeof value === "object" && value !== null && "alias" in value;
}

function isHexValue(value: unknown): value is { hex: string } {
  return typeof value === "object" && value !== null && "hex" in value;
}

function buildActualToSourceIdMap(variables: Variable[]): Map<string, string> {
  return new Map(variables.map((variable) => [variable.id, readSourceId(variable)]));
}

function invertModeIdMap(modeIdMap: Record<string, string> | undefined): Map<string, string> {
  return new Map(Object.entries(modeIdMap ?? {}).map(([sourceId, actualId]) => [actualId, sourceId]));
}

function normalizeVariableValue(
  modeId: string,
  value: VariableValue,
  normalizedModeId: string,
  actualToSourceId: Map<string, string>
): [string, FigmaVariableRawValue] {
  if (typeof value === "object" && value !== null && "type" in value && (value as { type: string }).type === "VARIABLE_ALIAS") {
    return [normalizedModeId, { alias: normalizeAliasId(actualToSourceId, (value as { id: string }).id) }];
  }
  if (typeof value === "object" && value !== null && "r" in value && "g" in value && "b" in value) {
    return [normalizedModeId, { hex: colorToHex(value as RGBA) }];
  }
  return [normalizedModeId, value as string | number | boolean];
}

export async function readLocalSyncDocument(): Promise<SyncDocument> {
  const collections = (await figma.variables.getLocalVariableCollectionsAsync()).filter((collection) => !collection.remote);
  const variables = (await figma.variables.getLocalVariablesAsync()).filter((variable) => !variable.remote);

  healDuplicatedSourceIds(variables);
  const actualToSourceId = buildActualToSourceIdMap(variables);
  const collectionSourceIds = new Map(collections.map((collection) => [collection.id, readSourceId(collection)]));
  const collectionModeSourceIds = new Map(
    collections.map((collection) => [collection.id, invertModeIdMap(readEntityMetadata(collection).modeIdMap)])
  );

  // Identify extended collections and build a lookup of variables by ID
  const extendedCollections = collections
    .filter((c) => c.isExtension) as unknown as ExtendedVariableCollection[];
  const variableById = new Map(variables.map((v) => [v.id, v]));

  // For each extended collection, read variable values via valuesByModeForCollectionAsync
  const extendedVariableValues = new Map<string, Map<string, Record<string, VariableValue>>>();
  for (const extCollection of extendedCollections) {
    const varValues = new Map<string, Record<string, VariableValue>>();
    for (const variableId of extCollection.variableIds) {
      const variable = variableById.get(variableId);
      if (variable) {
        const values = await variable.valuesByModeForCollectionAsync(extCollection as unknown as VariableCollection);
        varValues.set(variableId, values);
      }
    }
    extendedVariableValues.set(extCollection.id, varValues);
  }

  // Build snapshot variable entries for extended collections
  const extendedCollectionIds = new Set(extendedCollections.map((c) => c.id));
  const extendedSnapshotVariables: FigmaSyncSnapshot["variables"]["variables"] = [];
  for (const extCollection of extendedCollections) {
    const modeSourceIds = collectionModeSourceIds.get(extCollection.id) ?? new Map<string, string>();
    const collectionSourceId = collectionSourceIds.get(extCollection.id) ?? extCollection.id;
    const varValues = extendedVariableValues.get(extCollection.id);

    for (const variableId of extCollection.variableIds) {
      const variable = variableById.get(variableId);
      if (!variable) continue;
      const values = varValues?.get(variableId) ?? {};

      extendedSnapshotVariables.push({
        id: readSourceId(variable),
        collectionId: collectionSourceId,
        name: variable.name,
        resolvedType: variable.resolvedType,
        description: variable.description,
        valuesByMode: Object.fromEntries(
          Object.entries(values).map(([modeId, value]) => {
            const normalizedModeId = modeSourceIds.get(modeId) ?? modeId;
            return normalizeVariableValue(modeId, value, normalizedModeId, actualToSourceId);
          })
        ),
        // Don't inherit parent variable's syncMetadata — extended collection
        // tokens are tracked independently. The same Figma Variable object is
        // shared, so readEntityMetadata(variable) returns the parent's state.
        syncMetadata: {}
      });
    }
  }

  const snapshot: FigmaSyncSnapshot = {
    variables: {
      collections: collections.map((collection) => {
        const metadata = readEntityMetadata(collection);
        const actualToSourceModeId = invertModeIdMap(metadata.modeIdMap);

        // For Extended Collections, defaultModeId uses a short form (e.g. "4:22")
        // while mode entries use the full form (e.g. "VariableCollectionId:4:52/4:22").
        // Resolve defaultModeId to match the normalized mode IDs.
        let resolvedDefaultModeId = actualToSourceModeId.get(collection.defaultModeId) ?? collection.defaultModeId;
        const normalizedModes = collection.modes.map((mode) => ({
          modeId: actualToSourceModeId.get(mode.modeId) ?? mode.modeId,
          name: mode.name
        }));
        if (!normalizedModes.some((m) => m.modeId === resolvedDefaultModeId) && normalizedModes.length > 0) {
          // Fallback: find the mode whose raw ID ends with the defaultModeId
          const match = collection.modes.find((m) => m.modeId.endsWith(`/${collection.defaultModeId}`));
          if (match) {
            resolvedDefaultModeId = actualToSourceModeId.get(match.modeId) ?? match.modeId;
          } else {
            resolvedDefaultModeId = normalizedModes[0]!.modeId;
          }
        }

        const isExtended = extendedCollectionIds.has(collection.id);
        // parentVariableCollectionId は環境によって読めないことがある（#26）。
        // API → 前回 scan 時に pluginData へ永続化した値、の順で解決する。
        const apiParentId = isExtended
          ? (collection as unknown as { parentVariableCollectionId?: string }).parentVariableCollectionId
          : undefined;
        const parentId = isExtended
          ? (apiParentId ? collectionSourceIds.get(apiParentId) ?? apiParentId : metadata.parentCollectionId)
          : undefined;
        // 解決できたら pluginData に永続化し、次回 API が読めなくても復元できるようにする
        if (isExtended && parentId && metadata.parentCollectionId !== parentId) {
          writeEntityMetadata(collection, { ...metadata, parentCollectionId: parentId });
        }

        return {
          id: collectionSourceIds.get(collection.id) ?? collection.id,
          name: collection.name,
          defaultModeId: resolvedDefaultModeId,
          modes: normalizedModes,
          ...(isExtended ? { isExtension: true } : {}),
          ...(parentId ? { parentCollectionId: parentId } : {}),
          syncMetadata: metadata
        };
      }),
      variables: [
        // Parent collection variables (original logic)
        ...variables.map((variable) => ({
          id: readSourceId(variable),
          collectionId: collectionSourceIds.get(variable.variableCollectionId) ?? variable.variableCollectionId,
          name: variable.name,
          resolvedType: variable.resolvedType,
          description: variable.description,
          valuesByMode: Object.fromEntries(
            Object.entries(variable.valuesByMode).map(([modeId, value]) => {
              const normalizedModeId =
                collectionModeSourceIds.get(variable.variableCollectionId)?.get(modeId) ?? modeId;
              return normalizeVariableValue(modeId, value, normalizedModeId, actualToSourceId);
            })
          ),
          syncMetadata: readEntityMetadata(variable)
        })),
        // Extended collection variables (new)
        ...extendedSnapshotVariables
      ]
    },
    styles: {
      paint: (await figma.getLocalPaintStylesAsync()).map<FigmaPaintStyleSnapshot>((style) => ({
        id: readSourceId(style),
        name: style.name,
        description: style.description,
        paints: [...style.paints],
        boundVariables: normalizeArrayBoundVariables(style.boundVariables, actualToSourceId),
        syncMetadata: readEntityMetadata(style)
      })),
      text: (await figma.getLocalTextStylesAsync()).map<FigmaTextStyleSnapshot>((style) => ({
        id: readSourceId(style),
        name: style.name,
        description: style.description,
        fontName: style.fontName,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        paragraphSpacing: style.paragraphSpacing,
        paragraphIndent: style.paragraphIndent,
        textCase: style.textCase,
        textDecoration: style.textDecoration,
        boundVariables: normalizeSingleBoundVariables(style.boundVariables, actualToSourceId),
        syncMetadata: readEntityMetadata(style)
      })),
      effect: (await figma.getLocalEffectStylesAsync()).map<FigmaEffectStyleSnapshot>((style) => ({
        id: readSourceId(style),
        name: style.name,
        description: style.description,
        effects: [...style.effects],
        boundVariables: normalizeArrayBoundVariables(style.boundVariables, actualToSourceId),
        syncMetadata: readEntityMetadata(style)
      })),
      grid: (await figma.getLocalGridStylesAsync()).map<FigmaGridStyleSnapshot>((style) => ({
        id: readSourceId(style),
        name: style.name,
        description: style.description,
        layoutGrids: [...style.layoutGrids],
        boundVariables: normalizeArrayBoundVariables(style.boundVariables, actualToSourceId),
        syncMetadata: readEntityMetadata(style)
      }))
    }
  };

  return serializeFigmaSnapshotToSyncDocument(snapshot);
}

async function getVariablesForCollection(collection: VariableCollection): Promise<Variable[]> {
  const variables = await Promise.all(collection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)));
  return variables.filter((value): value is Variable => Boolean(value));
}

function reconcileCollectionModes(
  collection: VariableCollection,
  targetCollection: SyncDocument["variables"][number],
  metadata: StoredEntityMetadata
): { sourceToActualModeId: Record<string, string>; warnings: FigmaSyncWarning[] } {
  const unmatchedModes = [...collection.modes];
  const sourceToActualModeId: Record<string, string> = {};
  const warnings: FigmaSyncWarning[] = [];

  const takeUnmatchedMode = (predicate: (mode: { modeId: string; name: string }) => boolean) => {
    const index = unmatchedModes.findIndex(predicate);
    if (index < 0) {
      return null;
    }
    return unmatchedModes.splice(index, 1)[0] ?? null;
  };

  for (const targetMode of targetCollection.modes) {
    let actualMode =
      (metadata.modeIdMap?.[targetMode.modeId] &&
        collection.modes.find((candidate) => candidate.modeId === metadata.modeIdMap?.[targetMode.modeId])) ??
      takeUnmatchedMode((candidate) => candidate.name === targetMode.name);

    if (!actualMode) {
      collection.addMode(targetMode.name);
      actualMode = collection.modes[collection.modes.length - 1] ?? null;
    }

    if (!actualMode) {
      continue;
    }
    if (actualMode.name !== targetMode.name) {
      collection.renameMode(actualMode.modeId, targetMode.name);
    }
    sourceToActualModeId[targetMode.modeId] = actualMode.modeId;
  }

  const targetDefaultModeId = sourceToActualModeId[targetCollection.defaultModeId];
  if (targetDefaultModeId && collection.defaultModeId !== targetDefaultModeId) {
    warnings.push({
      kind: "unsupported-token",
      name: targetCollection.name,
      reason: "Collection default mode cannot be updated through the Figma plugin API."
    });
  }

  return { sourceToActualModeId, warnings };
}

async function ensureCollection(targetCollection: SyncDocument["variables"][number]): Promise<MappedCollection> {
  const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection =
    existingCollections.find((candidate) => readSourceId(candidate) === targetCollection.extensions.figmaSync.collectionId) ??
    existingCollections.find((candidate) => candidate.name === targetCollection.name);

  if (!collection) {
    collection = figma.variables.createVariableCollection(targetCollection.name);
  }

  collection.name = targetCollection.name;
  const metadata = readEntityMetadata(collection);
  const { sourceToActualModeId, warnings } = reconcileCollectionModes(collection, targetCollection, metadata);

  const nextCollectionMetadata: StoredEntityMetadata = {
    ...metadata,
    sourceId: targetCollection.extensions.figmaSync.collectionId,
    syncedHash: targetCollection.extensions.figmaSync.updatedHash,
    managed: true,
    modeIdMap: sourceToActualModeId
  };
  writeEntityMetadata(collection, nextCollectionMetadata);

  return {
    collection,
    sourceId: targetCollection.extensions.figmaSync.collectionId,
    modeMap: new Map(
      targetCollection.modes.map((mode) => [mode.modeId, sourceToActualModeId[mode.modeId] ?? collection.defaultModeId])
    ),
    warnings
  };
}

async function ensureVariable(
  mappedCollection: MappedCollection,
  token: VariableTokenDocument
): Promise<Variable> {
  const collectionVariables = await getVariablesForCollection(mappedCollection.collection);
  let variable =
    collectionVariables.find((candidate) => readSourceId(candidate) === token.extensions.figmaSync.variableId) ??
    collectionVariables.find((candidate) => candidate.name === token.name);

  if (!variable) {
    variable = figma.variables.createVariable(
      token.name,
      mappedCollection.collection,
      tokenTypeToVariableResolvedType(token.type)
    );
  }

  variable.name = token.name;
  variable.description = token.description;
  writeEntityMetadata(variable, {
    sourceId: token.extensions.figmaSync.variableId,
    syncedHash: token.extensions.figmaSync.updatedHash,
    managed: true
  });
  return variable;
}

function resolveVariableModeValue(rawValue: unknown, variableLookup: Map<string, Variable>): VariableValue | null {
  if (isVariableAliasValue(rawValue)) {
    const aliased = variableLookup.get(rawValue.alias);
    return aliased ? figma.variables.createVariableAlias(aliased) : null;
  }

  if (isHexValue(rawValue)) {
    return hexToRgba(rawValue.hex);
  }

  return rawValue as VariableValue;
}

function collectAliasCycleWarnings(document: SyncDocument): {
  warnings: FigmaSyncWarning[];
  cyclicVariableIds: Set<string>;
} {
  const aliasByVariableId = new Map<string, string[]>();

  for (const collection of document.variables) {
    for (const token of collection.tokens) {
      const aliases = Object.values(token.extensions.figmaSync.modeValues)
        .filter(isVariableAliasValue)
        .map((value) => value.alias);
      aliasByVariableId.set(token.extensions.figmaSync.variableId, aliases);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const warnings: FigmaSyncWarning[] = [];
  const cyclicVariableIds = new Set<string>();

  const visit = (variableId: string, trail: string[]) => {
    if (visiting.has(variableId)) {
      for (const trailId of trail.concat(variableId)) {
        cyclicVariableIds.add(trailId);
      }
      warnings.push({
        kind: "unsupported-token",
        name: trail.concat(variableId).join(" -> "),
        reason: "Variable alias cycle is not supported."
      });
      return;
    }
    if (visited.has(variableId)) {
      return;
    }

    visiting.add(variableId);
    for (const nextId of aliasByVariableId.get(variableId) ?? []) {
      visit(nextId, trail.concat(variableId));
    }
    visiting.delete(variableId);
    visited.add(variableId);
  };

  for (const variableId of aliasByVariableId.keys()) {
    visit(variableId, []);
  }

  return { warnings, cyclicVariableIds };
}

function findVariableBinding(
  binding: unknown,
  variableLookup: Map<string, Variable>
): Variable | null {
  if (typeof binding === "string") {
    return variableLookup.get(binding) ?? null;
  }
  if (Array.isArray(binding) && typeof binding[0] === "string") {
    return variableLookup.get(binding[0]) ?? null;
  }
  return null;
}

function findStyleBySourceId<T extends BaseStyle>(styles: T[], sourceId: string, name: string): T | undefined {
  return styles.find((style) => readSourceId(style) === sourceId) ?? styles.find((style) => style.name === name);
}

function markStyleAsManaged(style: BaseStyle, styleToken: StyleTokenDocument): void {
  writeEntityMetadata(style, {
    sourceId: styleToken.extensions.figmaSync.styleId,
    syncedHash: styleToken.extensions.figmaSync.updatedHash,
    managed: true
  });
}

function prepareStyle<T extends BaseStyle>(style: T, styleToken: StyleTokenDocument): T {
  style.name = styleToken.name;
  style.description = styleToken.description;
  return style;
}

async function ensureStyle<T extends BaseStyle>(
  styles: T[],
  styleToken: StyleTokenDocument,
  createStyle: () => T
): Promise<T> {
  const sourceId = styleToken.extensions.figmaSync.styleId;
  return prepareStyle(findStyleBySourceId(styles, sourceId, styleToken.name) ?? createStyle(), styleToken);
}

function applyPaintStyleToken(
  style: PaintStyle,
  styleToken: StyleTokenDocument,
  variableLookup: Map<string, Variable>,
  warnings: FigmaSyncWarning[]
): void {
  if (typeof styleToken.value !== "string") {
    warnings.push({
      kind: "unsupported-style",
      styleType: "paint",
      styleId: styleToken.extensions.figmaSync.styleId,
      name: styleToken.name,
      reason: "Paint style value must be a solid color string."
    });
    return;
  }

  let paint = createSolidPaintFromHex(styleToken.value);
  const colorBinding = styleToken.extensions.figmaSync.boundVariables?.color;
  const boundVariable = findVariableBinding(colorBinding, variableLookup);
  if (boundVariable) {
    paint = figma.variables.setBoundVariableForPaint(paint, "color", boundVariable);
  }

  style.paints = [paint];
  markStyleAsManaged(style, styleToken);
}

async function applyTextStyleToken(
  style: TextStyle,
  styleToken: StyleTokenDocument,
  variableLookup: Map<string, Variable>
): Promise<void> {
  const value = styleToken.value as Record<string, unknown>;
  const fontName = {
    family: String(value.fontFamily ?? "Inter"),
    style: String(value.fontStyle ?? "Regular")
  };
  await figma.loadFontAsync(fontName);
  style.fontName = fontName;
  style.fontSize = Number(value.fontSize ?? 16);
  style.lineHeight = value.lineHeight as LineHeight;
  style.letterSpacing = value.letterSpacing as LetterSpacing;
  style.paragraphSpacing = Number(value.paragraphSpacing ?? 0);
  style.paragraphIndent = Number(value.paragraphIndent ?? 0);
  style.textCase = String(value.textCase ?? "ORIGINAL") as TextCase;
  style.textDecoration = String(value.textDecoration ?? "NONE") as TextDecoration;

  for (const [field, binding] of Object.entries(styleToken.extensions.figmaSync.boundVariables ?? {})) {
    style.setBoundVariable(field as VariableBindableTextField, findVariableBinding(binding, variableLookup));
  }

  markStyleAsManaged(style, styleToken);
}

function applyEffectStyleToken(style: EffectStyle, styleToken: StyleTokenDocument): void {
  style.effects = styleToken.value as Effect[];
  markStyleAsManaged(style, styleToken);
}

function applyGridStyleToken(style: GridStyle, styleToken: StyleTokenDocument): void {
  style.layoutGrids = styleToken.value as LayoutGrid[];
  markStyleAsManaged(style, styleToken);
}

async function applyStyleToken(
  styleToken: StyleTokenDocument,
  variableLookup: Map<string, Variable>,
  warnings: FigmaSyncWarning[]
): Promise<void> {
  switch (styleToken.styleType) {
    case "paint": {
      const style = await ensureStyle(await figma.getLocalPaintStylesAsync(), styleToken, () => figma.createPaintStyle());
      applyPaintStyleToken(style, styleToken, variableLookup, warnings);
      return;
    }
    case "text": {
      const style = await ensureStyle(await figma.getLocalTextStylesAsync(), styleToken, () => figma.createTextStyle());
      await applyTextStyleToken(style, styleToken, variableLookup);
      return;
    }
    case "effect": {
      const style = await ensureStyle(await figma.getLocalEffectStylesAsync(), styleToken, () => figma.createEffectStyle());
      applyEffectStyleToken(style, styleToken);
      return;
    }
    case "grid": {
      const style = await ensureStyle(await figma.getLocalGridStylesAsync(), styleToken, () => figma.createGridStyle());
      applyGridStyleToken(style, styleToken);
      return;
    }
  }
}

async function deleteManagedVariables(variableIds: string[]): Promise<void> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = (
    await Promise.all(collections.flatMap((collection) => collection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id))))
  ).filter((value): value is Variable => Boolean(value));

  for (const variableId of variableIds) {
    const variable = variables.find(
      (candidate) => readSourceId(candidate) === variableId && Boolean(readEntityMetadata(candidate).managed)
    );
    variable?.remove();
  }
}

async function deleteManagedStyles(styleIds: string[]): Promise<void> {
  const styleGroups = await Promise.all([
    figma.getLocalPaintStylesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.getLocalEffectStylesAsync(),
    figma.getLocalGridStylesAsync()
  ]);

  const styles = styleGroups.flat();
  for (const styleId of styleIds) {
    const style = styles.find(
      (candidate) => readSourceId(candidate) === styleId && Boolean(readEntityMetadata(candidate).managed)
    );
    style?.remove();
  }
}

export async function applySyncDocumentToFigma(
  document: SyncDocument,
  options?: { deleteVariableIds?: string[]; deleteStyleIds?: string[] }
): Promise<FigmaSyncWarning[]> {
  const aliasValidation = collectAliasCycleWarnings(document);
  const warnings: FigmaSyncWarning[] = [...aliasValidation.warnings];
  const variableLookup = new Map<string, Variable>();

  if (options?.deleteVariableIds?.length) {
    await deleteManagedVariables(options.deleteVariableIds);
  }
  if (options?.deleteStyleIds?.length) {
    await deleteManagedStyles(options.deleteStyleIds);
  }

  const mappedCollections = new Map<string, MappedCollection>();
  for (const collection of document.variables) {
    const mappedCollection = await ensureCollection(collection);
    mappedCollections.set(collection.extensions.figmaSync.collectionId, mappedCollection);
    warnings.push(...mappedCollection.warnings);
  }

  const pendingAssignments: Array<{ variable: Variable; token: VariableTokenDocument; modeMap: Map<string, string> }> = [];

  for (const collection of document.variables) {
    const mappedCollection = mappedCollections.get(collection.extensions.figmaSync.collectionId);
    if (!mappedCollection) {
      continue;
    }

    for (const token of collection.tokens) {
      const variable = await ensureVariable(mappedCollection, token);
      variableLookup.set(token.extensions.figmaSync.variableId, variable);
      pendingAssignments.push({ variable, token, modeMap: mappedCollection.modeMap });
    }
  }

  for (const assignment of pendingAssignments) {
    if (aliasValidation.cyclicVariableIds.has(assignment.token.extensions.figmaSync.variableId)) {
      continue;
    }
    for (const [modeId, rawValue] of Object.entries(assignment.token.extensions.figmaSync.modeValues)) {
      const actualModeId = assignment.modeMap.get(modeId);
      if (!actualModeId) {
        continue;
      }

      const resolvedValue = resolveVariableModeValue(rawValue, variableLookup);
      if (resolvedValue === null) {
        warnings.push({
          kind: "unsupported-token",
          name: assignment.token.name,
          reason: `Alias target for ${assignment.token.name} is missing in the current import set.`
        });
        continue;
      }
      assignment.variable.setValueForMode(actualModeId, resolvedValue);
    }
  }

  for (const styleType of STYLE_TYPES) {
    for (const styleToken of document.styles[styleType]) {
      await applyStyleToken(styleToken, variableLookup, warnings);
    }
  }

  return warnings;
}
