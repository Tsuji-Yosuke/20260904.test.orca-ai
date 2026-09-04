/// <reference types="@figma/plugin-typings" />

import type {
  BaseTokenSnapshot,
  RefOption,
  SwapperGroup,
  SwapperStep,
} from "../shared/messages";

/**
 * Figma の Variable Collection を「唯一のマスター」として、トークンの構造・既定参照・
 * スケール基準を live Variables API から導出する。プラグイン側にはトークン名・値・
 * エイリアスをハードコードしない。
 *
 * 設計の要:
 * - swapper の「出荷時参照先」(defaultRefName) と reset の戻し先は、Figma 上の
 *   "Expressive" プリセット (Extended Collection) が定義するエイリアスから解決する。
 *   → 出荷時 = Expressive が構造的に一貫し、DEFAULT_SYS_ALIAS 等の手書き表が不要になる。
 * - 番兵 (none / full / 0) は値で判定する (名前リテラルを持たない)。
 * - スケールの冪等性基準 (shipped) は pluginData のベースラインに置く (Figma 側データ)。
 */

// ===========================================================================
// 共通ヘルパー (main 全体で共有。旧 code.ts から移管)
// ===========================================================================

/** `figma.variables.getVariableByIdAsync` の memo 付きラッパ。 */
export async function getVarCached(
  id: string,
  cache: Map<string, Variable | null>,
): Promise<Variable | null> {
  const cached = cache.get(id);
  if (cached !== undefined) return cached;
  const variable = await figma.variables.getVariableByIdAsync(id);
  cache.set(id, variable);
  return variable;
}

/** `figma.variables.getVariableCollectionByIdAsync` の memo 付きラッパ。 */
export async function getCollCached(
  id: string,
  cache: Map<string, VariableCollection | null>,
): Promise<VariableCollection | null> {
  const cached = cache.get(id);
  if (cached !== undefined) return cached;
  const collection = await figma.variables.getVariableCollectionByIdAsync(id);
  cache.set(id, collection);
  return collection;
}

/** コレクション内の変数を name → Variable の Map にする (名前引き用)。 */
export async function mapVariablesByName(
  collection: VariableCollection,
  cache: Map<string, Variable | null>,
): Promise<Map<string, Variable>> {
  const byName = new Map<string, Variable>();
  for (const varId of collection.variableIds) {
    const variable = await getVarCached(varId, cache);
    if (variable) byName.set(variable.name, variable);
  }
  return byName;
}

/** VariableValue がエイリアス参照 (VARIABLE_ALIAS) なら型を絞り込む。 */
export function asAlias(value: VariableValue | undefined): VariableAlias | null {
  return typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "VARIABLE_ALIAS"
    ? (value as VariableAlias)
    : null;
}

/** Extended Collection (isExtension) なら ExtendedVariableCollection として絞り込む。
 *  parentVariableCollectionId を読むために必要 (基底型には無い)。 */
export function asExtension(
  collection: VariableCollection,
): ExtendedVariableCollection | null {
  return collection.isExtension
    ? (collection as unknown as ExtendedVariableCollection)
    : null;
}

/** 2 つの VariableValue が等しいか (FLOAT は微小誤差許容、エイリアスは参照先 id で比較)。 */
export function valuesEqual(
  a: VariableValue | undefined,
  b: VariableValue | undefined,
): boolean {
  if (a === undefined || b === undefined) return false;
  if (typeof a === "number" && typeof b === "number")
    return Math.abs(a - b) < 1e-6;
  if (typeof a === "string" && typeof b === "string") return a === b;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b;
  const aa = asAlias(a);
  const ba = asAlias(b);
  if (aa && ba) return aa.id === ba.id;
  if (
    typeof a === "object" &&
    typeof b === "object" &&
    a !== null &&
    b !== null &&
    "r" in a &&
    "r" in b
  ) {
    const ca = a as RGBA;
    const cb = b as RGBA;
    return (
      ca.r === cb.r &&
      ca.g === cb.g &&
      ca.b === cb.b &&
      (ca.a ?? 1) === (cb.a ?? 1)
    );
  }
  return false;
}

// ===========================================================================
// コレクション分類 (層 = 名前ヒント + 構造、廃止/deprecated は除外)
// ===========================================================================

