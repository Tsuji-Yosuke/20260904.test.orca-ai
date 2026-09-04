import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validateInboxEntry } from "./validate-component-feedback.mjs";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultRepoRoot = resolve(packageDir, "../..");
const defaultInboxDir = join(packageDir, "evals/component-feedback/inbox");
const defaultSchemaPath = join(
  packageDir,
  "evals/component-feedback/inbox-schema.json",
);

function runGit(repoRoot, args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function stableValue(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`)
    .join(",")}}`;
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function componentSlug(component) {
  return component
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function normalizedName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match?.[1] ?? "";
}

function listDesignDocuments(repoRoot) {
  const componentsDir = join(repoRoot, "packages/design-language/components");
  if (!existsSync(componentsDir)) return [];

  return readdirSync(componentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const directory = join(componentsDir, entry.name);
      return readdirSync(directory, { withFileTypes: true })
        .filter((child) => child.isFile() && child.name.endsWith(".md"))
        .map((child) => join(directory, child.name));
    });
}

export function findDesignDocument(repoRoot, component) {
  const expectedName = normalizedName(component);
  const expectedImplementation = `packages/react/src/ui/${componentSlug(component)}.tsx`;
  const ranked = [];

  for (const absolutePath of listDesignDocuments(repoRoot)) {
    const contents = readFileSync(absolutePath, "utf8");
    const frontmatter = extractFrontmatter(contents);
    const declaredName = frontmatter.match(/^name:\s*([^\r\n#]+)/m)?.[1]?.trim() ?? "";
    const relativePath = normalizePath(relative(repoRoot, absolutePath));
    let score = Number.POSITIVE_INFINITY;

    if (normalizedName(declaredName) === expectedName) score = 0;
    else if (frontmatter.includes(expectedImplementation)) score = 1;
    else if (normalizedName(basename(absolutePath, ".md")) === expectedName) score = 2;

    if (Number.isFinite(score)) ranked.push({ absolutePath, relativePath, contents, score });
  }

  return ranked.sort(
    (left, right) => left.score - right.score || left.relativePath.localeCompare(right.relativePath),
  )[0] ?? null;
}

export function extractFigmaContext(markdown) {
  const frontmatter = extractFrontmatter(markdown);
  const urls =
    frontmatter.match(/https:\/\/www\.figma\.com\/(?:design|file)\/[^\s"'<>),]+/g) ?? [];
  let fileKey = null;
  const nodeIds = [];

  for (const rawUrl of urls) {
    try {
      const url = new URL(rawUrl);
      const segments = url.pathname.split("/").filter(Boolean);
      fileKey ??= segments[1] ?? null;
      const nodeId = url.searchParams.get("node-id");
      if (nodeId) nodeIds.push(nodeId.replace("-", ":"));
    } catch {
      // 不正な source URL は補完せず、未取得のまま保存する。
    }
  }

  return { fileKey, nodeIds: [...new Set(nodeIds)] };
}

function splitNullDelimited(output) {
  return output.split("\0").filter(Boolean);
}

export function collectChangedFiles(repoRoot) {
  const files = new Set();
  const addOutput = (output) => {
    for (const path of splitNullDelimited(output)) files.add(normalizePath(path));
  };

  for (const reference of ["origin/main", "main"]) {
    const base = runGit(repoRoot, ["merge-base", "HEAD", reference]);
    if (!base) continue;
    addOutput(runGit(repoRoot, ["diff", "--name-only", "-z", `${base}...HEAD`]));
    break;
  }

  addOutput(runGit(repoRoot, ["diff", "--name-only", "-z"]));
  addOutput(runGit(repoRoot, ["diff", "--cached", "--name-only", "-z"]));
  addOutput(runGit(repoRoot, ["ls-files", "--others", "--exclude-standard", "-z"]));

  return [...files]
    .filter(
      (path) =>
        !path.startsWith("packages/react/evals/component-feedback/inbox/") &&
        !path.startsWith("packages/react/evals/component-feedback/cases/") &&
        !path.startsWith(".artifacts/component-feedback/"),
    )
    .sort();
}

function resolveSkillRevision(repoRoot) {
  const skillPath = join(repoRoot, ".claude/skills/orca-react-component/SKILL.md");
  return existsSync(skillPath) ? sha256(readFileSync(skillPath)) : "unavailable";
}

function resolveSubmitter(repoRoot, explicitSubmitter) {
  const candidates = [
    explicitSubmitter,
    process.env.ORCA_FEEDBACK_SUBMITTED_BY,
    runGit(repoRoot, ["config", "user.name"]),
    runGit(repoRoot, ["config", "user.email"]),
  ];
  return candidates.find((value) => typeof value === "string" && value.trim())?.trim() ?? "user";
}

function readExistingEntries(inboxDir) {
  if (!existsSync(inboxDir)) return [];
  return readdirSync(inboxDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .flatMap((entry) => {
      try {
        return [JSON.parse(readFileSync(join(inboxDir, entry.name), "utf8"))];
      } catch {
        return [];
      }
    });
}

function makeId(component, now, suffix) {
  const timestamp = now.toISOString().replace(/[-:.]/g, "").toLowerCase();
  return `${componentSlug(component) || "component"}-${timestamp}-${suffix}`;
}

export function captureFeedback(
  input,
  {
    repoRoot = defaultRepoRoot,
    inboxDir = defaultInboxDir,
    schemaPath = defaultSchemaPath,
    now = new Date(),
    idSuffix,
  } = {},
) {
  const component = input.component?.trim();
  const feedback = input.feedback;
  if (!component) throw new Error("--component は必須です");
  if (typeof feedback !== "string" || !feedback.trim()) {
    throw new Error("--feedback は必須です");
  }

  const designDocument = findDesignDocument(repoRoot, component);
  const discoveredFigma = designDocument
    ? extractFigmaContext(designDocument.contents)
    : { fileKey: null, nodeIds: [] };
  const revision = runGit(repoRoot, ["rev-parse", "HEAD"]) || "unavailable";
  const capturedAt = now.toISOString();
  const storyId = input.storyId ?? null;
  const target = input.target?.trim() || null;
  const figmaFileKey = input.figmaFileKey ?? discoveredFigma.fileKey;
  const figmaNodeIds = input.figmaNodeIds?.length
    ? [...new Set(input.figmaNodeIds)]
    : discoveredFigma.nodeIds;
  const dedupeKey = sha256(
    stableValue({
      component,
      revision,
      feedback,
      target,
      storyId,
      storyArgs: input.storyArgs ?? {},
      storyGlobals: input.storyGlobals ?? {},
      viewport: input.viewport ?? null,
      figmaFileKey,
      figmaNodeIds,
      figmaVariant: input.figmaVariant ?? {},
    }),
  );

  if (!input.force) {
    const existing = readExistingEntries(inboxDir).find(
      (entry) => entry.capture?.dedupeKey === dedupeKey,
    );
    if (existing) {
      return {
        created: false,
        entry: existing,
        path: join(inboxDir, `${existing.id}.json`),
      };
    }
  }

  const suffix = idSuffix ?? randomUUID().replaceAll("-", "").slice(0, 8);
  const id = makeId(component, now, suffix);
  const entry = {
    schemaVersion: "1.0",
    id,
    submittedAt: capturedAt,
    updatedAt: capturedAt,
    submittedBy: resolveSubmitter(repoRoot, input.submittedBy),
    component,
    category: input.category ?? "untriaged",
    scope: input.scope ?? "untriaged",
    status: "new",
    capture: {
      method: "agent-command",
      dedupeKey,
    },
    context: {
      figma: {
        fileKey: figmaFileKey,
        nodeIds: figmaNodeIds,
        fingerprint: input.figmaFingerprint ?? null,
        variant: input.figmaVariant ?? {},
      },
      repository: {
        revision,
        changedFiles: collectChangedFiles(repoRoot),
        designLanguagePath: designDocument?.relativePath ?? null,
      },
      storybook: {
        storyId,
        args: input.storyArgs ?? {},
        globals: input.storyGlobals ?? {},
        viewport: input.viewport ?? null,
      },
      skill: {
        name: "orca-react-component",
        revision: resolveSkillRevision(repoRoot),
        model: input.model ?? process.env.ORCA_FEEDBACK_MODEL ?? null,
      },
    },
    feedback: {
      summary: feedback,
      verbatim: feedback,
      target,
      artifactLinks: [...new Set(input.artifactLinks ?? [])],
    },
    discussionUrl: input.discussionUrl ?? null,
    triage: {
      owner: null,
      decision: null,
      decidedAt: null,
      caseId: null,
    },
  };

  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const errors = validateInboxEntry(entry, schema);
  if (errors.length > 0) {
    throw new Error(`生成したFBがschemaに一致しません:\n- ${errors.join("\n- ")}`);
  }

  mkdirSync(inboxDir, { recursive: true });
  const path = join(inboxDir, `${id}.json`);
  writeFileSync(path, `${JSON.stringify(entry, null, 2)}\n`, { flag: "wx" });
  return { created: true, entry, path };
}

function readJsonOption(value, option) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("objectではありません");
    }
    return parsed;
  } catch (error) {
    throw new Error(`${option} はJSON objectで指定してください: ${error.message}`);
  }
}

function optionValue(argv, index, option) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${option} の値がありません`);
  }
  return value;
}

export function parseCaptureArgs(argv) {
  const input = { artifactLinks: [], figmaNodeIds: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--") continue;
    if (option === "--help" || option === "-h") return { help: true };
    if (option === "--force") {
      input.force = true;
      continue;
    }

    const value = optionValue(argv, index, option);
    index += 1;
    switch (option) {
      case "--component":
        input.component = value;
        break;
      case "--feedback":
      case "--summary":
        input.feedback = value;
        break;
      case "--feedback-file":
        input.feedback = readFileSync(resolve(value), "utf8");
        break;
      case "--target":
        input.target = value;
        break;
      case "--submitted-by":
        input.submittedBy = value;
        break;
      case "--category":
        input.category = value;
        break;
      case "--scope":
        input.scope = value;
        break;
      case "--figma-file-key":
        input.figmaFileKey = value;
        break;
      case "--figma-node-id":
        input.figmaNodeIds.push(value);
        break;
      case "--figma-fingerprint":
        input.figmaFingerprint = value;
        break;
      case "--figma-variant":
        input.figmaVariant = readJsonOption(value, option);
        break;
      case "--story-id":
        input.storyId = value;
        break;
      case "--story-args":
        input.storyArgs = readJsonOption(value, option);
        break;
      case "--story-globals":
        input.storyGlobals = readJsonOption(value, option);
        break;
      case "--viewport": {
        const match = value.match(/^(\d+)x(\d+)$/);
        if (!match) throw new Error("--viewport は WIDTHxHEIGHT 形式で指定してください");
        input.viewport = { width: Number(match[1]), height: Number(match[2]) };
        break;
      }
      case "--artifact-link":
        input.artifactLinks.push(value);
        break;
      case "--discussion-url":
        input.discussionUrl = value;
        break;
      case "--model":
        input.model = value;
        break;
      default:
        throw new Error(`未対応のoptionです: ${option}`);
    }
  }

  return input;
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @orca/react feedback:capture -- \\
    --component Button \\
    --feedback "ユーザーから受け取ったFB原文" \\
    [--target "対象要素"] [--story-id "components-button--primary"]

FBはstatus=newで共有inboxへ保存されます。省略したFigma情報、Git情報、投稿者、skill revisionは可能な範囲で自動補完します。`);
}

function main() {
  try {
    const input = parseCaptureArgs(process.argv.slice(2));
    if (input.help) {
      printHelp();
      return;
    }
    const result = captureFeedback(input);
    const relativePath = normalizePath(relative(defaultRepoRoot, result.path));
    if (result.created) console.log(`component-feedback: ${relativePath} にFBを保存しました`);
    else console.log(`component-feedback: 同じFBは保存済みです (${relativePath})`);
  } catch (error) {
    console.error(`component-feedback: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
