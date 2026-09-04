/// <reference types="@figma/plugin-typings" />

/**
 * @orca/figma-linter-core のアダプタ実装 (Plugin API 版)。
 *
 * 検査コアが要求する LintNode / LintVariable / LintAdapter を `figma` グローバルの実体で満たす。
 * 低レベルの読み書きプリミティブは ./inspect/figma.ts を使う。binder を提供するので、
 * 検査コアが積む fixes の apply (自動修正のバインド) もこのアダプタ経由で実行される。
 */

import type {
  LintAdapter,
  LintBinder,
  LintCollection,
  LintNode,
  LintPaint,
  LintVariable,
  RGBA,
} from "@orca/figma-linter-core";
import {
  bindFillVariable,
  bindFillVariableAt,
  paintColorAlias,
  readBoundAlias,
  readFills,
  readNumber,
  readString,
  setBoundVariable,
  toRgba,
} from "./inspect/figma";

/**
 * SceneNode を LintNode にラップする。
 *
 * ラッパは呼び出しごとに作り直す (モジュール寿命のキャッシュを持たない)。ラッパを跨いで
 * 保持すると、children の遅延キャッシュが Figma 上の編集 (レイヤー追加・削除・バリアント追加)
 * を跨いで生き残り、再検査が古いツリーを見る。検査対象の同一性判定はコア側が node.id で行う
 * ため、ラッパのオブジェクト同一性は不要。
 */
export function wrapNode(raw: SceneNode): LintNode {
  return new PluginNode(raw);
}

/** LintNode から SceneNode 実体を取り出す (このアダプタが生んだノード限定)。 */
export function rawNodeOf(node: LintNode): SceneNode {
  return (node as PluginNode).raw;
}

class PluginNode implements LintNode {
  /**
   * children の遅延キャッシュ。ラッパは 1 操作 (検査・修正) ごとに wrapNode で作り直されるので、
   * このキャッシュの寿命も 1 操作内に閉じる (操作中はドキュメントが変わらない前提。
   * 書き込み系は code.ts の runMutation で直列化されている)。
   */
  private kids: readonly LintNode[] | null = null;

  constructor(readonly raw: SceneNode) {}

  get id(): string {
    return this.raw.id;
  }
  get type(): string {
    return this.raw.type;
  }
  get name(): string {
    return this.raw.name;
  }
  get visible(): boolean {
    return this.raw.visible !== false;
  }

  num(field: string): number | null {
    return readNumber(this.raw, field);
  }

  str(field: string): string | null {
    return readString(this.raw, field);
  }

  boundVariableId(field: string): string | null {
    return readBoundAlias(this.raw, field)?.id ?? null;
  }

  fills(): LintPaint[] | null {
    const fills = readFills(this.raw);
    if (!fills) return null;
    return fills.map((p) => {
      const solid = p.type === "SOLID" ? (p as SolidPaint) : null;
      return {
        type: p.type,
        visible: p.visible !== false,
        opacity: typeof p.opacity === "number" ? p.opacity : 1,
        color: solid ? { r: solid.color.r, g: solid.color.g, b: solid.color.b } : null,
        boundColorVariableId: paintColorAlias(p)?.id ?? null,
      };
    });
  }

  children(): readonly LintNode[] {
    if (!this.kids) {
      const children = (this.raw as unknown as { children?: readonly SceneNode[] }).children;
      this.kids = (children ?? []).map(wrapNode);
    }
    return this.kids;
  }

  characters(): string | null {
    if (this.raw.type !== "TEXT") return null;
    const chars = (this.raw as unknown as { characters?: string }).characters;
    return typeof chars === "string" ? chars : null;
  }

