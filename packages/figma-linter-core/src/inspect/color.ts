/**
 * Color セクションの検知ルール (Background = 地色 + State オーバーレイ / On = 中の要素)。
 * 例外・閾値 (StateLayers 判定・インタラクション状態・ワイルドカード On・Error 状態・alpha 上限) は
 * rules.ts のカタログから取得する。
 */

import type {
  LintAdapter,
  LintCollection,
  LintNode,
  LintPaint,
  LintVariable,
} from "../adapter";
import type { CheckRow, CheckSection, CheckStatus, FillChip, FixDiff } from "../check-types";
import {
  ERROR_STATE_ON_NAME,
  INTERACTION_STATE,
  isStateLayerName,
  OVERLAY_ALPHA_MAX,
  WILDCARD_ON_NAMES,
} from "../rules";
import {
  colorPool,
  diffKey,
  ensureDefault,
  fullTokenName,
  matchColor,
  type ColorLookup,
} from "./candidates";
import {
  bindFillAt,
  bindFirstSolidFill,
  collectContentLeaves,
  firstSolidIndex,
  leafName,
  onPairName,
  paintColorVariableId,
  readFills,
  resolveColor,
  segments,
  stripOn,
  toHex,
} from "./read";
import type { FixEntry } from "./types";

/**
 * ノードの State バリアント値を返す (例 "Hover")。Instance は componentProperties、Component
 * (Variant) は variantProperties (どちらもアダプタの variantValues に集約)、いずれも取れなければ
 * 名前 "…, State=Hover" から拾う。無ければ null。
 */
function stateVariant(node: LintNode): string | null {
  const values = node.variantValues();
  if (values) {
    for (const [k, val] of Object.entries(values)) {
      if (/^state\b/i.test(k) && typeof val === "string") return val;
    }
  }
  const m = /(?:^|[,\s])state\s*=\s*([^,]+)/i.exec(node.name);
  return m ? (m[1] ?? "").trim() : null;
}

/** ノードがインタラクション状態 (Hover/Pressed/Focus 等。背景にオーバーレイが乗り得る) か。 */
function isInteractionState(node: LintNode): boolean {
  const s = stateVariant(node);
  return !!s && INTERACTION_STATE.test(s.trim());
}

/** ノードの State バリアント値が Error か (On スロットに UI/Error を許容する条件)。 */
function isErrorState(node: LintNode): boolean {
  const s = stateVariant(node);
  return !!s && /^error$/i.test(s.trim());
}

/** SOLID 塗りの実効 alpha (paint.opacity × バインド色の alpha)。地色とオーバーレイの切り分けに使う。 */
function paintEffectiveAlpha(
  paint: LintPaint,
  node: LintNode,
  boundVar: LintVariable | null,
): number {
  const op = paint.opacity;
  if (boundVar) {
    const c = resolveColor(boundVar, node);
    if (c) return op * (c.a ?? 1);
  }
  return op; // 生値 SOLID の alpha は opacity へ正規化済み (adapter.ts 参照)
}

/** ノードの可視 SOLID 塗りの index 群 (fills 配列内の実 index。バインド対象に使う)。 */
function visibleSolidIndices(fills: LintPaint[]): number[] {
  const out: number[] = [];
  fills.forEach((p, i) => {
    if (p.visible !== false && p.type === "SOLID") out.push(i);
  });
  return out;
}

interface ContainerOutcome {
  row: CheckRow;
  /** 中の要素が使うべき On ペアの期待名 (背景が確定できないとき null)。 */
  expectedOnName: string | null;
}

/** 変数が node 文脈で解決する色の hex 表記 (解決不能は "?")。横断チェックでも使う。 */
export function resolvedHex(variable: LintVariable, node: LintNode): string {
  const color = resolveColor(variable, node);
  return color ? toHex(color) : "?";
}

/** 分類済みの 1 枚の可視 SOLID 塗り (バインドする実 index 付き)。 */
export interface SolidFill {
  index: number;
  paint: LintPaint;
  boundVar: LintVariable | null;
  /** Color System の StateLayers/* トークンにバインド済みか。 */
  isStateLayer: boolean;
  /** 実効 alpha (地色とオーバーレイの切り分け用)。 */
  effAlpha: number;
}

