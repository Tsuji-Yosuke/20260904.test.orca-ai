/**
 * CI エントリポイント: 取得 → lint → 前回レポートと差分 → レポート保存 → 通知。
 *
 * 環境変数:
 * - FIGMA_TOKEN         (必須) PAT / Plan Access Token。X-Figma-Token でそのまま使う。
 * - FIGMA_FILE_KEY      (任意) 検査対象 fileKey。既定は Common UI Kit。
 * - REPORT_PATH         (任意) lint-report.json のパス。既定は reports/common-ui-kit.json。
 * - SLACK_WEBHOOK_URL   (任意) あれば Slack へ差分通知。無ければ Summary / stdout のみ。
 * - FIGMA_TOKEN_EXPIRES (任意) トークン失効日 (YYYY-MM-DD)。近づくと警告を通知に載せる。
 *
 * フラグ:
 * - --dry-run             レポートを書き込まない (通知は Summary のみ)。
 * - --fail-on-violations  違反が 1 件でもあれば exit 1 (PR ゲート用途。定期実行では使わない)。
 *
 * 終了コード: 0 = 実行成功 (違反があっても通知で伝える) / 1 = 実行自体の失敗。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COMMON_UI_KIT_FILE_KEY, DEFAULT_REPORT_RELATIVE_PATH } from "./config";
import { diffReports } from "./diff";
import { fetchFile, fetchLocalVariables } from "./figma-api";
import { runLint } from "./lint-runner";
import { tokenExpiryWarning } from "./ops";
import {
  SlackWebhookNotifier,
  SummaryNotifier,
  type Notifier,
  type NotifyPayload,
} from "./notify";
import { REPORT_SCHEMA_VERSION, type LintReport } from "./report";
import { RestLintAdapter } from "./rest-adapter";

function packageRelative(path: string): string {
  return resolve(fileURLToPath(new URL("..", import.meta.url)), path);
}

/** 前回レポートを読む (無い・壊れている・スキーマ違いは null + 警告)。 */
function loadPreviousReport(path: string, warnings: string[]): LintReport | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as LintReport;
    if (parsed.schemaVersion !== REPORT_SCHEMA_VERSION) {
      warnings.push(
        `前回レポートのスキーマが違うため差分基準にできません (v${String(parsed.schemaVersion)} → v${REPORT_SCHEMA_VERSION})。今回の違反は全件「新規」扱いです。`,
      );
      return null;
    }
    // 手編集・部分破損でも diff がクラッシュしないよう、構造も最低限検証する。
    if (!Array.isArray(parsed.violations) || parsed.violations.some((v) => typeof v?.key !== "string")) {
      warnings.push("前回レポートの violations が壊れています。今回の違反は全件「新規」扱いです。");
      return null;
    }
    return parsed;
  } catch (error) {
    warnings.push(
      `前回レポートが読めません (${error instanceof Error ? error.message : String(error)})。今回の違反は全件「新規」扱いです。`,
    );
    return null;
  }
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const failOnViolations = args.has("--fail-on-violations");

  const token = process.env.FIGMA_TOKEN;
  if (!token) {
    console.error("FIGMA_TOKEN が設定されていません。");
    process.exit(1);
  }
  const fileKey = process.env.FIGMA_FILE_KEY || COMMON_UI_KIT_FILE_KEY;
  const reportPath = process.env.REPORT_PATH
    ? resolve(process.env.REPORT_PATH)
    : packageRelative(DEFAULT_REPORT_RELATIVE_PATH);

  const now = new Date();
  const operationalWarnings: string[] = [];
  const expiryWarning = tokenExpiryWarning(process.env.FIGMA_TOKEN_EXPIRES, now);
  if (expiryWarning) operationalWarnings.push(expiryWarning);

  console.log(`Figma Linter: fileKey=${fileKey}`);
  const [file, variables] = await Promise.all([
    fetchFile(fileKey, token),
    fetchLocalVariables(fileKey, token),
  ]);
  const adapter = new RestLintAdapter(file, variables);
  const report = await runLint(adapter, fileKey, now);

  const prev = loadPreviousReport(reportPath, operationalWarnings);
  const diff = diffReports(prev, report);

  if (!dryRun) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  // GitHub Actions 上では run ページ (Step Summary = 全件レポート) を「レポート参照」のリンク先にする。
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
  const reportUrl =
    GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
      ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
      : undefined;
  const payload: NotifyPayload = { report, diff, operationalWarnings, reportUrl };
  const notifiers: Notifier[] = [new SummaryNotifier()];
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (webhookUrl && !dryRun) notifiers.push(new SlackWebhookNotifier(webhookUrl));
  for (const notifier of notifiers) {
    try {
      await notifier.notify(payload);
    } catch (error) {
      // 通知失敗はジョブを失敗扱いにする (exit 1)。workflow はステップ失敗でレポートの
      // commit をスキップするため、次回実行が同じ差分をもう一度「新規」として通知する
      // (= 通知ロストを自己回復する)。失敗の内容は workflow の failure ステップが Slack に流す。
      console.error(`通知に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }

  console.log(
    `違反 ${report.violations.length}件 (新規 ${diff.added.length} / 解消 ${diff.resolved.length})、` +
      `検査対象 ${report.summary.componentsChecked} コンポーネント / ${report.summary.setsChecked} セット`,
  );
  if (failOnViolations && report.violations.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  // 実行自体の失敗 (API エラー等)。workflow 側の failure ステップが Slack へ別途通知する。
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
