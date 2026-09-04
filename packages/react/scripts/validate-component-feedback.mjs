import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultSchemaPath = join(packageDir, "evals/component-feedback/schema.json");
const defaultCasesDir = join(packageDir, "evals/component-feedback/cases");
const defaultInboxSchemaPath = join(
  packageDir,
  "evals/component-feedback/inbox-schema.json",
);
const defaultInboxDir = join(packageDir, "evals/component-feedback/inbox");

const TOKEN_CATEGORIES = new Set([
  "wrong-token",
  "raw-value",
  "missing-token",
  "wrong-composition",
  "wrong-state-layer",
]);

function describeType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function matchesType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function resolveReference(rootSchema, reference) {
  if (!reference.startsWith("#/")) {
    throw new Error(`外部 $ref は未対応です: ${reference}`);
  }
  return reference
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], rootSchema);
}

function stableValue(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`)
    .join(",")}}`;
}

export function validateAgainstSchema(value, schema, rootSchema = schema, path = "$") {
  const errors = [];

  if (schema.$ref) {
    const referenced = resolveReference(rootSchema, schema.$ref);
    if (!referenced) return [`${path}: $ref ${schema.$ref} を解決できません`];
    return validateAgainstSchema(value, referenced, rootSchema, path);
  }

  if (Object.hasOwn(schema, "const") && value !== schema.const) {
    errors.push(`${path}: ${JSON.stringify(schema.const)} である必要があります`);
  }

  if (schema.enum && !schema.enum.some((candidate) => candidate === value)) {
    errors.push(`${path}: 許可値は ${schema.enum.join(", ")} です`);
  }

  const expectedTypes = Array.isArray(schema.type)
    ? schema.type
    : schema.type
      ? [schema.type]
      : [];
  if (expectedTypes.length > 0 && !expectedTypes.some((type) => matchesType(value, type))) {
    errors.push(
      `${path}: type は ${expectedTypes.join(" | ")} である必要があります（実際: ${describeType(value)}）`,
    );
    return errors;
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: ${schema.minLength}文字以上である必要があります`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: pattern ${schema.pattern} に一致しません`);
    }
    if (schema.format === "date-time") {
      const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
      if (!isoDateTime.test(value) || Number.isNaN(Date.parse(value))) {
        errors.push(`${path}: timezone 付き ISO 8601 date-time である必要があります`);
      }
    }
  }

  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum) {
    errors.push(`${path}: ${schema.minimum}以上である必要があります`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: ${schema.minItems}件以上である必要があります`);
    }
    if (schema.uniqueItems) {
      const serialized = value.map(stableValue);
      if (new Set(serialized).size !== serialized.length) {
        errors.push(`${path}: 重複項目を含められません`);
      }
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateAgainstSchema(item, schema.items, rootSchema, `${path}[${index}]`));
      });
    }
  }

  if (matchesType(value, "object")) {
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) {
        errors.push(`${path}.${required}: 必須です`);
      }
    }

    const properties = schema.properties ?? {};
    for (const [key, childValue] of Object.entries(value)) {
      if (Object.hasOwn(properties, key)) {
        errors.push(
          ...validateAgainstSchema(childValue, properties[key], rootSchema, `${path}.${key}`),
        );
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}.${key}: 未定義のプロパティです`);
      } else if (
        schema.additionalProperties &&
        typeof schema.additionalProperties === "object"
      ) {
        errors.push(
          ...validateAgainstSchema(
            childValue,
            schema.additionalProperties,
            rootSchema,
            `${path}.${key}`,
          ),
        );
      }
    }
  }

  return errors;
}

export function validateFeedbackCase(feedbackCase, schema) {
  const errors = validateAgainstSchema(feedbackCase, schema);

  if (TOKEN_CATEGORIES.has(feedbackCase?.category)) {
    if (!feedbackCase.before?.tokenUsage) {
      errors.push("$.before.tokenUsage: token 関連 category では必須です");
    }
    if (!feedbackCase.after?.tokenUsage) {
      errors.push("$.after.tokenUsage: token 関連 category では必須です");
    }
  }

  if (feedbackCase?.status === "superseded" && !feedbackCase.supersededBy) {
    errors.push("$.supersededBy: status=superseded では後継ケースIDが必須です");
  }
  if (feedbackCase?.status === "approved" && feedbackCase.supersededBy) {
    errors.push("$.supersededBy: status=approved では指定できません");
  }

  const targets = feedbackCase?.promotionTargets;
  if (Array.isArray(targets) && targets.includes("case-only") && targets.length > 1) {
    errors.push("$.promotionTargets: case-only はほかの昇格先と併記できません");
  }

  return errors;
}

