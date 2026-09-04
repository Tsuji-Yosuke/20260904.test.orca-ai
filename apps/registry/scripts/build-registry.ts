// ルート registry.json を生成し、shadcn build で配信用 JSON（public/r/）を出力する。
// ORCA_REGISTRY_BASE_URL を与えると registry 依存を絶対 URL で出力する（ホスティング確定後用）。
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegistry } from "../src/catalog";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const baseUrl = process.env.ORCA_REGISTRY_BASE_URL || undefined;

const registry = buildRegistry({ repoRoot, baseUrl });
writeFileSync(join(repoRoot, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);
console.log(`registry.json generated (${registry.items.length} items${baseUrl ? `, baseUrl=${baseUrl}` : ", namespace refs"})`);

const result = spawnSync(
  "pnpm",
  ["exec", "shadcn", "build", "registry.json", "--output", "apps/registry/public/r"],
  { cwd: repoRoot, stdio: "inherit" },
);
process.exit(result.status ?? 1);
