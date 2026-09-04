/**
 * 検査対象のコレクション解決 (Dimension System / Color System)。
 * 名前ヒントで層を識別し、(deprecated) は除外する。詳細は docs/detection-rules.md §2.1。
 */

import type { LintAdapter, LintCollection } from "../adapter";

export async function findSystemCollections(adapter: LintAdapter): Promise<{
  dimSystem: LintCollection | null;
  colorSystem: LintCollection | null;
}> {
  const all = await adapter.collections();
  const base = all.filter((c) => !c.isExtension && !/\(deprecated\)|deprecated/i.test(c.name));
  const dimSystem =
    base.find((c) => /dimension system/i.test(c.name)) ??
    base.find((c) => /system/i.test(c.name) && !/(typography|color)/i.test(c.name)) ??
    null;
  const colorSystem =
    base.find((c) => /color system/i.test(c.name)) ??
    base.find((c) => /color/i.test(c.name) && /system/i.test(c.name)) ??
    null;
  return { dimSystem, colorSystem };
}