/** 地色 / オーバーレイ分類の結果 (検査・横断で共有)。 */
export interface ContainerFills {
  /** 可視 SOLID 塗りがあるか。false = 背景なし (na)。 */
  hasFills: boolean;
  /** 背景代表 (地色のうち最下層)。無ければ null。 */
  base: SolidFill | null;
  /** オーバーレイ (StateLayers / インタラクション状態の半透明生値)。 */
  overlays: SolidFill[];
}

/**
 * ノードの可視 SOLID 塗りを地色 / オーバーレイに分類する。
 * StateLayers バインド = オーバーレイ。インタラクション状態の半透明な生値もオーバーレイ
 * (= 「Hover なのに生値オーバーレイ」を拾う)。それ以外 (不透明 or 通常状態) は地色で、
 * 最下層 (最小 index) を背景代表にする。残りの地色 fill は評価対象外。
 */
export async function classifyContainerFills(
  node: LintNode,
  colorSystem: LintCollection,
  adapter: LintAdapter,
): Promise<ContainerFills> {
  const fills = readFills(node);
  const indices = fills ? visibleSolidIndices(fills) : [];
  if (!fills || indices.length === 0) {
    return { hasFills: false, base: null, overlays: [] };
  }

  // 各可視 SOLID を解決して分類の材料を作る。
  const infos: SolidFill[] = [];
  for (const index of indices) {
    const paint = fills[index]!;
    const aliasId = paintColorVariableId(paint);
    const boundVar = aliasId ? await adapter.variable(aliasId) : null;
    const isStateLayer =
      !!boundVar && boundVar.collectionId === colorSystem.id && isStateLayerName(boundVar.name);
    infos.push({
      index,
      paint,
      boundVar,
      isStateLayer,
      effAlpha: paintEffectiveAlpha(paint, node, boundVar),
    });
  }

  const interaction = isInteractionState(node);
  const overlays = infos.filter(
    (f) => f.isStateLayer || (interaction && !f.boundVar && f.effAlpha < OVERLAY_ALPHA_MAX),
  );
  const overlaySet = new Set(overlays);
  const bases = infos.filter((f) => !overlaySet.has(f));
  const base = bases.length
    ? bases.reduce((a, b) => (a.index <= b.index ? a : b))
    : null;
  return { hasFills: true, base, overlays };
}

/** fill チップ群の集計合否 (いずれか fail → fail / いずれか pass → pass / それ以外 na)。 */
function aggregateFillStatus(chips: FillChip[]): CheckStatus {
  if (chips.some((c) => c.status === "fail")) return "fail";
  if (chips.some((c) => c.status === "pass")) return "pass";
  return "na";
}

/**
 * 地色 (背景) fill 1 枚を検査する。従来の Background 検査ロジックそのもの:
 * Color System の group/variant 非 On なら pass、On/別物/生値なら fail で値マッチ修正を積む。
 * On ペアの期待名 (confident なときだけ) も返す。
 */
