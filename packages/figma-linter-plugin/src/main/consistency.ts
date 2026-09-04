/// <reference types="@figma/plugin-typings" />

/**
 * 機能5: 横断チェック (Variant Consistency) のプラグイン側オーケストレーション。
 *
 * レポートの組み立て (軸推論・多数決・外れ値抽出) は @orca/figma-linter-core の
 * buildConsistencyReport に移管済み。ここは (1) 現在の選択から対象 Component Set を解決し、
 * (2) 「揃える」適用 (再バインド) をアダプタ経由で実行する、の 2 点だけを担う。
 */

import {
  bindNodeProperty,
  buildConsistencyReport,
  findSystemCollections,
  type ConsistencyReport,
} from "@orca/figma-linter-core";
import { createLintAdapter, wrapNode } from "./adapter";

/** 選択から横断チェック対象の Component Set を 1 つ決める (無ければ null)。 */
async function resolveComponentSet(): Promise<ComponentSetNode | null> {
  for (const node of figma.currentPage.selection) {
    if (node.type === "COMPONENT_SET") return node;
    if (node.type === "COMPONENT" && node.parent?.type === "COMPONENT_SET") {
      return node.parent as ComponentSetNode;
    }
    if (node.type === "INSTANCE") {
      const main = await node.getMainComponentAsync();
      if (main?.parent?.type === "COMPONENT_SET") return main.parent as ComponentSetNode;
    }
  }
  return null;
}

/**
 * 現在の選択 (Component Set) を横断検査して結果を返す。
 * 選択が Component Set でなければ null (UI が案内を出す)。
 */
export async function deriveConsistencyReport(): Promise<ConsistencyReport | null> {
  const set = await resolveComponentSet();
  if (!set) return null;
  return buildConsistencyReport(wrapNode(set), createLintAdapter());
}

/**
 * 外れ値を期待トークン (or 手動選択) へ揃える。
 * fixes = { nodeId, property, refId }。refId = 寄せ先 Reference 変数 id。
 */
export async function applyConsistencyFixes(
  fixes: Array<{ nodeId: string; property: string; refId: string }>,
): Promise<{ fixed: number; failed: number }> {
  const adapter = createLintAdapter();
  const { colorSystem } = await findSystemCollections(adapter);

  let fixed = 0;
  let failed = 0;
  for (const f of fixes) {
    try {
      const node = await figma.getNodeByIdAsync(f.nodeId);
      if (!node || !("type" in node) || node.type === "PAGE" || node.type === "DOCUMENT") {
        failed++;
        continue;
      }
      // 寄せ先トークンはアダプタが id ごとに memo する。
      const variable = await adapter.variable(f.refId);
      if (!variable) {
        failed++;
        continue;
      }
      const ok = await bindNodeProperty(wrapNode(node as SceneNode), f.property, variable, colorSystem, adapter);
      if (ok) fixed++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { fixed, failed };
}