export function validateInboxEntry(entry, schema) {
  const errors = validateAgainstSchema(entry, schema);
  const triage = entry?.triage;

  if (entry?.submittedAt && entry?.updatedAt) {
    if (Date.parse(entry.updatedAt) < Date.parse(entry.submittedAt)) {
      errors.push("$.updatedAt: submittedAt 以降である必要があります");
    }
  }

  if (entry?.status === "new") {
    if (triage?.owner || triage?.decision || triage?.decidedAt || triage?.caseId) {
      errors.push("$.triage: status=new では owner、decision、decidedAt、caseId を null にします");
    }
  }

  if (["triaged", "accepted", "rejected"].includes(entry?.status)) {
    if (!triage?.owner) errors.push("$.triage.owner: triage 後は必須です");
    if (entry?.category === "untriaged") {
      errors.push("$.category: triage 後は category を確定する必要があります");
    }
    if (entry?.scope === "untriaged") {
      errors.push("$.scope: triage 後は scope を確定する必要があります");
    }
  }

  if (["accepted", "rejected"].includes(entry?.status)) {
    if (!triage?.decision) errors.push("$.triage.decision: 判断完了時は必須です");
    if (!triage?.decidedAt) errors.push("$.triage.decidedAt: 判断完了時は必須です");
  }

  if (entry?.status === "accepted" && !triage?.caseId) {
    errors.push("$.triage.caseId: status=accepted では承認済みケースIDが必須です");
  }
  if (entry?.status !== "accepted" && triage?.caseId) {
    errors.push("$.triage.caseId: status=accepted 以外では指定できません");
  }

  return errors;
}

function readJsonRecords(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name) === ".json")
    .map((entry) => entry.name)
    .sort()
    .map((fileName) => {
      try {
        return {
          fileName,
          value: JSON.parse(readFileSync(join(directory, fileName), "utf8")),
          parseError: null,
        };
      } catch (error) {
        return { fileName, value: null, parseError: error.message };
      }
    });
}

function validateRecordIdentity(records) {
  const errors = [];
  const ids = new Map();

  for (const { fileName, value } of records) {
    if (!value?.id) continue;
    const expectedFileName = `${value.id}.json`;
    if (fileName !== expectedFileName) {
      errors.push(`${fileName}: id とファイル名を一致させてください（期待: ${expectedFileName}）`);
    }
    const previous = ids.get(value.id);
    if (previous) {
      errors.push(`${fileName}: id ${value.id} は ${previous} と重複しています`);
    } else {
      ids.set(value.id, fileName);
    }
  }

  return { errors, ids };
}

export function validateCasesDirectory({
  schemaPath = defaultSchemaPath,
  casesDir = defaultCasesDir,
} = {}) {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const records = readJsonRecords(casesDir);
  const errors = [];
  for (const { fileName, value, parseError } of records) {
    if (parseError) {
      errors.push(`${fileName}: JSON をparseできません: ${parseError}`);
      continue;
    }
    for (const error of validateFeedbackCase(value, schema)) {
      errors.push(`${fileName}: ${error}`);
    }
  }

  const identity = validateRecordIdentity(records);
  errors.push(...identity.errors);
  for (const { fileName, value } of records) {
    if (
      value?.status === "superseded" &&
      value.supersededBy &&
      !identity.ids.has(value.supersededBy)
    ) {
      errors.push(`${fileName}: supersededBy ${value.supersededBy} に対応するケースがありません`);
    }
  }

  return {
    caseCount: records.length,
    errors,
    cases: records.filter(({ value }) => value).map(({ value }) => value),
    ids: identity.ids,
  };
}

export function validateInboxDirectory({
  schemaPath = defaultInboxSchemaPath,
  inboxDir = defaultInboxDir,
  caseIds = new Map(),
} = {}) {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const records = readJsonRecords(inboxDir);
  const errors = [];

  for (const { fileName, value, parseError } of records) {
    if (parseError) {
      errors.push(`${fileName}: JSON をparseできません: ${parseError}`);
      continue;
    }
    for (const error of validateInboxEntry(value, schema)) {
      errors.push(`${fileName}: ${error}`);
    }
    if (
      value?.status === "accepted" &&
      value.triage?.caseId &&
      !caseIds.has(value.triage.caseId)
    ) {
      errors.push(
        `${fileName}: triage.caseId ${value.triage.caseId} に対応する承認済みケースがありません`,
      );
    }
  }

  const identity = validateRecordIdentity(records);
  errors.push(...identity.errors);
  return {
    inboxCount: records.length,
    errors,
    entries: records.filter(({ value }) => value).map(({ value }) => value),
  };
}

export function validateFeedbackRepository({
  caseSchemaPath = defaultSchemaPath,
  casesDir = defaultCasesDir,
  inboxSchemaPath = defaultInboxSchemaPath,
  inboxDir = defaultInboxDir,
} = {}) {
  const cases = validateCasesDirectory({ schemaPath: caseSchemaPath, casesDir });
  const inbox = validateInboxDirectory({
    schemaPath: inboxSchemaPath,
    inboxDir,
    caseIds: cases.ids,
  });
  return {
    caseCount: cases.caseCount,
    inboxCount: inbox.inboxCount,
    cases: cases.cases,
    entries: inbox.entries,
    errors: [
      ...cases.errors.map((error) => `cases/${error}`),
      ...inbox.errors.map((error) => `inbox/${error}`),
    ],
  };
}

function main() {
  const result = validateFeedbackRepository();
  if (result.errors.length > 0) {
    console.error(`component-feedback: ${result.errors.length}件の問題があります`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `component-feedback: inbox ${result.inboxCount}件、承認済みケース ${result.caseCount}件を検証しました`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
