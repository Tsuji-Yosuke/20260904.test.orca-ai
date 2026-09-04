/**
 * 検査対象の収集 (CI 版)。
 *
 * プラグインは「ユーザーの選択」起点だが、CI は無人なのでファイル全体から機械的に対象を決める:
 * - 全ページ (CANVAS) を走査する。ただし名前が `_` / `.` 始まりのページは除外。
 * - 機能4 (単体検査) の対象 = マスターコンポーネント。Component Set の各バリアント (COMPONENT) と
 *   スタンドアロンの COMPONENT。名前が `_` / `.` 始まりのコンポーネント / Set は除外。
 * - 機能5 (バリアント比較) の対象 = 除外されていない Component Set。
 * - Component Set の「枠」自体は機能4 の対象にしない (プラグインで Set を選択した場合は枠も
 *   検査されるが、枠はデザイン成果物ではないため CI では意図的にスキップ。README に明記)。
 *
 * 各対象の配下展開 (Auto Layout フレームを含める・ネストしたコンポーネントの中身に潜らない) は
 * コアの collectCheckTargets が担う (プラグインと同一規則)。
 */

import { isExcludedName } from "./config";
import type { RestNode } from "./rest-adapter";

/** 機能4 (単体検査) のルート 1 件。 */
export interface CheckTarget {
  page: string;
  /** 表示名。バリアントは "Set名 / Size=md, State=Hover"、スタンドアロンはコンポーネント名。 */
  component: string;
  /** 属する Component Set の総バリアント数 (スタンドアロンは undefined)。通知の範囲表記用。 */
  setVariantCount?: number;
  root: RestNode;
}

/** 機能5 (バリアント比較) の対象 Component Set 1 件。 */
export interface ConsistencyTarget {
  page: string;
  set: RestNode;
}

export interface TargetCollection {
  checkTargets: CheckTarget[];
  consistencyTargets: ConsistencyTarget[];
  /** 除外したページ名 (レポートの透明性用)。 */
  excludedPages: string[];
  /** 除外したコンポーネント / Component Set 名 ("ページ名/名前")。 */
  excludedComponents: string[];
}

/** ドキュメント (DOCUMENT ノード) から検査対象を集める。 */
export function collectTargets(document: RestNode): TargetCollection {
  const out: TargetCollection = {
    checkTargets: [],
    consistencyTargets: [],
    excludedPages: [],
    excludedComponents: [],
  };

  for (const page of document.children()) {
    if (page.type !== "CANVAS") continue;
    if (isExcludedName(page.name)) {
      out.excludedPages.push(page.name);
      continue;
    }
    for (const child of page.children()) visit(child, page.name, out);
  }
  return out;
}

/** ページ配下を再帰し、マスターコンポーネントを収集する。 */
function visit(node: RestNode, page: string, out: TargetCollection): void {
  if (node.type === "COMPONENT_SET") {
    if (isExcludedName(node.name)) {
      out.excludedComponents.push(`${page}/${node.name}`);
      return;
    }
    out.consistencyTargets.push({ page, set: node });
    // 各バリアントを機能4 のルートにする (Set の枠自体は対象外)。
    const variants = node.children().filter((c) => c.type === "COMPONENT");
    for (const variant of variants) {
      out.checkTargets.push({
        page,
        component: `${node.name} / ${variant.name}`,
        setVariantCount: variants.length,
        root: variant,
      });
    }
    return; // Set の中はバリアントとして扱ったので、これ以上潜らない。
  }
  if (node.type === "COMPONENT") {
    if (isExcludedName(node.name)) {
      out.excludedComponents.push(`${page}/${node.name}`);
      return;
    }
    out.checkTargets.push({ page, component: node.name, root: node });
    return; // コンポーネントの中にマスターコンポーネントはネストしない。
  }
  if (node.type === "INSTANCE") {
    return; // インスタンスはマスター側で検査する (二重報告を避ける)。
  }
  // FRAME / GROUP / SECTION などのコンテナは配下を探索する。
  for (const child of node.children()) visit(child, page, out);
}
