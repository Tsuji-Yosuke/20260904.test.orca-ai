/**
 * 前回レポートとの差分。安定キー (report.ts) の集合差で「新規違反」「解消」を出す。
 * Slack 通知は毎回全件ではなくこの差分だけを流す (ノイズ制御)。
 */

import type { LintReport, LintViolation } from "./report";

export interface ReportDiff {
  /** 今回新しく現れた違反。 */
  added: LintViolation[];
  /** 前回あって今回消えた違反 (解消)。 */
  resolved: LintViolation[];
  prevTotal: number;
  nextTotal: number;
}

export function diffReports(prev: LintReport | null, next: LintReport): ReportDiff {
  if (!prev) {
    // 初回 (または前回レポートが読めない) は全件を「新規」として扱う。
    return {
      added: next.violations,
      resolved: [],
      prevTotal: 0,
      nextTotal: next.violations.length,
    };
  }
  const prevKeys = new Set(prev.violations.map((v) => v.key));
  const nextKeys = new Set(next.violations.map((v) => v.key));
  return {
    added: next.violations.filter((v) => !prevKeys.has(v.key)),
    resolved: prev.violations.filter((v) => !nextKeys.has(v.key)),
    prevTotal: prev.violations.length,
    nextTotal: next.violations.length,
  };
}
