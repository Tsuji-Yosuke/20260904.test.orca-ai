import { createHash } from "node:crypto";

export const GITHUB_ACTIONS_REVIEW_AUDIENCE_PREFIX = "orca-ui-benchmark-review:v1:";

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

export function canonicalReviewAudiencePayload(input, endpointOrigin) {
  return stableJson({
    decision: input.decision,
    endpointOrigin,
    evidenceSha256: input.evidenceSha256,
    generationRunAttempt: input.generationRunAttempt,
    generationRunId: input.generationRunId,
    jobId: input.jobId,
    manifestSha256: input.manifestSha256,
    scoreSha256: input.scoreSha256,
    sourceUrl: input.sourceUrl,
  });
}

export function githubActionsReviewAudience(input, endpointOrigin) {
  const digest = createHash("sha256")
    .update(canonicalReviewAudiencePayload(input, endpointOrigin))
    .digest("hex");
  return `${GITHUB_ACTIONS_REVIEW_AUDIENCE_PREFIX}${digest}`;
}
