/**
 * lint 実行本体: 対象収集 → 機能4 (単体検査) + 機能5 (バリアント比較) → LintReport 生成。
 *
 * 判定はすべて @orca/figma-linter-core (プラグインと同一ロジック)。ここでは CI 固有の整形と、
 * 機能5 のノイズ対策フィルタ 3 点を適用する:
 * 1. 機能4 で fail になるセル (valid=false の外れ値) は機能5 の違反として数えない (二重報告排除)。
 * 2. 票が同数 (ambiguous) のグループは違反にしない (件数のみ summary に記録)。
 * 3. 違反キーに期待トークンを含めない (多数決の変動で同じセルを再通知しない)。
 */

import {
  analyze,
  buildConsistencyReport,
  collectCheckTargets,
  countStatuses,
  dedupeDiffs,
  findSystemCollections,
  type CheckRow,
  type FixDiff,
  type LintNode,
} from "@orca/figma-linter-core";
import { EXCLUDE_NAME_PREFIXES } from "./config";
import { figmaNodeUrl } from "./deep-link";
import type { RestLintAdapter } from "./rest-adapter";
import {
  checkViolationKey,
  consistencyViolationKey,
  disambiguateKeys,
  REPORT_SCHEMA_VERSION,
  type LintReport,
  type LintViolation,
} from "./report";
import { collectTargets } from "./targets";

/** ルートから target までの名前パスを DFS で求める ("" = ルート自身)。 */
export function nodePathFrom(root: LintNode, targetId: string): string {
  if (root.id === targetId) return "";
  const path: string[] = [];
  const dfs = (node: LintNode): boolean => {
    for (const child of node.children()) {
      path.push(child.name);
      if (child.id === targetId || dfs(child)) return true;
      path.pop();
    }
    return false;
  };
  dfs(root);
  return path.join(" / ");
}

/** fail 行に対応する修正候補 diff を探す (Background 行はオーバーレイの State Layer も対象)。 */
function suggestionFor(row: CheckRow, diffs: FixDiff[]): FixDiff | undefined {
  const labels = row.id === "color.background" ? [row.label, "State Layer"] : [row.label];
  return diffs.find((d) => labels.includes(d.label));
}

