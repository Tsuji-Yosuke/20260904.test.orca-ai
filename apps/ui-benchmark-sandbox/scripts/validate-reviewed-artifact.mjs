#!/usr/bin/env node

import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { appendFile, open } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import { validatePublication } from "./notify-weekly-result.mjs";

const GITHUB_API_URL = "https://api.github.com";
const GENERATION_WORKFLOW_NAME = "UI Generation Benchmark Weekly";
const GENERATION_WORKFLOW_PATH = ".github/workflows/ui-generation-benchmark-weekly.yml";
const GENERATION_WORKFLOW_RUN_PATHS = new Set([
  GENERATION_WORKFLOW_PATH,
  `${GENERATION_WORKFLOW_PATH}@main`,
]);
const MAX_GITHUB_RESPONSE_BYTES = 1024 * 1024;
const MAX_JSON_ARTIFACT_BYTES = 8 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_UNCOMPRESSED_ARCHIVE_BYTES = 256 * 1024 * 1024;
const MAX_ARCHIVE_ENTRY_BYTES = 64 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 128;
const GITHUB_API_TIMEOUT_MS = 15_000;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const RUN_ID = /^[1-9][0-9]{0,19}$/u;
const ARTIFACT_NAME = /^ui-generation-[a-z0-9-]+$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_SHA = /^[a-f0-9]{40}$/u;
const SELECTED_ARTIFACTS = [
  "actual.png",
  "reference.png",
  "diff.png",
  "agent-candidate-page.tsx",
  "image-metrics.json",
  "verdict.json",
];

function record(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function requiredEnvironment(environment, name, pattern, maximumLength = 16 * 1024) {
  const value = environment[name];
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximumLength ||
    (pattern && !pattern.test(value))
  ) {
    throw new Error(`${name} is invalid`);
  }
  return value;
}

function sameFileSnapshot(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

async function readRegularFile(path, maximumBytes, label, expectedBytes) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  } catch {
    throw new Error(`${label} cannot be opened safely`);
  }
  try {
    const before = await handle.stat({ bigint: true });
    if (
      !before.isFile() ||
      before.size < 1n ||
      before.size > BigInt(maximumBytes) ||
      (expectedBytes !== undefined && before.size !== BigInt(expectedBytes))
    ) {
      throw new Error(`${label} size is invalid`);
    }
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (bytes.byteLength !== Number(before.size) || !sameFileSnapshot(before, after)) {
      throw new Error(`${label} changed while it was read`);
    }
    return bytes;
  } finally {
    await handle.close().catch(() => undefined);
  }
}

async function readJsonArtifact(path, label) {
  const bytes = await readRegularFile(path, MAX_JSON_ARTIFACT_BYTES, label);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} is not UTF-8`);
  }
  try {
    return { value: JSON.parse(text), bytes };
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

async function boundedJsonResponse(response, maximumBytes, label) {
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  const contentType = response.headers.get("Content-Type")?.split(";", 1)[0]?.trim();
  if (contentType !== "application/json") throw new Error(`${label} did not return JSON`);
  const declared = response.headers.get("Content-Length");
  if (declared !== null) {
    const parsed = Number(declared);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maximumBytes) {
      throw new Error(`${label} response is too large`);
    }
  }
  if (!response.body) throw new Error(`${label} returned an empty response`);
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel(`${label} response is too large`);
        throw new Error(`${label} response is too large`);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`${label} response is not valid JSON`);
  }
  return record(parsed, `${label} response`);
}

function decodeTarString(block, offset, length, label) {
  const field = block.subarray(offset, offset + length);
  const nul = field.indexOf(0);
  const bytes = nul < 0 ? field : field.subarray(0, nul);
  if (nul >= 0 && field.subarray(nul + 1).some((byte) => byte !== 0)) {
    throw new Error(`${label} contains bytes after its terminator`);
  }
  let value;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} is not UTF-8`);
  }
  if (/[\u0000-\u001f\u007f\\]/u.test(value)) {
    throw new Error(`${label} contains an unsafe character`);
  }
  return value;
}

