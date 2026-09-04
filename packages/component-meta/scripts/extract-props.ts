// UI_ITEMS の各コンポーネントから PropSchema を抽出し、
// src/generated/prop-schemas.ts を決定的な内容で書き出す。
// 実行: pnpm --filter @orca/component-meta meta:extract
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Project } from "ts-morph";
import { UI_ITEMS } from "../src/items";
import {
  extractComponentSchema,
  type ComponentSchema,
} from "../src/extract/extract-component-schema";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(packageRoot, "..", "..");

// own members のみを読むため型解決は不要。対象ファイル単体を最小構成でロードする。
const project = new Project({
  compilerOptions: { allowJs: false, skipLibCheck: true },
  skipAddingFilesFromTsConfig: true,
});

const schemas: ComponentSchema[] = [];
for (const item of UI_ITEMS) {
  const file = item.files[0];
  if (!file) throw new Error(`${item.name}: files が空です`);
  const sourceFile = project.addSourceFileAtPath(join(repoRoot, file));
  schemas.push(extractComponentSchema(sourceFile, item.name, item.title));
}

const banner = [
  "// このファイルは scripts/extract-props.ts による生成物。手編集しない。",
  "// 再生成: pnpm --filter @orca/component-meta meta:extract",
  "// CI は meta:check で packages/react とのドリフトを検出する。",
  'import type { ComponentSchema } from "../extract/schema-types";',
  "",
  "export const PROP_SCHEMAS = {",
].join("\n");

const body = schemas
  .map((schema) => `  "${schema.name}": ${JSON.stringify(schema, null, 2).replace(/\n/g, "\n  ")},`)
  .join("\n");

const footer = "} as const satisfies Record<string, ComponentSchema>;\n";

writeFileSync(
  join(packageRoot, "src/generated/prop-schemas.ts"),
  `${banner}\n${body}\n${footer}`,
);
console.log(`prop-schemas.ts を生成しました（${schemas.length} コンポーネント）`);