/** lint を実行して LintReport を組み立てる。 */
export async function runLint(
  adapter: RestLintAdapter,
  fileKey: string,
  now: Date = new Date(),
): Promise<LintReport> {
  const targets = collectTargets(adapter.document);
  const warnings: string[] = [];
  const violations: LintViolation[] = [];

  // System コレクションの欠如は全行 na (検査不能) になるため、レポート上で明示的に警告する。
  const { dimSystem, colorSystem } = await findSystemCollections(adapter);
  if (!dimSystem) warnings.push("Dimension System コレクションが見つかりません (dimension 系ルールは全て対象外になりました)。");
  if (!colorSystem) warnings.push("Color System コレクションが見つかりません (color 系ルールは全て対象外になりました)。");

  // --- 機能4: 単体検査 (各マスターコンポーネント + 配下の Auto Layout フレーム) ---
  let pass = 0;
  let fail = 0;
  let nodesChecked = 0;
  for (const target of targets.checkTargets) {
    const expanded = collectCheckTargets([target.root]);
    for (const node of expanded) {
      nodesChecked++;
      let sections;
      let fixes;
      try {
        ({ sections, fixes } = await analyze(node, adapter));
      } catch (error) {
        warnings.push(
          `検査に失敗したノードがあります: ${target.page}/${target.component} — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        continue;
      }
      const counts = countStatuses(sections);
      pass += counts.pass;
      fail += counts.fail;
      const diffs = dedupeDiffs(fixes.map((f) => f.diff));
      const nodePath = nodePathFrom(target.root, node.id);
      for (const section of sections) {
        for (const row of section.rows) {
          if (row.status !== "fail") continue;
          const suggestion = suggestionFor(row, diffs);
          // Background 行は複数 fill (地色 + オーバーレイ) を持ちうる。row.chip は代表値
          // (地色優先) なので、地色 pass + オーバーレイ fail のとき「正しい地色を置換せよ」と
          // 誤読される。fail した fill のチップだけを current に出す。
          const current =
            row.fills && row.fills.some((f) => f.status === "fail")
              ? row.fills
                  .filter((f) => f.status === "fail")
                  .map((f) => f.chip)
                  .join(" + ")
              : row.chip;
          violations.push({
            key: checkViolationKey({
              page: target.page,
              component: target.component,
              nodePath,
              ruleId: row.id,
            }),
            feature: "check",
            ruleId: row.id,
            page: target.page,
            component: target.component,
            nodePath,
            nodeId: node.id,
            label: row.label,
            current,
            suggestion: suggestion
              ? `${suggestion.after} (${suggestion.afterValue})`
              : undefined,
            detail: row.detail,
            setVariantCount: target.setVariantCount,
            deepLink: figmaNodeUrl(fileKey, node.id),
          });
        }
      }
    }
  }

  // --- 機能5: バリアント比較 (Component Set 単位) ---
  let consistencyOutliers = 0;
  let ambiguousGroups = 0;
  for (const target of targets.consistencyTargets) {
    let report;
    try {
      report = await buildConsistencyReport(target.set, adapter);
    } catch (error) {
      warnings.push(
        `バリアント比較に失敗した Component Set があります: ${target.page}/${target.set.name} — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      continue;
    }
    for (const property of report.properties) {
      for (const group of property.groups) {
        if (group.ambiguous) {
          // フィルタ2: 票が同数のグループは自動決定できないので違反にしない (件数だけ記録)。
          ambiguousGroups++;
          continue;
        }
        if (!group.expected) continue;
        for (const outlier of group.outliers) {
          // フィルタ1: 機能4 で fail になるセル (生値 / 誤った名前空間) は機能4 側で報告済み。
          // 機能5 は「単体では正しいのに仲間と揃っていない」セルだけを報告する。
          if (!outlier.valid) continue;
          consistencyOutliers++;
          const variantLabel = Object.entries(outlier.axes)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ");
          violations.push({
            key: consistencyViolationKey({
              page: target.page,
              setName: target.set.name,
              property: property.property,
              axes: outlier.axes,
            }),
            feature: "consistency",
            ruleId: `consistency.${property.property}`,
            page: target.page,
            component: `${target.set.name} / ${variantLabel}`,
            nodePath: "",
            nodeId: outlier.nodeId,
            label: property.label,
            current: `${outlier.token ?? "?"}${outlier.value ? ` (${outlier.value})` : ""}`,
            expected: `${group.expected.token} (${group.expected.value}) — ${group.expected.count}/${group.expected.total} 票`,
            detail: `グループ ${group.label} の多数派と揃っていません。`,
            setVariantCount: report.variantCount,
            deepLink: figmaNodeUrl(fileKey, outlier.nodeId),
          });
        }
      }
    }
  }

  // 同名ノード由来のキー衝突を生成順 (決定的) の #n サフィックスで解消してからソートする。
  disambiguateKeys(violations);
  violations.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    fileKey,
    fileName: adapter.fileName,
    generatedAt: now.toISOString(),
    scope: {
      pageExcludePrefixes: [...EXCLUDE_NAME_PREFIXES],
      componentExcludePrefixes: [...EXCLUDE_NAME_PREFIXES],
    },
    summary: {
      componentsChecked: targets.checkTargets.length,
      nodesChecked,
      setsChecked: targets.consistencyTargets.length,
      pass,
      fail,
      consistencyOutliers,
      ambiguousGroups,
      excludedPages: targets.excludedPages,
      excludedComponents: targets.excludedComponents,
    },
    warnings,
    violations,
  };
}
