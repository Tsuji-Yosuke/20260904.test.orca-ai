#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { githubActionsReviewAudience } from "./review-audience.mjs";

const MAX_OIDC_RESPONSE_BYTES = 64 * 1024;
const MAX_REVIEW_RESPONSE_BYTES = 1024 * 1024;
const REVIEW_RETRY_DELAYS_MS = [100, 300];
const JOB_ID = /^job-[a-f0-9]{32}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const RUN_ID = /^[1-9][0-9]{0,19}$/u;
const RUN_ATTEMPT = /^[1-9][0-9]{0,9}$/u;

class ResponseBoundaryError extends Error {}

async function boundedText(response, maximumBytes, label, allowEmpty = false) {
  const declared = response.headers.get("Content-Length");
  if (declared !== null) {
    const parsed = Number(declared);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maximumBytes) {
      throw new ResponseBoundaryError(`${label} is too large`);
    }
  }
  if (!response.body) {
    if (allowEmpty) return "";
    throw new ResponseBoundaryError(`${label} is empty`);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel(`${label} is too large`).catch(() => undefined);
        throw new ResponseBoundaryError(`${label} is too large`);
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
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ResponseBoundaryError(`${label} is not valid UTF-8`);
  }
}

function reviewRequest(argv) {
  const [
    endpointValue,
    jobId,
    manifestSha256,
    evidenceSha256,
    scoreSha256,
    generationRunId,
    generationRunAttempt,
    decision,
    sourceUrl,
    ...extra
  ] = argv;
  if (
    !endpointValue ||
    !jobId ||
    !manifestSha256 ||
    !evidenceSha256 ||
    !scoreSha256 ||
    !generationRunId ||
    !generationRunAttempt ||
    !decision ||
    !sourceUrl ||
    extra.length > 0
  ) {
    throw new Error(
      "Usage: record-remote-review.mjs <endpoint> <job-id> <manifest-sha256> " +
      "<evidence-sha256> <score-sha256> <generation-run-id> " +
      "<generation-run-attempt> <approved|rejected> <github-review-run-url>",
    );
  }
  if (!JOB_ID.test(jobId)) throw new Error("job-id is invalid");
  if (![manifestSha256, evidenceSha256, scoreSha256].every((value) => SHA256.test(value))) {
    throw new Error("review artifact SHA-256 is invalid");
  }
  if (!RUN_ID.test(generationRunId) || !RUN_ATTEMPT.test(generationRunAttempt)) {
    throw new Error("generation run identity is invalid");
  }
  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("decision is invalid");
  }
  let parsedSourceUrl;
  try {
    parsedSourceUrl = new URL(sourceUrl);
  } catch {
    throw new Error("review source URL is invalid");
  }
  if (
    parsedSourceUrl.protocol !== "https:" ||
    parsedSourceUrl.hostname !== "github.com" ||
    parsedSourceUrl.port !== "" ||
    parsedSourceUrl.username !== "" ||
    parsedSourceUrl.password !== "" ||
    parsedSourceUrl.search !== "" ||
    parsedSourceUrl.hash !== "" ||
    parsedSourceUrl.toString() !== sourceUrl ||
    !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/[1-9][0-9]{0,19}$/u.test(
      parsedSourceUrl.pathname,
    )
  ) {
    throw new Error("review source URL is invalid");
  }
  const endpoint = new URL(endpointValue);
  const loopback = endpoint.protocol === "http:" &&
    ["127.0.0.1", "localhost"].includes(endpoint.hostname);
  if (
    (!loopback && endpoint.protocol !== "https:") ||
    endpoint.username !== "" ||
    endpoint.password !== "" ||
    endpoint.search !== "" ||
    endpoint.hash !== ""
  ) {
    throw new Error("endpoint must be an HTTPS origin (or loopback HTTP for tests)");
  }
  endpoint.pathname = "/";
  return {
    endpoint,
    body: {
      schemaVersion: 2,
      jobId,
      manifestSha256,
      evidenceSha256,
      scoreSha256,
      generationRunId,
      generationRunAttempt,
      decision,
      sourceUrl,
    },
  };
}

