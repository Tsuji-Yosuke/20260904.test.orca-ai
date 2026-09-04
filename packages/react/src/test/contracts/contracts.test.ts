// design-language 原典（status: ready）の Acceptance Criteria と、
// このパッケージのテスト名を AC ID で突合する契約テスト。
// 規約の正本は packages/design-language/README.md。
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectAcIds, parseComponentDoc } from "./acceptance-criteria";

const here = dirname(fileURLToPath(import.meta.url));
const reactSrcDir = join(here, "..", "..");
const componentsDir = join(here, "..", "..", "..", "..", "design-language", "components");

function componentDocs() {
  return readdirSync(componentsDir)
    .map((name) => join(componentsDir, name, `${name}.md`))
    .filter((path) => statSync(path, { throwIfNoEntry: false })?.isFile())
    .map((path) => ({ path, contract: parseComponentDoc(readFileSync(path, "utf8")) }));
}

function componentTestFiles(dir = reactSrcDir): { path: string; content: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    // src/test はテストハーネス置き場（この契約テスト自身を含む）なので突合対象外
    if (entry.isDirectory()) {
      return path === join(reactSrcDir, "test") ? [] : componentTestFiles(path);
    }
    if (/\.test\.tsx?$/.test(entry.name)) {
      return [{ path, content: readFileSync(path, "utf8") }];
    }
    return [];
  });
}

const docs = componentDocs();
const readyDocs = docs.filter(({ contract }) => contract.status === "ready");
const testFiles = componentTestFiles();
const knownIds = new Set(
  docs.flatMap(({ contract }) => contract.criteria.map((c) => c.id)),
);

describe("design-language contracts", () => {
  it("ready な原典が存在し、Acceptance Criteria を持つ", () => {
    expect(readyDocs.length).toBeGreaterThan(0);
    for (const { path, contract } of readyDocs) {
      expect(contract.criteria.length, path).toBeGreaterThan(0);
    }
  });

  it("ready な原典の AC は契約として整形されている（ID 無し・重複・name 不一致が無い）", () => {
    const problems = readyDocs.flatMap(({ path, contract }) =>
      contract.problems.map((problem) => `${path}: ${problem}`),
    );
    expect(problems).toEqual([]);
  });

  it("検証区分の無い AC ID は、すべてテスト名から参照されている", () => {
    const missing = readyDocs.flatMap(({ contract }) =>
      contract.criteria
        .filter((c) => c.verification === null)
        .filter((c) => !testFiles.some(({ content }) => content.includes(c.id)))
        .map((c) => `${c.id}: ${c.text}`),
    );
    expect(missing).toEqual([]);
  });

  it("テストが参照する AC ID は、すべて原典に存在する", () => {
    const unknown = testFiles.flatMap(({ path, content }) =>
      collectAcIds(content)
        .filter((id) => !knownIds.has(id))
        .map((id) => `${path}: ${id}`),
    );
    expect(unknown).toEqual([]);
  });
});