function parseTarOctal(block, offset, length, label) {
  const field = block.subarray(offset, offset + length);
  if ((field[0] & 0x80) !== 0) throw new Error(`${label} uses base-256`);
  const value = Buffer.from(field).toString("ascii").replace(/\0.*$/u, "").trim();
  if (value === "") return 0;
  if (!/^[0-7]+$/u.test(value)) throw new Error(`${label} is not octal`);
  const parsed = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} is invalid`);
  return parsed;
}

function tarHeaderChecksum(block) {
  let total = 0;
  for (let index = 0; index < block.byteLength; index += 1) {
    total += index >= 148 && index < 156 ? 0x20 : block[index];
  }
  return total;
}

function normalizeTarName(value) {
  const name = value.startsWith("./") ? value.slice(2) : value;
  if (
    name.length < 1 ||
    name.length > 128 ||
    name.startsWith("/") ||
    name.includes("/") ||
    name === "." ||
    name === ".." ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(name)
  ) {
    throw new Error(`archive contains an unsafe path: ${value}`);
  }
  return name;
}

export function parseReviewedEvidenceTar(uncompressed) {
  if (!(uncompressed instanceof Uint8Array)) throw new Error("archive tar must be bytes");
  if (
    uncompressed.byteLength < 1024 ||
    uncompressed.byteLength > MAX_UNCOMPRESSED_ARCHIVE_BYTES ||
    uncompressed.byteLength % 512 !== 0
  ) {
    throw new Error("archive tar size is invalid");
  }
  const bytes = Buffer.from(uncompressed.buffer, uncompressed.byteOffset, uncompressed.byteLength);
  const artifacts = new Map();
  let offset = 0;
  let zeroBlocks = 0;
  let rootDirectorySeen = false;
  let endSeen = false;
  while (offset < bytes.byteLength) {
    const header = bytes.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((byte) => byte === 0)) {
      zeroBlocks += 1;
      if (zeroBlocks >= 2) endSeen = true;
      continue;
    }
    if (zeroBlocks !== 0) throw new Error("archive tar has data after an end marker");
    const storedChecksum = parseTarOctal(header, 148, 8, "tar checksum");
    if (storedChecksum !== tarHeaderChecksum(header)) {
      throw new Error("archive tar header checksum does not match");
    }
    const rawName = decodeTarString(header, 0, 100, "tar path");
    const prefix = decodeTarString(header, 345, 155, "tar prefix");
    const linkName = decodeTarString(header, 157, 100, "tar link name");
    const typeByte = header[156];
    const type = typeByte === 0 ? "0" : String.fromCharCode(typeByte);
    const size = parseTarOctal(header, 124, 12, "tar entry size");
    if (prefix !== "") throw new Error("archive tar prefixes are not allowed");
    if (type === "5") {
      if (rawName !== "./" || rootDirectorySeen || size !== 0 || linkName !== "") {
        throw new Error("archive tar root directory entry is invalid");
      }
      rootDirectorySeen = true;
      continue;
    }
    if (type !== "0" || linkName !== "") {
      throw new Error(`archive entry ${rawName} is not a regular file`);
    }
    const name = normalizeTarName(rawName);
    if (artifacts.has(name)) throw new Error(`archive contains duplicate entry: ${name}`);
    if (artifacts.size >= MAX_ARCHIVE_ENTRIES || size > MAX_ARCHIVE_ENTRY_BYTES) {
      throw new Error(`archive entry ${name} exceeds its limit`);
    }
    const paddedSize = Math.ceil(size / 512) * 512;
    if (offset + paddedSize > bytes.byteLength) {
      throw new Error(`archive entry ${name} is truncated`);
    }
    const entry = bytes.subarray(offset, offset + size);
    if (bytes.subarray(offset + size, offset + paddedSize).some((byte) => byte !== 0)) {
      throw new Error(`archive entry ${name} has non-zero padding`);
    }
    artifacts.set(name, entry);
    offset += paddedSize;
  }
  if (!endSeen || zeroBlocks < 2) throw new Error("archive tar end marker is missing");
  return artifacts;
}

function validateWorkflowContext(value, environment, operation) {
  const context = record(value, "workflow-context.json");
  const manifest = record(operation.manifest, "operation manifest");
  if (
    context.schemaVersion !== 2 ||
    context.repository !== environment.repository ||
    context.workflow !== GENERATION_WORKFLOW_NAME ||
    !["schedule", "workflow_dispatch"].includes(context.eventName) ||
    context.runId !== environment.generationRunId ||
    typeof context.runAttempt !== "string" ||
    !RUN_ID.test(context.runAttempt) ||
    typeof context.headSha !== "string" ||
    !GIT_SHA.test(context.headSha) ||
    typeof context.promotedRevision !== "string" ||
    !GIT_SHA.test(context.promotedRevision) ||
    manifest.benchmarkRevision !== context.promotedRevision ||
    environment.artifactName !==
      `ui-generation-${operation.jobId}-attempt-${context.runAttempt}`
  ) {
    throw new Error("artifact is not bound to this completed-score human review");
  }
  return context;
}

function validateGitHubRun(value, environment, context) {
  const run = record(value, "GitHub generation run");
  const repository = record(run.repository, "GitHub generation run repository");
  const headRepository = record(run.head_repository, "GitHub generation run head_repository");
  const expectedUrl = `https://github.com/${environment.repository}/actions/runs/${environment.generationRunId}`;
  if (
    !Number.isSafeInteger(run.id) ||
    String(run.id) !== environment.generationRunId ||
    run.name !== GENERATION_WORKFLOW_NAME ||
    !GENERATION_WORKFLOW_RUN_PATHS.has(run.path) ||
    run.event !== context.eventName ||
    run.head_branch !== "main" ||
    run.head_sha !== context.headSha ||
    !Number.isSafeInteger(run.run_attempt) ||
    String(run.run_attempt) !== context.runAttempt ||
    run.status !== "completed" ||
    run.conclusion !== "success" ||
    run.html_url !== expectedUrl ||
    repository.full_name !== environment.repository ||
    repository.private !== true ||
    repository.visibility !== "private" ||
    headRepository.full_name !== environment.repository ||
    headRepository.private !== true ||
    headRepository.visibility !== "private"
  ) {
    throw new Error("GitHub generation run does not match the reviewed artifact");
  }
}