export async function reviewAuthorizationToken({
  review,
  endpointOrigin,
  environment = process.env,
  fetchImpl = globalThis.fetch,
}) {
  const requestUrlValue = environment.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (requestUrlValue === undefined || requestToken === undefined) {
    throw new Error("GitHub Actions OIDC request environment is required");
  }
  if (
    requestToken.length < 1 ||
    requestToken.length > 16 * 1024 ||
    /[\s\u0000-\u001f\u007f]/u.test(requestToken)
  ) {
    throw new Error("GitHub Actions OIDC request token is invalid");
  }
  const requestUrl = new URL(requestUrlValue);
  if (
    requestUrl.protocol !== "https:" ||
    !requestUrl.hostname.endsWith(".actions.githubusercontent.com") ||
    requestUrl.port !== "" ||
    requestUrl.username !== "" ||
    requestUrl.password !== "" ||
    requestUrl.hash !== ""
  ) {
    throw new Error("GitHub Actions OIDC request URL is invalid");
  }
  const audienceOrigin = new URL(endpointOrigin);
  const loopbackAudienceOrigin = audienceOrigin.protocol === "http:" &&
    ["127.0.0.1", "localhost"].includes(audienceOrigin.hostname);
  if (
    (!loopbackAudienceOrigin && audienceOrigin.protocol !== "https:") ||
    audienceOrigin.origin !== endpointOrigin ||
    audienceOrigin.pathname !== "/" ||
    audienceOrigin.search !== "" ||
    audienceOrigin.hash !== ""
  ) {
    throw new Error("review endpoint origin is not canonical");
  }
  requestUrl.searchParams.set(
    "audience",
    githubActionsReviewAudience(review, endpointOrigin),
  );
  const response = await fetchImpl(requestUrl, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${requestToken}`,
    },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    await response.body?.cancel("OIDC token request failed").catch(() => undefined);
    throw new Error(`GitHub Actions OIDC token request returned HTTP ${response.status}`);
  }
  const contentType = response.headers.get("Content-Type")?.split(";", 1)[0]?.trim();
  if (contentType !== "application/json") {
    await response.body?.cancel("OIDC token response was not JSON").catch(() => undefined);
    throw new Error("GitHub Actions OIDC token request did not return JSON");
  }
  let value;
  try {
    value = JSON.parse(
      await boundedText(response, MAX_OIDC_RESPONSE_BYTES, "GitHub Actions OIDC response"),
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("GitHub Actions OIDC response")) {
      throw error;
    }
    throw new Error("GitHub Actions OIDC response is not valid JSON");
  }
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    typeof value.value !== "string" ||
    value.value.length < 1 ||
    value.value.length > 32 * 1024 ||
    value.value.split(".").length !== 3
  ) {
    throw new Error("GitHub Actions OIDC response token is invalid");
  }
  return value.value;
}

export async function recordRemoteReview({
  argv,
  environment = process.env,
  fetchImpl = globalThis.fetch,
  sleepImpl = (delayMs) => new Promise((resolvePromise) => setTimeout(resolvePromise, delayMs)),
}) {
  const { endpoint, body } = reviewRequest(argv);
  const token = await reviewAuthorizationToken({
    review: body,
    endpointOrigin: endpoint.origin,
    environment,
    fetchImpl,
  });
  const serializedBody = JSON.stringify(body);
  const reviewUrl = new URL(`/jobs/${body.jobId}/reviews`, endpoint);
  let responseText = "";
  let responseStatus = 0;
  for (let attempt = 0; attempt <= REVIEW_RETRY_DELAYS_MS.length; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(reviewUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: serializedBody,
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });
      responseStatus = response.status;
      responseText = await boundedText(
        response,
        MAX_REVIEW_RESPONSE_BYTES,
        "review record response",
        true,
      );
    } catch (error) {
      if (error instanceof ResponseBoundaryError) throw error;
      if (attempt >= REVIEW_RETRY_DELAYS_MS.length) {
        throw new Error("review record request failed after bounded retries");
      }
      await sleepImpl(REVIEW_RETRY_DELAYS_MS[attempt]);
      continue;
    }
    if (response.ok) break;
    const retryable = response.status === 408 ||
      response.status === 429 ||
      (response.status >= 500 && response.status <= 599);
    if (!retryable || attempt >= REVIEW_RETRY_DELAYS_MS.length) {
      throw new Error(`review record failed with HTTP ${response.status}`);
    }
    await sleepImpl(REVIEW_RETRY_DELAYS_MS[attempt]);
  }
  if (responseStatus < 200 || responseStatus > 299) {
    throw new Error(`review record failed with HTTP ${responseStatus}`);
  }
  let recorded;
  try {
    recorded = JSON.parse(responseText);
  } catch {
    throw new Error("review record response is not JSON");
  }
  if (
    typeof recorded !== "object" ||
    recorded === null ||
    Array.isArray(recorded) ||
    recorded.jobId !== body.jobId ||
    recorded.status !== "reviewed" ||
    typeof recorded.review !== "object" ||
    recorded.review === null ||
    Array.isArray(recorded.review) ||
    recorded.review.status !== body.decision ||
    recorded.review.sourceUrl !== body.sourceUrl
  ) {
    throw new Error("review record response does not confirm the requested decision");
  }
  return { jobId: body.jobId, decision: body.decision };
}

async function main() {
  const result = await recordRemoteReview({ argv: process.argv.slice(2) });
  process.stdout.write(`Human reviewを記録しました: ${result.jobId} / ${result.decision}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