const RE_SYSTEM = /dimension system/i;
const RE_REFERENCE = /dimension reference/i;
const RE_TYPOGRAPHY = /typography/i;
/** プリセットを焼ける "System" 層 (Dimension System / Typography System) の名前判定。 */
const RE_PRESET_PARENT = /(dimension|typography)\s*system/i;
/** 廃止コレクション (分類・走査の対象外)。名前 or 先頭が廃止_ のトークンで判定。 */
const RE_DEPRECATED = /\(deprecated\)|deprecated/i;

export interface Classified {
  system: VariableCollection | null;
  reference: VariableCollection | null;
  typography: VariableCollection | null;
  typographySystem: VariableCollection | null;
  extensions: VariableCollection[];
}

/**
 * ローカルコレクションを層に振り分ける。System / Reference は名前で識別
 * (完全な接頭辞が無いファイルでも "system" / "reference" を含めばフォールバック)。
 * Typography は FontSize/* を持つ参照層 ("Typography References") を選ぶ。
 * "(deprecated)" を含むコレクションは全層判定から除外する。
 * Extended Collection (プリセット定義) は親が "System" 層のものだけ列挙する。
 */
export async function classifyCollections(): Promise<Classified> {
  const all = await figma.variables.getLocalVariableCollectionsAsync();
  const base = all.filter(
    (c) => !c.isExtension && !RE_DEPRECATED.test(c.name),
  );
  const typography =
    base.find((c) => RE_TYPOGRAPHY.test(c.name) && /reference/i.test(c.name)) ??
    base.find((c) => RE_TYPOGRAPHY.test(c.name) && !/system/i.test(c.name)) ??
    base.find((c) => RE_TYPOGRAPHY.test(c.name)) ??
    null;
  const system =
    base.find((c) => RE_SYSTEM.test(c.name)) ??
    base.find(
      (c) => /system/i.test(c.name) && !/(typography|color)/i.test(c.name),
    ) ??
    null;
  const reference =
    base.find((c) => RE_REFERENCE.test(c.name)) ??
    base.find((c) => c !== typography && /reference/i.test(c.name)) ??
    null;
  const typographySystem =
    base.find((c) => /typography\s*system/i.test(c.name)) ??
    base.find(
      (c) =>
        RE_TYPOGRAPHY.test(c.name) && /system/i.test(c.name) && c !== typography,
    ) ??
    base.find(
      (c) =>
        c !== system &&
        c !== typography &&
        c !== reference &&
        RE_PRESET_PARENT.test(c.name),
    ) ??
    null;
  const presetParentIds = new Set(
    base.filter((c) => RE_PRESET_PARENT.test(c.name)).map((c) => c.id),
  );
  const extensions = all.filter((c) => {
    const ext = asExtension(c);
    return ext !== null && presetParentIds.has(ext.parentVariableCollectionId);
  });
  return { system, reference, typography, typographySystem, extensions };
}

/**
 * 指定プリセット名 (例 "Expressive") の Extended Collection のうち、指定 parent を
 * 拡張するものの id 群を返す。reset 時に Dimension System / Typography System それぞれの
 * Expressive を選んで適用するのに使う。
 */
export function presetIdsForParent(
  extensions: VariableCollection[],
  parentId: string,
  presetName: string,
): string[] {
  const key = presetName.trim().toLowerCase();
  const ids: string[] = [];
  for (const extCollection of extensions) {
    if (extCollection.name.trim().toLowerCase() !== key) continue;
    const ext = asExtension(extCollection);
    if (ext && ext.parentVariableCollectionId === parentId) {
      ids.push(extCollection.id);
    }
  }
  return ids;
}

// ===========================================================================
// reset の戻し先プリセット (ユーザー仕様: Expressive が出荷時デフォルト)
// ===========================================================================

/** reset の戻し先プリセット名。出荷時デフォルト = このプリセットを適用した状態。 */
export const DEFAULT_PRESET_NAME = "Expressive";

export interface DefaultRef {
  id: string;
  name: string;
}

