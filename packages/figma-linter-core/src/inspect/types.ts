/** inspect モジュール間で共有する結果型 (循環依存を避けるため独立)。 */

import type { LintVariable } from "../adapter";
import type { CheckSection, FixDiff } from "../check-types";

/**
 * 1 件の自動修正。`diff` は適用前の確認モーダル表示用、`apply` は実バインド (成功で true)。
 * `apply(override)` に LintVariable を渡すと、既定のトークンの代わりにそれをバインドする
 * (モーダルのドロップダウンで選び直したトークンを尊重するため)。バインドはアダプタの binder が
 * 担うので、binder を持たない read-only 消費者 (CI) では apply は常に false を返す。
 */
export interface FixEntry {
  diff: FixDiff;
  apply: (override?: LintVariable) => boolean;
}

export interface Analysis {
  sections: CheckSection[];
  fixes: FixEntry[];
}
