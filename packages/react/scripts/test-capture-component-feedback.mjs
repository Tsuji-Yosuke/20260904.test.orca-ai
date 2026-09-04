import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
  captureFeedback,
  collectChangedFiles,
  extractFigmaContext,
  findDesignDocument,
  parseCaptureArgs,
} from "./capture-component-feedback.mjs";

const packageDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const schemaPath = join(packageDir, "evals/component-feedback/inbox-schema.json");

function write(path, contents) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, contents);
}

function git(repoRoot, ...args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function createRepository() {
  const repoRoot = mkdtempSync(join(tmpdir(), "orca-feedback-capture-"));
  git(repoRoot, "init", "-b", "main");
  git(repoRoot, "config", "user.name", "Orca Tester");
  git(repoRoot, "config", "user.email", "orca@example.invalid");

  write(
    join(repoRoot, "packages/design-language/components/Button/Button.md"),
    `---
name: Button
sources:
  figma:
    - https://www.figma.com/design/fileKey123/Common-UI?node-id=1188-1293&m=dev
---
`,
  );
  write(join(repoRoot, "packages/react/src/ui/button.tsx"), "export const Button = () => null;\n");
  write(
    join(repoRoot, ".claude/skills/orca-react-component/SKILL.md"),
    "---\nname: orca-react-component\ndescription: test\n---\n",
  );
  git(repoRoot, "add", ".");
  git(repoRoot, "commit", "-m", "initial");
  write(
    join(repoRoot, "packages/react/src/ui/button.tsx"),
    "export const Button = () => <button />;\n",
  );
  return repoRoot;
}

test("design-languageからFigma contextを補完する", () => {
  const markdown = `---
sources:
  figma:
    - https://www.figma.com/design/example-key/UI?node-id=10-20&m=dev
---
`;
  assert.deepEqual(extractFigmaContext(markdown), {
    fileKey: "example-key",
    nodeIds: ["10:20"],
  });
});

test("CLI引数を構造化する", () => {
  assert.deepEqual(
    parseCaptureArgs([
      "--component",
      "Button",
      "--feedback",
      "余白が広い",
      "--story-args",
      '{"size":"md"}',
      "--viewport",
      "1280x720",
      "--artifact-link",
      "https://example.invalid/a",
    ]),
    {
      component: "Button",
      feedback: "余白が広い",
      storyArgs: { size: "md" },
      viewport: { width: 1280, height: 720 },
      artifactLinks: ["https://example.invalid/a"],
      figmaNodeIds: [],
    },
  );
});

test("FB原文と自動取得したcontextを共有inboxへ保存する", () => {
  const repoRoot = createRepository();
  const inboxDir = join(repoRoot, "packages/react/evals/component-feedback/inbox");
  try {
    const designDocument = findDesignDocument(repoRoot, "Button");
    assert.equal(
      designDocument.relativePath,
      "packages/design-language/components/Button/Button.md",
    );
    assert.deepEqual(collectChangedFiles(repoRoot), ["packages/react/src/ui/button.tsx"]);

    const result = captureFeedback(
      {
        component: "Button",
        feedback: "Mediumの左右paddingがFigmaより広い",
        target: "Button root",
        storyId: "components-button--primary",
        storyArgs: { size: "md", disabled: false },
        viewport: { width: 1280, height: 720 },
      },
      {
        repoRoot,
        inboxDir,
        schemaPath,
        now: new Date("2026-08-24T10:00:00.000Z"),
        idSuffix: "abcdef12",
      },
    );

    assert.equal(result.created, true);
    const entry = JSON.parse(readFileSync(result.path, "utf8"));
    assert.equal(entry.id, "button-20260824t100000000z-abcdef12");
    assert.equal(entry.status, "new");
    assert.equal(entry.submittedBy, "Orca Tester");
    assert.equal(entry.feedback.verbatim, "Mediumの左右paddingがFigmaより広い");
    assert.equal(entry.context.figma.fileKey, "fileKey123");
    assert.deepEqual(entry.context.figma.nodeIds, ["1188:1293"]);
    assert.deepEqual(entry.context.repository.changedFiles, [
      "packages/react/src/ui/button.tsx",
    ]);
    assert.match(entry.context.skill.revision, /^sha256:[a-f0-9]{64}$/);
    assert.match(entry.capture.dedupeKey, /^sha256:[a-f0-9]{64}$/);

    const duplicate = captureFeedback(
      {
        component: "Button",
        feedback: "Mediumの左右paddingがFigmaより広い",
        target: "Button root",
        storyId: "components-button--primary",
        storyArgs: { disabled: false, size: "md" },
        viewport: { width: 1280, height: 720 },
      },
      { repoRoot, inboxDir, schemaPath },
    );
    assert.equal(duplicate.created, false);
    assert.equal(duplicate.entry.id, entry.id);

    const differentStoryArgs = captureFeedback(
      {
        component: "Button",
        feedback: "Mediumの左右paddingがFigmaより広い",
        target: "Button root",
        storyId: "components-button--primary",
        storyArgs: { size: "lg" },
        viewport: { width: 1280, height: 720 },
      },
      {
        repoRoot,
        inboxDir,
        schemaPath,
        now: new Date("2026-08-24T10:01:00.000Z"),
        idSuffix: "34567890",
      },
    );
    assert.equal(differentStoryArgs.created, true);
  } finally {
    rmSync(repoRoot, { recursive: true });
  }
});

test("不足contextを捏造せずnullまたは空配列で保存する", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "orca-feedback-capture-minimal-"));
  const inboxDir = join(repoRoot, "inbox");
  try {
    git(repoRoot, "init", "-b", "main");
    git(repoRoot, "config", "user.name", "Orca Tester");
    git(repoRoot, "config", "user.email", "orca@example.invalid");
    write(join(repoRoot, "README.md"), "test\n");
    git(repoRoot, "add", ".");
    git(repoRoot, "commit", "-m", "initial");

    const result = captureFeedback(
      { component: "UnknownComponent", feedback: "  見た目が違う\n" },
      {
        repoRoot,
        inboxDir,
        schemaPath,
        now: new Date("2026-08-24T11:00:00.000Z"),
        idSuffix: "12345678",
      },
    );
    assert.equal(result.entry.context.figma.fileKey, null);
    assert.deepEqual(result.entry.context.figma.nodeIds, []);
    assert.equal(result.entry.context.storybook.storyId, null);
    assert.equal(result.entry.context.storybook.viewport, null);
    assert.equal(result.entry.feedback.verbatim, "  見た目が違う\n");
    assert.equal(result.entry.feedback.target, null);
  } finally {
    rmSync(repoRoot, { recursive: true });
  }
});
