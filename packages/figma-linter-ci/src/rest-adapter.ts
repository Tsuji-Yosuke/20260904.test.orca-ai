/**
 * @orca/figma-linter-core のアダプタ実装 (REST API 版・read-only)。
 *
 * GET /v1/files のノードツリーと GET /v1/files/:key/variables/local の Variables を、
 * 検査コアが要求する LintNode / LintVariable / LintAdapter に写像する。
 *
 * Plugin API との表現差はここで吸収する (アダプタ契約は core/src/adapter.ts のコメント参照):
 * - REST は既定値のプロパティを省略する → layoutMode=NONE / padding=0 / sizingMode=AUTO 等を補完。
 * - radius は cornerRadius / rectangleCornerRadii [TL,TR,BR,BL] → 四隅フィールド名へ写像。
 * - width / height は absoluteBoundingBox から読む (回転ノードは軸平行 bbox になる点に注意)。
 * - 生値 SOLID の alpha は color.a に載る → LintPaint.opacity へ正規化 (opacity × color.a)。
 * - 変数のモード解決 (Plugin API の resolveForConsumer 相当) は、祖先の explicitVariableModes →
 *   コレクションの defaultModeId の順で自前実装し、エイリアス連鎖を辿る。
 */

import type {
  LintAdapter,
  LintCollection,
  LintNode,
  LintPaint,
  LintVariable,
  RGBA,
} from "@orca/figma-linter-core";
import {
  isRestAlias,
  type RestColor,
  type RestFileResponse,
  type RestNodeJson,
  type RestVariable,
  type RestVariableCollection,
  type RestVariablesResponse,
} from "./rest-types";

/** Auto Layout / padding / radius を持ちうるフレーム系ノードか (REST の既定値補完の対象)。 */
function isFrameLike(type: string): boolean {
  return (
    type === "FRAME" || type === "COMPONENT" || type === "COMPONENT_SET" || type === "INSTANCE"
  );
}

/** 四隅フィールド名 → rectangleCornerRadii [TL,TR,BR,BL] の index。 */
const CORNER_INDEX: Record<string, number> = {
  topLeftRadius: 0,
  topRightRadius: 1,
  bottomRightRadius: 2,
  bottomLeftRadius: 3,
};

/** boundVariables.rectangleCornerRadii (マップ表現) のキー。CORNER_INDEX と同じ並び。 */
const RECT_CORNER_KEYS = [
  "RECTANGLE_TOP_LEFT_CORNER_RADIUS",
  "RECTANGLE_TOP_RIGHT_CORNER_RADIUS",
  "RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS",
  "RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS",
] as const;

