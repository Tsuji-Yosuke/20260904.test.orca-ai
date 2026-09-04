import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  validateCasesDirectory,
  validateFeedbackCase,
  validateFeedbackRepository,
  validateInboxEntry,
} from "./validate-component-feedback.mjs";

const packageDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const schemaPath = join(packageDir, "evals/component-feedback/schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const inboxSchemaPath = join(packageDir, "evals/component-feedback/inbox-schema.json");
const inboxSchema = JSON.parse(readFileSync(inboxSchemaPath, "utf8"));

function validCase() {
  return {
    schemaVersion: "1.0",
    id: "button-wrong-token-001",
    recordedAt: "2026-08-24T10:00:00+09:00",
    component: "Button",
    category: "wrong-token",
    scope: "all-components",
    status: "approved",
    context: {
      figma: {
        fileKey: "file-key",
        nodeIds: ["1:2"],
        fingerprint: "sha256:example",
        variant: { Size: "Medium" },
      },
      repository: {
        beforeRevision: "before-sha",
        afterRevision: "after-sha",
        changedFiles: ["packages/react/src/ui/button.tsx"],
        designLanguagePath: "packages/design-language/components/Button/Button.md",
      },
      storybook: {
        storyId: "components-button--primary",
        args: { size: "md" },
        globals: { theme: "light", density: "expressive" },
        viewport: { width: 1280, height: 720 },
      },
      skill: {
        name: "orca-react-component",
        revision: "skill-sha",
        model: null,
      },
    },
    feedback: {
      summary: "Tailwind標準scaleではなくsemantic tokenを使う",
      target: "Button root gap",
      artifactLocators: [],
    },
    before: {
      summary: "Tailwind標準scaleを使用していた",
      codeLocators: ["packages/react/src/ui/button.tsx:10"],
      tokenUsage: {
        figmaVariable: "Spacing/Margin/Large",
        token: null,
        cssVariable: null,
        className: "gap-2",
        resolvedValue: "8px",
      },
    },
    after: {
      summary: "semantic token classへ修正した",
      codeLocators: ["packages/react/src/ui/button.tsx:10"],
      tokenUsage: {
        figmaVariable: "Spacing/Margin/Large",
        token: "margin.large",
        cssVariable: "--spacing-margin-lg",
        className: "gap-margin-lg",
        resolvedValue: "8px",
      },
    },
    resolution: {
      summary: "semantic token classへ置換した",
      reason: "同じ値でもtokenの意味を保持するため",
      approvedAt: "2026-08-24T10:30:00+09:00",
      regressionChecks: [
        {
          kind: "lint",
          locator: "packages/react/src/ui/button.tsx",
          expectation: "gap-2を含まない",
        },
      ],
    },
    promotionTargets: ["lint-or-test", "skill-reference"],
  };
}

function validInboxEntry() {
  return {
    schemaVersion: "1.0",
    id: "button-gap-feedback-001",
    submittedAt: "2026-08-24T09:30:00+09:00",
    updatedAt: "2026-08-24T09:30:00+09:00",
    submittedBy: "design-system-team",
    component: "Button",
    category: "untriaged",
    scope: "untriaged",
    status: "new",
    capture: {
      method: "agent-command",
      dedupeKey: `sha256:${"a".repeat(64)}`,
    },
    context: {
      figma: {
        fileKey: "file-key",
        nodeIds: ["1:2"],
        fingerprint: "sha256:example",
        variant: { Size: "Medium" },
      },
      repository: {
        revision: "feedback-sha",
        changedFiles: ["packages/react/src/ui/button.tsx"],
        designLanguagePath: "packages/design-language/components/Button/Button.md",
      },
      storybook: {
        storyId: "components-button--primary",
        args: { size: "md" },
        globals: { theme: "light", density: "expressive" },
        viewport: { width: 1280, height: 720 },
      },
      skill: {
        name: "orca-react-component",
        revision: "skill-sha",
        model: null,
      },
    },
    feedback: {
      summary: "余白に使用しているtokenを確認したい",
      verbatim: "余白に使用しているtokenを確認したい",
      target: "Button root gap",
      artifactLinks: ["https://example.invalid/discussion/artifact"],
    },
    discussionUrl: null,
    triage: {
      owner: null,
      decision: null,
      decidedAt: null,
      caseId: null,
    },
  };
}

test("有効なtoken FBケースを受理する", () => {
  assert.deepEqual(validateFeedbackCase(validCase(), schema), []);
});

test("token categoryでは修正前後のtokenUsageを必須にする", () => {
  const feedbackCase = validCase();
  delete feedbackCase.before.tokenUsage;
  delete feedbackCase.after.tokenUsage;
  const errors = validateFeedbackCase(feedbackCase, schema);
  assert(errors.some((error) => error.includes("$.before.tokenUsage")));
  assert(errors.some((error) => error.includes("$.after.tokenUsage")));
});

test("未定義プロパティと不正なdate-timeを拒否する", () => {
  const feedbackCase = validCase();
  feedbackCase.unknown = true;
  feedbackCase.recordedAt = "2026-08-24";
  const errors = validateFeedbackCase(feedbackCase, schema);
  assert(errors.some((error) => error.includes("$.unknown")));
  assert(errors.some((error) => error.includes("$.recordedAt")));
});

test("case-onlyとほかの昇格先を併記できない", () => {
  const feedbackCase = validCase();
  feedbackCase.promotionTargets = ["case-only", "lint-or-test"];
  const errors = validateFeedbackCase(feedbackCase, schema);
  assert(errors.some((error) => error.includes("case-only")));
});

test("ファイル名とcase IDの不一致を検出する", () => {
  const casesDir = mkdtempSync(join(tmpdir(), "orca-component-feedback-"));
  try {
    writeFileSync(join(casesDir, "wrong-name.json"), JSON.stringify(validCase()));
    const result = validateCasesDirectory({ schemaPath, casesDir });
    assert.equal(result.caseCount, 1);
    assert(result.errors.some((error) => error.includes("id とファイル名")));
  } finally {
    rmSync(casesDir, { recursive: true });
  }
});

test("共有inboxのnewエントリを受理する", () => {
  assert.deepEqual(validateInboxEntry(validInboxEntry(), inboxSchema), []);
});

test("triagedではcategory、scope、ownerを必須にする", () => {
  const entry = validInboxEntry();
  entry.status = "triaged";
  const errors = validateInboxEntry(entry, inboxSchema);
  assert(errors.some((error) => error.includes("$.triage.owner")));
  assert(errors.some((error) => error.includes("$.category")));
  assert(errors.some((error) => error.includes("$.scope")));
});

test("acceptedでは判断と承認済みケースへの参照を必須にする", () => {
  const entry = validInboxEntry();
  entry.status = "accepted";
  entry.category = "wrong-token";
  entry.scope = "all-components";
  entry.triage.owner = "frontend-team";
  const errors = validateInboxEntry(entry, inboxSchema);
  assert(errors.some((error) => error.includes("$.triage.decision")));
  assert(errors.some((error) => error.includes("$.triage.decidedAt")));
  assert(errors.some((error) => error.includes("$.triage.caseId")));
});

test("accepted inboxと承認済みケースの参照を検証する", () => {
  const root = mkdtempSync(join(tmpdir(), "orca-component-feedback-repository-"));
  const casesDir = join(root, "cases");
  const inboxDir = join(root, "inbox");
  mkdirSync(casesDir);
  mkdirSync(inboxDir);

  try {
    const feedbackCase = validCase();
    writeFileSync(
      join(casesDir, `${feedbackCase.id}.json`),
      JSON.stringify(feedbackCase),
    );

    const entry = validInboxEntry();
    entry.status = "accepted";
    entry.category = "wrong-token";
    entry.scope = "all-components";
    entry.updatedAt = "2026-08-24T10:30:00+09:00";
    entry.triage = {
      owner: "frontend-team",
      decision: "semantic tokenへ修正する",
      decidedAt: "2026-08-24T10:30:00+09:00",
      caseId: feedbackCase.id,
    };
    writeFileSync(join(inboxDir, `${entry.id}.json`), JSON.stringify(entry));

    const result = validateFeedbackRepository({
      caseSchemaPath: schemaPath,
      casesDir,
      inboxSchemaPath,
      inboxDir,
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.caseCount, 1);
    assert.equal(result.inboxCount, 1);
  } finally {
    rmSync(root, { recursive: true });
  }
});