function reviewEnvironment(environment) {
  const repository = requiredEnvironment(environment, "GITHUB_REPOSITORY", REPOSITORY, 256);
  const generationRunId = requiredEnvironment(environment, "GENERATION_RUN_ID", RUN_ID, 20);
  const artifactName = requiredEnvironment(environment, "ARTIFACT_NAME", ARTIFACT_NAME, 256);
  const githubToken = requiredEnvironment(environment, "GITHUB_TOKEN", /^[^\s\u0000-\u001f\u007f]+$/u);
  const githubOutput = requiredEnvironment(environment, "GITHUB_OUTPUT", null, 8 * 1024);
  return { repository, generationRunId, artifactName, githubToken, githubOutput };
}

export async function validateReviewedArtifact({
  outputDirectory = ".benchmark-output",
  environment = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const checkedEnvironment = reviewEnvironment(environment);
  const directory = resolve(outputDirectory);
  const operationArtifact = await readJsonArtifact(
    join(directory, "operation.json"),
    "operation.json",
  );
  const scoreArtifact = await readJsonArtifact(
    join(directory, "llm-score.json"),
    "llm-score.json",
  );
  const { operation, score } = validatePublication(
    operationArtifact.value,
    scoreArtifact.value,
    scoreArtifact.bytes,
  );
  if (
    operation.job.status !== "review_pending" ||
    operation.job.review.status !== "pending" ||
    score.status !== "completed"
  ) {
    throw new Error("artifact is not awaiting a completed-score human review");
  }
  const context = validateWorkflowContext(
    (await readJsonArtifact(
      join(directory, "workflow-context.json"),
      "workflow-context.json",
    )).value,
    checkedEnvironment,
    operation,
  );

  const generationRun = await boundedJsonResponse(
    await fetchImpl(
      `${GITHUB_API_URL}/repos/${checkedEnvironment.repository}/actions/runs/${checkedEnvironment.generationRunId}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${checkedEnvironment.githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        redirect: "error",
        signal: AbortSignal.timeout(GITHUB_API_TIMEOUT_MS),
      },
    ),
    MAX_GITHUB_RESPONSE_BYTES,
    "GitHub generation run API",
  );
  validateGitHubRun(generationRun, checkedEnvironment, context);

  if (
    !Number.isSafeInteger(operation.archive.bytes) ||
    operation.archive.bytes < 1 ||
    operation.archive.bytes > MAX_ARCHIVE_BYTES
  ) {
    throw new Error("operation archive byte length exceeds the review limit");
  }
  const archiveBytes = await readRegularFile(
    join(directory, operation.archive.path),
    MAX_ARCHIVE_BYTES,
    "Evidence archive",
    operation.archive.bytes,
  );
  const archiveSha256 = createHash("sha256").update(archiveBytes).digest("hex");
  if (archiveSha256 !== operation.archive.sha256) {
    throw new Error("Evidence archive SHA-256 does not match operation.json");
  }
  let uncompressed;
  try {
    uncompressed = gunzipSync(archiveBytes, {
      maxOutputLength: MAX_UNCOMPRESSED_ARCHIVE_BYTES,
    });
  } catch {
    throw new Error("Evidence archive is not a bounded valid gzip stream");
  }
  const archivedArtifacts = parseReviewedEvidenceTar(uncompressed);
  if (archivedArtifacts.size !== operation.archive.artifactCount) {
    throw new Error("Evidence archive artifact count does not match operation.json");
  }
  for (const name of SELECTED_ARTIFACTS) {
    const archived = archivedArtifacts.get(name);
    if (!archived) throw new Error(`Evidence archive is missing selected artifact: ${name}`);
    const selected = await readRegularFile(
      join(directory, name),
      MAX_ARCHIVE_ENTRY_BYTES,
      `selected artifact ${name}`,
      archived.byteLength,
    );
    if (!selected.equals(archived)) {
      throw new Error(`selected artifact ${name} does not match the Evidence archive`);
    }
  }

  const reviewBinding = {
    jobId: operation.jobId,
    manifestSha256: operation.job.manifestSha256,
    evidenceSha256: operation.archive.sha256,
    scoreSha256: operation.job.score.sha256,
    generationRunId: checkedEnvironment.generationRunId,
    generationRunAttempt: context.runAttempt,
  };
  await appendFile(
    checkedEnvironment.githubOutput,
    [
      `job_id=${reviewBinding.jobId}`,
      `manifest_sha256=${reviewBinding.manifestSha256}`,
      `evidence_sha256=${reviewBinding.evidenceSha256}`,
      `score_sha256=${reviewBinding.scoreSha256}`,
      `generation_run_id=${reviewBinding.generationRunId}`,
      `generation_run_attempt=${reviewBinding.generationRunAttempt}`,
      "",
    ].join("\n"),
    "utf8",
  );
  return reviewBinding;
}

async function main() {
  const result = await validateReviewedArtifact();
  process.stdout.write(`レビュー対象を検証しました: ${result.jobId}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