/** COMPONENT 名 "Size=md, State=Hover" を軸値へパースする (形式外は null)。 */
export function parseVariantName(name: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const part of name.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) return null;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!key) return null;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export class RestNode implements LintNode {
  private kids: readonly RestNode[] | null = null;

  constructor(
    readonly json: RestNodeJson,
    readonly parent: RestNode | null,
  ) {}

  get id(): string {
    return this.json.id;
  }
  get type(): string {
    return this.json.type;
  }
  get name(): string {
    return this.json.name;
  }
  get visible(): boolean {
    return this.json.visible !== false;
  }

  num(field: string): number | null {
    const n = this.json;
    const finite = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    switch (field) {
      case "width":
        return finite(n.absoluteBoundingBox?.width);
      case "height":
        return finite(n.absoluteBoundingBox?.height);
      case "paddingTop":
      case "paddingBottom":
      case "paddingLeft":
      case "paddingRight":
        // Plugin API ではフレーム系は常に 0 既定で値を持つ。REST は 0 を省略するので補完する。
        return isFrameLike(n.type) ? finite(n[field]) ?? 0 : null;
      case "itemSpacing":
        return isFrameLike(n.type) ? finite(n.itemSpacing) ?? 0 : null;
      case "counterAxisSpacing":
        // 未設定 (null / 省略) はそのまま null (独立指定なし)。Plugin の itemSpacing ミラーとは
        // 表現が違うが、gapWrap 判定 (バインド有無 or itemSpacing との差) では同じ結論になる。
        return finite(n.counterAxisSpacing);
      case "topLeftRadius":
      case "topRightRadius":
      case "bottomRightRadius":
      case "bottomLeftRadius": {
        const idx = CORNER_INDEX[field]!;
        const corner = n.rectangleCornerRadii?.[idx];
        return finite(corner) ?? finite(n.cornerRadius) ?? (isFrameLike(n.type) ? 0 : null);
      }
      case "rotation":
        return finite(n.rotation) ?? 0;
      default:
        return finite((n as unknown as Record<string, unknown>)[field]);
    }
  }

  str(field: string): string | null {
    const n = this.json;
    switch (field) {
      case "layoutMode":
        return n.layoutMode ?? (isFrameLike(n.type) ? "NONE" : null);
      case "layoutWrap":
        return n.layoutWrap ?? (isFrameLike(n.type) ? "NO_WRAP" : null);
      case "primaryAxisSizingMode":
        return n.primaryAxisSizingMode ?? (isFrameLike(n.type) ? "AUTO" : null);
      case "counterAxisSizingMode":
        return n.counterAxisSizingMode ?? (isFrameLike(n.type) ? "AUTO" : null);
      default: {
        const v = (n as unknown as Record<string, unknown>)[field];
        return typeof v === "string" ? v : null;
      }
    }
  }

  boundVariableId(field: string): string | null {
    const bound = this.json.boundVariables;
    if (!bound) return null;
    const pick = (entry: unknown): string | null => {
      if (!entry) return null;
      if (Array.isArray(entry)) {
        const first = entry.find(isRestAlias);
        return first ? first.id : null;
      }
      return isRestAlias(entry) ? entry.id : null;
    };
    const direct = pick(bound[field]);
    if (direct) return direct;
    // width / height: REST は `size: { x, y }` で表現する (width/height キーは存在しない)。
    if (field === "width" || field === "height") {
      const size = bound["size"];
      if (size && typeof size === "object" && !Array.isArray(size)) {
        const entry = (size as Record<string, unknown>)[field === "width" ? "x" : "y"];
        return pick(entry);
      }
      return null;
    }
    // 四隅 radius: per-corner キーが無い場合のフォールバック。REST spec では集約表現は
    // `rectangleCornerRadii: {RECTANGLE_TOP_LEFT_CORNER_RADIUS, ...}` のマップ。防御的に
    // 配列表現・cornerRadius 単一キーも受ける (実データの形は spike で突合する)。
    const idx = CORNER_INDEX[field];
    if (idx !== undefined) {
      const rect = bound["rectangleCornerRadii"];
      if (Array.isArray(rect)) {
        const at = rect[idx];
        return at && isRestAlias(at) ? at.id : null;
      }
      if (rect && typeof rect === "object") {
        const at = (rect as Record<string, unknown>)[RECT_CORNER_KEYS[idx]!];
        return pick(at);
      }
      return pick(bound["cornerRadius"]);
    }
    return null;
  }

  fills(): LintPaint[] | null {
    // TEXT の文字単位で塗りが混在する場合、Plugin API は figma.mixed (→ アダプタは null) を
    // 返す。REST はデフォルトランの塗りをノードの fills に返してしまうため、
    // styleOverrideTable に fills を持つオーバーライドがあれば同じく null に落とす
    // (混在レイヤーを検査対象外にする判定をプラグインと揃える)。
    if (this.json.type === "TEXT" && this.hasCharacterFillOverrides()) return null;
    const fills = this.json.fills;
    if (!Array.isArray(fills)) return null;
    return fills.map((p) => {
      const solid = p.type === "SOLID" && p.color ? p.color : null;
      const boundId = p.boundVariables?.color?.id ?? null;
      // 生値 SOLID の alpha は color.a に載る (Plugin API では opacity) ので opacity へ畳む。
      // バインド済み塗りの color.a は「変数の解決済み alpha」であって paint 自体の不透明度では
      // ないため畳まない (畳むと変数解決時に alpha が二重に掛かる)。
      const rawAlpha = solid && !boundId ? (solid.a ?? 1) : 1;
      return {
        type: p.type,
        visible: p.visible !== false,
        opacity: (typeof p.opacity === "number" ? p.opacity : 1) * rawAlpha,
        color: solid ? { r: solid.r, g: solid.g, b: solid.b } : null,
        boundColorVariableId: boundId,
      };
    });
  }

  /** 文字単位の塗りオーバーライドが実際に使われているか。 */
  private hasCharacterFillOverrides(): boolean {
    const table = this.json.styleOverrideTable;
    if (!table) return false;
    const used = this.json.characterStyleOverrides?.filter((id) => id !== 0);
    // characterStyleOverrides が無い場合はテーブル全項目を対象にする (保守的に混在とみなす)。
    const ids = used && used.length > 0 ? [...new Set(used)].map(String) : Object.keys(table);
    return ids.some((id) => table[id]?.fills !== undefined);
  }

  children(): readonly RestNode[] {
    if (!this.kids) {
      this.kids = (this.json.children ?? []).map((c) => new RestNode(c, this));
    }
    return this.kids;
  }

  characters(): string | null {
    return this.json.type === "TEXT" ? this.json.characters ?? "" : null;
  }

  variantValues(): Record<string, string> | null {
    const out: Record<string, string> = {};
    // Instance: componentProperties の VARIANT 値。
    if (this.json.type === "INSTANCE" && this.json.componentProperties) {
      for (const [k, v] of Object.entries(this.json.componentProperties)) {
        if (v && v.type === "VARIANT" && typeof v.value === "string") out[k] = v.value;
      }
    }
    // Component (Variant): REST に variantProperties は無いので、Component Set 配下の
    // バリアント名 "Size=md, State=Hover" からパースする。
    if (this.json.type === "COMPONENT" && this.parent?.type === "COMPONENT_SET") {
      const parsed = parseVariantName(this.name);
      if (parsed) {
        for (const [k, v] of Object.entries(parsed)) {
          if (!(k in out)) out[k] = v;
        }
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  variantAxes(): string[] | null {
    if (this.json.type !== "COMPONENT_SET") return null;
    const defs = this.json.componentPropertyDefinitions;
    if (!defs) return null;
    const axes = Object.keys(defs).filter((k) => defs[k]?.type === "VARIANT");
    return axes.length > 0 ? axes : null;
  }

  /** 変数のモード解決: 自分 → 祖先の explicitVariableModes を近い順に探す (無ければ null)。 */
  explicitModeFor(collectionId: string): string | null {
    let node: RestNode | null = this;
    while (node) {
      const mode = node.json.explicitVariableModes?.[collectionId];
      if (mode) return mode;
      node = node.parent;
    }
    return null;
  }
}

class RestLintVariable implements LintVariable {
  constructor(
    readonly json: RestVariable,
    private readonly adapter: RestLintAdapter,
  ) {}

  get id(): string {
    return this.json.id;
  }
  get name(): string {
    return this.json.name;
  }
  get resolvedType(): "FLOAT" | "COLOR" | "STRING" | "BOOLEAN" {
    return this.json.resolvedType;
  }
  get collectionId(): string {
    return this.json.variableCollectionId;
  }

  resolveNumber(consumer: LintNode): number | null {
    const value = this.adapter.resolveValue(this.json, consumer as RestNode);
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  resolveColor(consumer: LintNode): RGBA | null {
    const value = this.adapter.resolveValue(this.json, consumer as RestNode);
    if (typeof value === "object" && value !== null && "r" in value) {
      const c = value as RestColor;
      return { r: c.r, g: c.g, b: c.b, a: c.a ?? 1 };
    }
    return null;
  }
}

function toLintCollection(c: RestVariableCollection): LintCollection {
  return {
    id: c.id,
    name: c.name,
    isExtension: c.isExtension === true,
    variableIds: c.variableIds,
  };
}

export class RestLintAdapter implements LintAdapter {
  readonly document: RestNode;
  readonly fileName: string;
  private readonly variablesById = new Map<string, RestVariable>();
  private readonly collectionsById = new Map<string, RestVariableCollection>();
  private readonly wrappedVariables = new Map<string, RestLintVariable | null>();

  constructor(file: RestFileResponse, variables: RestVariablesResponse) {
    this.document = new RestNode(file.document, null);
    this.fileName = file.name;
    for (const v of Object.values(variables.meta.variables)) {
      this.variablesById.set(v.id, v);
    }
    for (const c of Object.values(variables.meta.variableCollections)) {
      this.collectionsById.set(c.id, c);
    }
  }

  /** binder 無し = read-only (fixes の apply は常に false)。 */
  readonly binder = undefined;

  async collections(): Promise<readonly LintCollection[]> {
    // Plugin の getLocalVariableCollectionsAsync に合わせ、remote (ライブラリ参照) は除外する。
    return [...this.collectionsById.values()]
      .filter((c) => c.remote !== true)
      .map(toLintCollection);
  }

  async variable(id: string): Promise<LintVariable | null> {
    const cached = this.wrappedVariables.get(id);
    if (cached !== undefined) return cached;
    const json = this.variablesById.get(id);
    const wrapped = json ? new RestLintVariable(json, this) : null;
    this.wrappedVariables.set(id, wrapped);
    return wrapped;
  }

  async collection(id: string): Promise<LintCollection | null> {
    const json = this.collectionsById.get(id);
    return json ? toLintCollection(json) : null;
  }

  /**
   * 変数を consumer ノードのモード文脈で解決する (Plugin API の resolveForConsumer 相当)。
   * モード: 祖先の explicitVariableModes[collectionId] → collection.defaultModeId。
   * 値がエイリアスなら参照先の変数を同じ consumer 文脈で再帰的に解決する (循環はガード)。
   */
  resolveValue(
    variable: RestVariable,
    consumer: RestNode,
    seen: Set<string> = new Set(),
  ): number | string | boolean | RestColor | null {
    if (seen.has(variable.id)) return null; // 循環エイリアス
    seen.add(variable.id);
    const collection = this.collectionsById.get(variable.variableCollectionId);
    const explicitMode = consumer.explicitModeFor(variable.variableCollectionId);
    const modeId = explicitMode ?? collection?.defaultModeId ?? null;
    let raw =
      (modeId !== null ? variable.valuesByMode[modeId] : undefined) ??
      (collection ? variable.valuesByMode[collection.defaultModeId] : undefined);
    if (raw === undefined) {
      // 最後の砦: 最初のモード値 (モード情報が壊れていても値があれば返す)。
      const first = Object.values(variable.valuesByMode)[0];
      if (first === undefined) return null;
      raw = first;
    }
    if (isRestAlias(raw)) {
      const target = this.variablesById.get(raw.id);
      if (!target) return null;
      return this.resolveValue(target, consumer, seen);
    }
    return raw;
  }
}