  variantValues(): Record<string, string> | null {
    const out: Record<string, string> = {};
    try {
      // Instance: componentProperties の VARIANT 値 (元 stateVariant の第 1 候補)。
      const cp = (this.raw as unknown as {
        componentProperties?: Record<string, { type?: string; value?: unknown }>;
      }).componentProperties;
      if (cp) {
        for (const [k, v] of Object.entries(cp)) {
          if (v && v.type === "VARIANT" && typeof v.value === "string") out[k] = v.value;
        }
      }
      // Component (Variant): variantProperties (第 2 候補。cp の値を上書きしない)。
      const vp = (this.raw as unknown as { variantProperties?: Record<string, string> | null })
        .variantProperties;
      if (vp) {
        for (const [k, val] of Object.entries(vp)) {
          if (typeof val === "string" && !(k in out)) out[k] = val;
        }
      }
    } catch {
      // componentProperties は detached instance 等で throw しうる。読めた分だけ返す。
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  variantAxes(): string[] | null {
    if (this.raw.type !== "COMPONENT_SET") return null;
    try {
      const defs = (this.raw as ComponentSetNode).componentPropertyDefinitions;
      return Object.keys(defs).filter((k) => defs[k]?.type === "VARIANT");
    } catch {
      return null;
    }
  }
}

class PluginVariable implements LintVariable {
  constructor(readonly raw: Variable) {}

  get id(): string {
    return this.raw.id;
  }
  get name(): string {
    return this.raw.name;
  }
  get resolvedType(): Variable["resolvedType"] {
    return this.raw.resolvedType;
  }
  get collectionId(): string {
    return this.raw.variableCollectionId;
  }

  resolveNumber(consumer: LintNode): number | null {
    try {
      const { value } = this.raw.resolveForConsumer(rawNodeOf(consumer));
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  resolveColor(consumer: LintNode): RGBA | null {
    try {
      const { value } = this.raw.resolveForConsumer(rawNodeOf(consumer));
      return toRgba(value);
    } catch {
      return null;
    }
  }
}

/** VariableCollection → LintCollection への写像。 */
function toLintCollection(collection: VariableCollection): LintCollection {
  return {
    id: collection.id,
    name: collection.name,
    isExtension: collection.isExtension,
    variableIds: collection.variableIds,
  };
}

/**
 * Plugin API 版の LintAdapter。変数・コレクションはインスタンス内で memo するので、
 * 1 つの操作 (検査・修正・横断レポート) ごとに作り直して使う (操作中はファイルが変わらない前提。
 * 書き込み系操作は code.ts の runMutation で直列化されている)。
 */
class PluginLintAdapter implements LintAdapter {
  private readonly varCache = new Map<string, LintVariable | null>();
  private readonly collCache = new Map<string, LintCollection | null>();

  readonly binder: LintBinder = {
    bindField: (node, field, variable) =>
      setBoundVariable(rawNodeOf(node), field, (variable as PluginVariable).raw),
    bindFillAt: (node, index, variable) =>
      bindFillVariableAt(rawNodeOf(node), index, (variable as PluginVariable).raw),
    bindFirstSolidFill: (node, variable) =>
      bindFillVariable(rawNodeOf(node), (variable as PluginVariable).raw),
  };

  async collections(): Promise<readonly LintCollection[]> {
    const all = await figma.variables.getLocalVariableCollectionsAsync();
    const out = all.map(toLintCollection);
    for (const c of out) this.collCache.set(c.id, c);
    return out;
  }

  async variable(id: string): Promise<LintVariable | null> {
    const cached = this.varCache.get(id);
    if (cached !== undefined) return cached;
    const raw = await figma.variables.getVariableByIdAsync(id);
    const wrapped = raw ? new PluginVariable(raw) : null;
    this.varCache.set(id, wrapped);
    return wrapped;
  }

  async collection(id: string): Promise<LintCollection | null> {
    const cached = this.collCache.get(id);
    if (cached !== undefined) return cached;
    const raw = await figma.variables.getVariableCollectionByIdAsync(id);
    const mapped = raw ? toLintCollection(raw) : null;
    this.collCache.set(id, mapped);
    return mapped;
  }
}

/** 1 操作ぶんの検査アダプタを作る。 */
export function createLintAdapter(): LintAdapter {
  return new PluginLintAdapter();
}