/**
 * 指定プリセット (Expressive) が parent (System) の各変数に定義する既定エイリアスの
 * 参照先を解決する。System 変数名 → 参照先 Reference 変数 (id + name)。
 * swapper の defaultRefName / reset の基準に使う。
 * プリセットが無い・override が無い変数はマップに載らない (呼び出し側でフォールバック)。
 */
export async function deriveDefaultAliasMap(
  parent: VariableCollection | null,
  extensions: VariableCollection[],
  varCache: Map<string, Variable | null>,
): Promise<Map<string, DefaultRef>> {
  const map = new Map<string, DefaultRef>();
  if (!parent) return map;
  const presetKey = DEFAULT_PRESET_NAME.trim().toLowerCase();
  for (const extCollection of extensions) {
    if (extCollection.name.trim().toLowerCase() !== presetKey) continue;
    const ext = asExtension(extCollection);
    if (!ext || ext.parentVariableCollectionId !== parent.id) continue;
    const modeMap = ext.modes.filter((m) =>
      parent.modes.some((pm) => pm.modeId === m.parentModeId),
    );
    if (modeMap.length === 0) continue;
    for (const varId of parent.variableIds) {
      const variable = await getVarCached(varId, varCache);
      if (!variable || variable.resolvedType !== "FLOAT") continue;
      if (map.has(variable.name)) continue;
      const byMode = await variable.valuesByModeForCollectionAsync(extCollection);
      for (const m of modeMap) {
        const alias = asAlias(byMode[m.modeId]);
        if (!alias) continue;
        const target = await getVarCached(alias.id, varCache);
        if (target) {
          map.set(variable.name, { id: target.id, name: target.name });
          break;
        }
      }
    }
  }
  return map;
}

// ===========================================================================
// 番兵 (端の固定値) — 値で判定する
// ===========================================================================

/** スケールの端 (number) を番兵とみなすか。0 以下 (none/0) と極大値 (full=99999 など) を端とする。 */
export function isSentinelValue(v: number): boolean {
  return v <= 0 || v >= 9999;
}

// ===========================================================================
// 命名パース (純粋ヘルパー・単体テスト対象)
// ===========================================================================

/** "Sizing/Radius/md" → { groupId: "Sizing/Radius", stepLabel: "md" }。'/' が無ければ同名。 */
export function splitGroupStep(name: string): {
  groupId: string;
  stepLabel: string;
} {
  const slash = name.lastIndexOf("/");
  return slash === -1
    ? { groupId: name, stepLabel: name }
    : { groupId: name.slice(0, slash), stepLabel: name.slice(slash + 1) };
}

/** Dimension System の段のセクション。Spacing/ 始まりは "spacing"、他は "sizing"。 */
export function dimensionSection(sysName: string): "spacing" | "sizing" {
  return /^Spacing\//.test(sysName) ? "spacing" : "sizing";
}

/** 役割接頭辞を外した段ラベル。"DisplaySmall" (役割 "Display") → "Small"。外せなければそのまま。 */
export function typoStepLabel(role: string, variant: string): string {
  return variant.startsWith(role) ? variant.slice(role.length) : variant;
}

// ===========================================================================
// スケール基準ベースライン (Figma 側 pluginData に保持。コードにトークンを持たない)
// ===========================================================================

const SIZING_BASELINE_KEY = "baseline:sizing";
const FONTSIZE_BASELINE_KEY = "baseline:fontSize";