async function evalBaseFill(
  node: LintNode,
  fill: SolidFill,
  colorSystem: LintCollection,
  colors: ColorLookup,
  adapter: LintAdapter,
  fixes: FixEntry[],
): Promise<{ chip: FillChip; expectedOnName: string | null; fixable: boolean }> {
  const { paint, boundVar, index } = fill;
  const inColorSystem = !!boundVar && boundVar.collectionId === colorSystem.id;
  const isOn = boundVar ? leafName(boundVar.name).startsWith("On") : false;
  const twoSeg = boundVar ? segments(boundVar.name).length === 2 : false;
  const correct = inColorSystem && twoSeg && !isOn;

  // 期待コンテナ色 (修正先 / On ペア基準) を決める。confident = On ペアを強制してよいか。
  let intended: LintVariable | null = null;
  let confident = false;
  if (correct && boundVar) {
    intended = boundVar;
    confident = true; // 既に正しい背景 → group/variant は確実。
  } else if (inColorSystem && isOn && twoSeg && boundVar) {
    // 誤って On カラーが背景に使われている → 非 On 版へ寄せる (名前変換は決定的)。
    intended = colors.byName.get(stripOn(boundVar.name)) ?? null;
    confident = intended !== null;
  } else {
    // 生値 or 別コレクション → 現在色に近い非 On System カラーを探す。色マッチは曖昧なので
    // 背景の付け替え (同色) は行うが、中の要素へ特定 On トークンを強制はしない (誤伝播防止)。
    const current = boundVar
      ? resolveColor(boundVar, node)
      : paint.color
        ? { r: paint.color.r, g: paint.color.g, b: paint.color.b, a: paint.opacity }
        : null;
    if (current) intended = matchColor(current, colors.nonOn);
    confident = false;
  }

  const currentHex = boundVar ? resolvedHex(boundVar, node) : paint.color ? toHex(paint.color) : "?";
  const chipName = boundVar ? await fullTokenName(boundVar, adapter) : currentHex;
  const fixable = !correct && !!intended;
  if (!correct && intended) {
    const target = intended;
    const after = await fullTokenName(target, adapter);
    const afterValue = resolvedHex(target, node);
    const pool = await colorPool(colors.nonOn, adapter);
    const diff: FixDiff = {
      id: "",
      label: "Background",
      kind: "color",
      before: chipName,
      after,
      beforeValue: currentHex,
      afterValue,
      defaultId: target.id,
      candidates: ensureDefault(pool, target.id, after, afterValue),
    };
    diff.id = diffKey(diff);
    fixes.push({
      diff,
      apply: (override) => bindFillAt(adapter, node, index, override ?? target),
    });
  }

  let expectedOnName: string | null = null;
  if (confident && intended) {
    const segs = segments(intended.name);
    if (segs.length === 2) expectedOnName = onPairName(segs[0] ?? "", segs[1] ?? "");
  }

  return {
    chip: { role: "base", status: correct ? "pass" : "fail", chip: chipName, swatch: currentHex },
    expectedOnName,
    fixable,
  };
}

/**
 * オーバーレイ (StateLayers) fill 1 枚を検査する。
 * StateLayers/* にバインド済みなら pass、生値 / 別トークンなら fail で、近似する StateLayers
 * トークンが見つかれば「適用」での修正候補を積む (alpha 込みで色マッチ)。
 */
async function evalOverlayFill(
  node: LintNode,
  fill: SolidFill,
  colors: ColorLookup,
  adapter: LintAdapter,
  fixes: FixEntry[],
): Promise<{ chip: FillChip; fixable: boolean }> {
  const { paint, boundVar, index, isStateLayer } = fill;
  const currentHex = boundVar ? resolvedHex(boundVar, node) : paint.color ? toHex(paint.color) : "?";
  if (isStateLayer && boundVar) {
    return {
      chip: {
        role: "overlay",
        status: "pass",
        chip: await fullTokenName(boundVar, adapter),
        swatch: currentHex,
      },
      fixable: false,
    };
  }
  // 生値 or StateLayers 以外 → fail。最近傍 StateLayers トークンへ寄せられれば修正候補にする。
  const current = boundVar
    ? resolveColor(boundVar, node)
    : paint.color
      ? { r: paint.color.r, g: paint.color.g, b: paint.color.b, a: paint.opacity }
      : null;
  const target = current ? matchColor(current, colors.stateLayers) : null;
  const chipName = boundVar ? await fullTokenName(boundVar, adapter) : currentHex;
  if (target) {
    const after = await fullTokenName(target, adapter);
    const afterValue = resolvedHex(target, node);
    const pool = await colorPool(colors.stateLayers, adapter);
    const diff: FixDiff = {
      id: "",
      label: "State Layer",
      kind: "color",
      before: chipName,
      after,
      beforeValue: currentHex,
      afterValue,
      defaultId: target.id,
      candidates: ensureDefault(pool, target.id, after, afterValue),
    };
    diff.id = diffKey(diff);
    fixes.push({
      diff,
      apply: (override) => bindFillAt(adapter, node, index, override ?? target),
    });
  }
  return {
    chip: { role: "overlay", status: "fail", chip: chipName, swatch: currentHex },
    fixable: !!target,
  };
}

