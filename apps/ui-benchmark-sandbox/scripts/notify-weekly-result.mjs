#!/usr/bin/env node

import { createHash } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ACTIONS = new Set(["summary", "slack"]);
const PHASES = new Set(["review-required", "approved", "rejected"]);
const JOB_ID = /^job-[a-f0-9]{32}$/u;
const RUN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

function record(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

// Node-side mirror of src/job-contract.ts stableJson. D1 stores and hashes the
// recursively key-sorted representation, not the source object's insertion order.
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function publicationUrl(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} is required`);
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(`${label} must be a credential-free github.com HTTPS URL`);
  }
  return value;
}

export function validatePublication(operationValue, scoreValue, scoreBytes) {
  const operation = record(operationValue, "operation.json");
  const manifest = record(operation.manifest, "operation manifest");
  const job = record(operation.job, "operation job");
  const archive = record(operation.archive, "operation archive");
  const evidence = record(job.evidence, "operation job Evidence");
  const jobScore = record(job.score, "operation job score");
  const review = record(job.review, "operation job review");
  if (
    operation.schemaVersion !== 1 ||
    typeof operation.jobId !== "string" ||
    !JOB_ID.test(operation.jobId) ||
    typeof manifest.runId !== "string" ||
    !RUN_ID.test(manifest.runId) ||
    job.schemaVersion !== 1 ||
    job.jobId !== operation.jobId ||
    job.runId !== manifest.runId ||
    typeof job.manifestSha256 !== "string" ||
    !SHA256.test(job.manifestSha256) ||
    createHash("sha256").update(stableJson(manifest)).digest("hex") !==
      job.manifestSha256 ||
    !["review_pending", "reviewed"].includes(job.status) ||
    !["human_review", "complete"].includes(job.phase) ||
    !["passed", "failed"].includes(job.runStatus) ||
    review.required !== true ||
    !["pending", "approved", "rejected"].includes(review.status) ||
    operation.scorePath !== "llm-score.json" ||
    archive.path !== `${manifest.runId}.tar.gz` ||
    !Number.isSafeInteger(archive.bytes) ||
    archive.bytes <= 0 ||
    !Number.isSafeInteger(archive.artifactCount) ||
    archive.artifactCount <= 0 ||
    typeof archive.sha256 !== "string" ||
    !SHA256.test(archive.sha256) ||
    evidence.bytes !== archive.bytes
  ) {
    throw new Error("operation.json is not ready for publication");
  }

  if (evidence.sha256 !== archive.sha256) {
    throw new Error("operation.json Evidence hash does not match the archive");
  }

  const score = record(scoreValue, "llm-score.json");
  const scoreInputs = record(score.inputs, "LLM score inputs");
  const completedScore =
    score.status === "completed" &&
    typeof score.overallScore === "number" &&
    Number.isFinite(score.overallScore) &&
    score.overallScore >= 0 &&
    score.overallScore <= 100;
  if (
    !(scoreBytes instanceof Uint8Array) ||
    !Number.isSafeInteger(jobScore.bytes) ||
    jobScore.bytes < 1 ||
    jobScore.bytes !== scoreBytes.byteLength ||
    typeof jobScore.etag !== "string" ||
    jobScore.etag.length < 1 ||
    jobScore.etag.length > 256 ||
    typeof jobScore.sha256 !== "string" ||
    !SHA256.test(jobScore.sha256) ||
    createHash("sha256").update(scoreBytes).digest("hex") !== jobScore.sha256 ||
    jobScore.downloadPath !== `/jobs/${operation.jobId}/score` ||
    score.schemaVersion !== 1 ||
    score.runId !== manifest.runId ||
    !completedScore ||
    jobScore.status !== score.status ||
    jobScore.overallScore !== score.overallScore ||
    scoreInputs.evidenceArchiveSha256 !== archive.sha256
  ) {
    throw new Error("llm-score.json does not match the published operation");
  }
  return { operation, score };
}

export async function readPublication(operationPath) {
  const operation = JSON.parse(await readFile(operationPath, "utf8"));
  if (operation?.scorePath !== "llm-score.json") {
    throw new Error("operation.json has an invalid scorePath");
  }
  const scoreBytes = await readFile(resolve(dirname(operationPath), operation.scorePath));
  const score = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(scoreBytes));
  return validatePublication(operation, score, scoreBytes);
}

function presentation(phase, publication, artifactUrl, runUrl) {
  const { operation, score } = publication;
  const scoreText = `${score.overallScore} / 100`;
  const title = phase === "approved"
    ? "✅ UI生成ベンチマーク: 人間レビュー承認"
    : phase === "rejected"
      ? "⛔ UI生成ベンチマーク: 人間レビュー却下"
      : "🧪 UI生成ベンチマーク: レビュー待ち";
  const stateText = phase === "approved"
    ? "人間承認済み"
    : phase === "rejected"
      ? "人間却下済み"
      : "人間レビュー待ち";
  const summary = [
    `## ${title}`,
    "",
    `- Job: \`${operation.jobId}\``,
    `- Run: \`${operation.manifest.runId}\``,
    `- 生成検証: \`${operation.job.runStatus}\``,
    `- LLM score: ${scoreText}`,
    `- [生成ファイルと画像を確認する](${artifactUrl})`,
    `- [Workflow run](${runUrl})`,
    "",
    phase === "review-required"
      ? "生成結果とLLM scoreは自動合否ではありません。artifactを確認し、手動review workflowで判定してください。"
      : "手動review workflowで人間の判定を記録しました。自動merge・自動deployは行いません。",
    "",
  ].join("\n");
  const slackBody = {
    blocks: [
      { type: "header", text: { type: "plain_text", text: title, emoji: true } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Run*\n\`${operation.manifest.runId}\`` },
          { type: "mrkdwn", text: `*生成検証*\n\`${operation.job.runStatus}\`` },
          { type: "mrkdwn", text: `*LLM score*\n${scoreText}` },
          {
            type: "mrkdwn",
            text: `*状態*\n${stateText}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          { type: "button", text: { type: "plain_text", text: "生成ファイルを見る" }, url: artifactUrl },
          { type: "button", text: { type: "plain_text", text: "Workflowを見る" }, url: runUrl },
        ],
      },
    ],
  };
  return { summary, slackBody };
}

export async function runNotificationAction({
  action,
  phase,
  operationPath,
  artifactUrl,
  runUrl,
  environment = process.env,
  fetchImpl = globalThis.fetch,
}) {
  if (!ACTIONS.has(action) || !PHASES.has(phase) || !operationPath) {
    throw new Error(
      "Usage: notify-weekly-result.mjs <summary|slack> <review-required|approved|rejected> " +
      "<operation.json> <artifact-url> <run-url>",
    );
  }
  const safeArtifactUrl = publicationUrl(artifactUrl, "artifact URL");
  const safeRunUrl = publicationUrl(runUrl, "run URL");
  const publication = await readPublication(operationPath);
  const output = presentation(phase, publication, safeArtifactUrl, safeRunUrl);

  if (action === "summary") {
    if (environment.GITHUB_STEP_SUMMARY) {
      await appendFile(environment.GITHUB_STEP_SUMMARY, output.summary, "utf8");
    } else {
      process.stdout.write(output.summary);
    }
    return { status: "summarized" };
  }

  const webhook = environment.SLACK_WEBHOOK_URL;
  if (!webhook) {
    process.stdout.write("SLACK_WEBHOOK_URL未設定のためSlack通知をスキップしました。\n");
    return { status: "skipped" };
  }
  const response = await fetchImpl(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(output.slackBody),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Slack Webhook returned HTTP ${response.status}`);
  return { status: "notified" };
}

export async function main(argv = process.argv.slice(2)) {
  const [action, phase, operationPath, artifactUrl, runUrl, ...extra] = argv;
  if (extra.length > 0) throw new Error("notify-weekly-result.mjs received too many arguments");
  return runNotificationAction({ action, phase, operationPath, artifactUrl, runUrl });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