function readBaseline(key: string): Record<string, number> {
  try {
    const raw = figma.root.getPluginData(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeBaseline(key: string, value: Record<string, number>): void {
  try {
    figma.root.setPluginData(key, JSON.stringify(value));
  } catch {
    // pluginData が使えない環境でも他機能を止めない。
  }
}

/**
 * 指定コレクションの prefix トークン (FLOAT 生値) の出荷時ベースラインを返す。
 * 未記録のトークンは現在値で補完して記録する (新規トークンに追従)。
 * これがスケール (機能2) の冪等性基準であり、reset の Reference 復元先になる。
 */
async function ensureBaseline(
  key: string,
  collection: VariableCollection,
  prefix: string,
  cache: Map<string, Variable | null>,
): Promise<Record<string, number>> {
  const stored = readBaseline(key);
  const mode = collection.defaultModeId;
  let changed = false;
  for (const varId of collection.variableIds) {
    const variable = await getVarCached(varId, cache);
    if (!variable || variable.resolvedType !== "FLOAT") continue;
    if (!variable.name.startsWith(prefix)) continue;
    if (variable.name in stored) continue;
    const raw = (await variable.valuesByModeForCollectionAsync(collection))[mode];
    if (typeof raw === "number") {
      stored[variable.name] = raw;
      changed = true;
    }
  }
  if (changed) writeBaseline(key, stored);
  return stored;
}

export function ensureSizingBaseline(
  reference: VariableCollection,
  cache: Map<string, Variable | null>,
): Promise<Record<string, number>> {
  return ensureBaseline(SIZING_BASELINE_KEY, reference, "Sizing/", cache);
}

export function ensureFontSizeBaseline(
  typography: VariableCollection,
  cache: Map<string, Variable | null>,
): Promise<Record<string, number>> {
  return ensureBaseline(FONTSIZE_BASELINE_KEY, typography, "FontSize/", cache);
}

// ===========================================================================
// 機能2: スケール対象トークン (Reference の Sizing/* スカラー)
// ===========================================================================

/**
 * スケール対象 (Reference の Sizing/* スカラー、番兵は値で除外) を返す。
 * shipped はベースライン (出荷時生値) で、計算は常にこの値を基準に冪等。
 */
export async function deriveBaseTokens(): Promise<BaseTokenSnapshot[]> {
  const { reference } = await classifyCollections();
  if (!reference) throw new Error("Dimension Reference コレクションが見つかりません。");
  const cache = new Map<string, Variable | null>();
  const baseline = await ensureSizingBaseline(reference, cache);
  const mode = reference.defaultModeId;

  const tokens: BaseTokenSnapshot[] = [];
  for (const varId of reference.variableIds) {
    const variable = await getVarCached(varId, cache);
    if (!variable || variable.resolvedType !== "FLOAT") continue;
    if (!variable.name.startsWith("Sizing/")) continue;
    // shipped はベースライン (出荷時生値) を基準にする。理論上 ensureBaseline 後は
    // 全 Sizing/* が載るが、念のため未記録は現在値で補完する。
    const fromBaseline = baseline[variable.name];
    let value: number;
    if (typeof fromBaseline === "number") {
      value = fromBaseline;
    } else {
      const raw = (await variable.valuesByModeForCollectionAsync(reference))[
        mode
      ];
      value = typeof raw === "number" ? raw : 0;
    }
    if (isSentinelValue(value)) continue; // none / full は対象外
    tokens.push({
      id: variable.id,
      name: variable.name,
      group: "base",
      shipped: value,
    });
  }
  tokens.sort((a, b) => a.shipped - b.shipped || a.name.localeCompare(b.name));
  return tokens;
}

// ===========================================================================
// 機能3: Token Swapper のグループ導出 (System 実変数を走査・テーブル不要)
// ===========================================================================

/** Reference スケール (FLOAT・番兵除外) を name→RefOption の昇順リストにする。 */
async function deriveOptions(
  reference: VariableCollection,
  prefix: string,
  cache: Map<string, Variable | null>,
): Promise<RefOption[]> {
  const mode = reference.defaultModeId;
  const options: RefOption[] = [];
  for (const varId of reference.variableIds) {
    const variable = await getVarCached(varId, cache);
    if (!variable || variable.resolvedType !== "FLOAT") continue;
    if (!variable.name.startsWith(prefix)) continue;
    const raw = (await variable.valuesByModeForCollectionAsync(reference))[mode];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    if (isSentinelValue(raw)) continue;
    options.push({ id: variable.id, name: variable.name, value: raw });
  }
  options.sort((a, b) => a.value - b.value || a.name.localeCompare(b.name));
  return options;
}

/**
 * Token Swapper のグループ一覧を live から導出する。
 * - Dimension System: 各 FLOAT 変数を走査し、Sizing/Spacing グループを構築。
 *   options = Dimension Reference の Sizing/* (番兵除外・昇順)。
 * - Typography System: 末尾が /FontSize の変数を役割ごとに走査して構築。
 *   options = Typography References の FontSize スケール (昇順)。
 * defaultRefName は Expressive プリセットの既定エイリアス (無ければ現在の参照先)。
 * defaultRef が options に含まれない段 (番兵を指す等) は固定とみなし除外する。
 */
export async function deriveSwapperGroups(): Promise<SwapperGroup[]> {
  const { system, reference, typography, typographySystem, extensions } =
    await classifyCollections();
  if (!system || !reference) {
    throw new Error("Dimension System / Reference コレクションが見つかりません。");
  }
  const cache = new Map<string, Variable | null>();
  const groups = new Map<string, SwapperGroup>();

  // --- Dimension ---
  const dimOptions = await deriveOptions(reference, "Sizing/", cache);
  const dimDefaults = await deriveDefaultAliasMap(system, extensions, cache);
  const sysMode = system.defaultModeId;
  for (const varId of system.variableIds) {
    const variable = await getVarCached(varId, cache);
    if (!variable || variable.resolvedType !== "FLOAT") continue;
    const sysName = variable.name;
    const current = asAlias(
      (await variable.valuesByModeForCollectionAsync(system))[sysMode],
    );
    const defaultRefName = await resolveDefaultRefName(
      sysName,
      dimDefaults,
      current,
      cache,
    );
    // 既定参照先が候補 (番兵除外済みスケール) に無ければ固定段 → swapper 対象外。
    if (!dimOptions.some((o) => o.name === defaultRefName)) continue;
    const { groupId, stepLabel } = splitGroupStep(sysName);
    const step: SwapperStep = {
      id: variable.id,
      step: stepLabel,
      defaultRefName,
      currentRefId: current ? current.id : null,
    };
    upsertGroup(groups, groupId, {
      id: groupId,
      label: groupId,
      section: dimensionSection(sysName),
      steps: [step],
      options: dimOptions,
    });
  }

  // --- Typography ---
  if (typographySystem && typography) {
    const fontOptions = await deriveOptions(typography, "FontSize/", cache);
    if (fontOptions.length > 0) {
      const typoDefaults = await deriveDefaultAliasMap(
        typographySystem,
        extensions,
        cache,
      );
      const typoMode = typographySystem.defaultModeId;
      for (const varId of typographySystem.variableIds) {
        const variable = await getVarCached(varId, cache);
        if (!variable || variable.resolvedType !== "FLOAT") continue;
        const sysName = variable.name;
        if (!sysName.endsWith("/FontSize")) continue;
        const current = asAlias(
          (await variable.valuesByModeForCollectionAsync(typographySystem))[
            typoMode
          ],
        );
        const defaultRefName = await resolveDefaultRefName(
          sysName,
          typoDefaults,
          current,
          cache,
        );
        if (!fontOptions.some((o) => o.name === defaultRefName)) continue;
        const segments = sysName.split("/");
        const groupId = segments[0] ?? sysName; // Display / Headline / ...
        const variant = segments[1] ?? sysName; // DisplaySmall ...
        const stepLabel = typoStepLabel(groupId, variant);
        const step: SwapperStep = {
          id: variable.id,
          step: stepLabel,
          defaultRefName,
          currentRefId: current ? current.id : null,
        };
        upsertGroup(groups, groupId, {
          id: groupId,
          label: groupId,
          section: "typography",
          steps: [step],
          options: fontOptions,
        });
      }
    }
  }

  return [...groups.values()];
}

/** 既定参照先名を解決する: Expressive プリセット優先、無ければ現在の参照先。 */
async function resolveDefaultRefName(
  sysName: string,
  defaults: Map<string, DefaultRef>,
  current: VariableAlias | null,
  cache: Map<string, Variable | null>,
): Promise<string> {
  const preset = defaults.get(sysName);
  if (preset) return preset.name;
  if (current) {
    const target = await getVarCached(current.id, cache);
    if (target) return target.name;
  }
  return "";
}

/** 同じ groupId のグループに step を追加、無ければ新規作成。 */
function upsertGroup(
  groups: Map<string, SwapperGroup>,
  groupId: string,
  seed: SwapperGroup,
): void {
  const existing = groups.get(groupId);
  if (existing) {
    existing.steps.push(...seed.steps);
  } else {
    groups.set(groupId, seed);
  }
}