/**
 * 背景 (コンテナ) Fill を検査し、On ペアの期待名も決める。
 *
 * State=Hover などのインタラクション状態では背景が「地色 + StateLayers の半透明オーバーレイ」の
 * 2 枚 fill になり得る。可視 SOLID を地色 / オーバーレイに分類し、地色は従来どおり Color System
 * の背景トークンとして、オーバーレイは StateLayers トークンとして検査する。オーバーレイがある
 * ときだけ row.fills に内訳を入れ、UI が 1 行 2 チップで見せる (無いときは従来の単一 chip)。
 */
async function checkContainerFill(
  node: LintNode,
  colorSystem: LintCollection,
  colors: ColorLookup,
  adapter: LintAdapter,
  fixes: FixEntry[],
): Promise<ContainerOutcome> {
  const { hasFills, base, overlays } = await classifyContainerFills(node, colorSystem, adapter);
  if (!hasFills) {
    return {
      row: { id: "color.background", label: "Background", status: "na", chip: "—", fixable: false },
      expectedOnName: null,
    };
  }

  let baseChip: FillChip | null = null;
  let expectedOnName: string | null = null;
  let fixable = false;
  if (base) {
    const r = await evalBaseFill(node, base, colorSystem, colors, adapter, fixes);
    baseChip = r.chip;
    expectedOnName = r.expectedOnName;
    fixable = fixable || r.fixable;
  }

  const overlayChips: FillChip[] = [];
  for (const ov of overlays) {
    const r = await evalOverlayFill(node, ov, colors, adapter, fixes);
    overlayChips.push(r.chip);
    fixable = fixable || r.fixable;
  }

  // 集計合否は実在する fill (地色 + オーバーレイ) から決める。
  const present: FillChip[] = [];
  if (baseChip) present.push(baseChip);
  present.push(...overlayChips);
  const status = aggregateFillStatus(present);

  // プレビュー Bg チップ / 単一表示用の代表値は地色優先 (無ければオーバーレイ)。
  const lead = baseChip ?? overlayChips[0] ?? null;

  // オーバーレイがあるときだけ内訳を持たせる (= 1 行 2 チップ)。地色が無い (Tab 等) ときは
  // 「地色なし」を表す na プレースホルダを先頭に置き、2 枚 fill の構造を読めるようにする。
  let rowFills: FillChip[] | undefined;
  if (overlayChips.length > 0) {
    const baseSlot: FillChip = baseChip ?? { role: "base", status: "na", chip: "—" };
    rowFills = [baseSlot, ...overlayChips];
  }

  // detail は地色の不備を優先し、地色が OK ならオーバーレイの不備を案内する。
  let detail: string | undefined;
  if (baseChip && baseChip.status === "fail") {
    detail = "Color System の背景カラー (On 以外) を指定してください。";
  } else if (overlayChips.some((c) => c.status === "fail")) {
    detail = "オーバーレイは Color System の StateLayers トークンを指定してください。";
  }

  return {
    row: {
      id: "color.background",
      label: "Background",
      status,
      chip: lead?.chip ?? "—",
      fixable: status === "fail" && fixable,
      swatch: lead?.swatch,
      fills: rowFills,
      detail,
    },
    expectedOnName,
  };
}

/** 中の要素 (テキスト / アイコン) の On カラーを検査する。 */
async function checkContentFill(
  node: LintNode,
  colorSystem: LintCollection,
  colors: ColorLookup,
  expectedOnName: string | null,
  adapter: LintAdapter,
  fixes: FixEntry[],
): Promise<CheckRow> {
  const leaves = collectContentLeaves(node);
  // State=Error のバリアントでは On スロットに UI/Error を許容する (背景に依らない例外)。
  const errorState = isErrorState(node);
  const expectedVar = expectedOnName ? colors.byName.get(expectedOnName) ?? null : null;
  // 期待 On トークンの名前は consumer 非依存。実数 (hex) は各 leaf のモード文脈で解決する。
  const expectedAfter = expectedVar ? await fullTokenName(expectedVar, adapter) : "";

  let relevant = 0;
  let allOk = true;
  // プレビューの On チップに出す色スウォッチ (最初の content leaf の現在色)。
  let firstHex: string | undefined;
  const chips = new Set<string>();
  for (const child of leaves) {
    const fills = readFills(child);
    const idx = fills ? firstSolidIndex(fills) : -1;
    if (!fills || idx === -1) continue;
    relevant++;
    const paint = fills[idx]!;
    const aliasId = paintColorVariableId(paint);
    const boundVar = aliasId ? await adapter.variable(aliasId) : null;
    const inColorSystem = !!boundVar && boundVar.collectionId === colorSystem.id;
    const isOn = boundVar ? leafName(boundVar.name).startsWith("On") : false;
    // ワイルドカード On (UI/OnPlaceholder / UI/OnDisabled): 背景に依らず常に許容。
    const isWildcardOn = inColorSystem && !!boundVar && WILDCARD_ON_NAMES.includes(boundVar.name);
    // State=Error バリアントでは UI/Error を On スロットに許容。
    const errorOnAllowed = errorState && inColorSystem && boundVar?.name === ERROR_STATE_ON_NAME;
    // 期待 On ペアが確実なら厳密一致、曖昧/不明なら「Color System の On カラー」で許容。
    const correct =
      isWildcardOn || errorOnAllowed
        ? true
        : expectedOnName
          ? inColorSystem && boundVar?.name === expectedOnName
          : inColorSystem && isOn;
    // hex は実際に書き換える child のモード文脈で評価する (container とモードが異なる場合に正確)。
    const rawHex = paint.color ? toHex(paint.color) : "?";
    const childChip = boundVar ? await fullTokenName(boundVar, adapter) : rawHex;
    const childHex = boundVar ? resolvedHex(boundVar, child) : rawHex;
    if (firstHex === undefined) firstHex = childHex;
    chips.add(childChip);
    if (!correct) {
      allOk = false;
      // 強制修正は confident な期待 On がある (expectedVar 解決済み) ときだけ。
      if (expectedVar) {
        const target = expectedVar;
        const afterValue = resolvedHex(target, child);
        const pool = await colorPool(colors.on, adapter);
        const diff: FixDiff = {
          id: "",
          label: "On",
          kind: "color",
          before: childChip,
          after: expectedAfter,
          beforeValue: childHex,
          afterValue,
          defaultId: target.id,
          candidates: ensureDefault(pool, target.id, expectedAfter, afterValue),
        };
        diff.id = diffKey(diff);
        fixes.push({
          diff,
          apply: (override) => bindFirstSolidFill(adapter, child, override ?? target),
        });
      }
    }
  }

  if (relevant === 0) {
    return { id: "color.on", label: "On", status: "na", chip: "—", fixable: false };
  }
  const status: CheckStatus = allOk ? "pass" : "fail";
  const chip = chips.size === 1 ? [...chips][0] ?? "—" : "mixed";
  return {
    id: "color.on",
    label: "On",
    status,
    chip,
    fixable: status === "fail" && !!expectedVar,
    swatch: firstHex,
    detail:
      status === "fail"
        ? // 期待 On トークンが Color System に実在する (expectedVar 解決済み) ときだけ名指しする。
          expectedOnName && expectedVar
          ? `中の要素は ${expectedOnName} を指定してください。`
          : "中の要素は Color System の On カラーを指定してください。"
        : undefined,
  };
}

export async function buildColorSection(
  node: LintNode,
  colorSystem: LintCollection | null,
  colors: ColorLookup,
  adapter: LintAdapter,
  fixes: FixEntry[],
): Promise<CheckSection> {
  if (!colorSystem) {
    return {
      id: "color",
      title: "Color",
      rows: [
        { id: "color.background", label: "Background", status: "na", chip: "—", fixable: false, detail: "Color System コレクションが見つかりません。" },
        { id: "color.on", label: "On", status: "na", chip: "—", fixable: false },
      ],
    };
  }
  const container = await checkContainerFill(node, colorSystem, colors, adapter, fixes);
  const content = await checkContentFill(node, colorSystem, colors, container.expectedOnName, adapter, fixes);
  return { id: "color", title: "Color", rows: [container.row, content] };
}
