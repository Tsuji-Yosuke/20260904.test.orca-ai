// registry generator の契約テスト。
// 原本（packages/react/src, packages/token-pipeline）が registry-ready であること、
// および catalog から生成される registry.json の構造を、実リポジトリに対して検証する。
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildRegistry, classifyImport } from "../src/catalog";
import { LIB_ITEMS, UI_ITEMS } from "@orca/component-meta";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const registry = buildRegistry({ repoRoot });
const itemByName = new Map(registry.items.map((item) => [item.name, item]));

function item(name: string) {
  const found = itemByName.get(name);
  if (!found) throw new Error(`item not found: ${name}`);
  return found;
}

describe("registry.json の構造", () => {
  it("$schema / name / homepage / items を持つ", () => {
    expect(registry.$schema).toBe("https://ui.shadcn.com/schema/registry.json");
    expect(registry.name).toBe("orca");
    expect(registry.homepage).toMatch(/^https:\/\//);
    expect(registry.items.length).toBe(18);
  });

  it("アイテムは name 昇順で決定的に生成される", () => {
    const names = registry.items.map((i) => i.name);
    expect(names).toEqual([...names].sort());
    expect(buildRegistry({ repoRoot })).toEqual(registry);
  });

  it("ui アイテムは 14 個、design-language の ready 原典と 1:1 対応する", () => {
    const uiItems = registry.items.filter((i) => i.type === "registry:ui");
    expect(uiItems.length).toBe(14);
    for (const meta of UI_ITEMS) {
      expect(meta.designDoc, meta.name).toBeTruthy();
      const docPath = join(repoRoot, meta.designDoc!);
      expect(existsSync(docPath), meta.designDoc).toBe(true);
      const doc = readFileSync(docPath, "utf8");
      expect(doc, meta.designDoc).toMatch(/^status: ready$/m);
    }
  });

  it("配布対象の ui/lib ソースは、いずれか 1 アイテムにちょうど 1 回含まれる", () => {
    const covered = [...UI_ITEMS, ...LIB_ITEMS].flatMap((meta) => meta.files);
    expect(new Set(covered).size).toBe(covered.length);
    // 実ファイルとの過不足は buildRegistry が検証し、違反時に throw する
    expect(covered.every((f) => existsSync(join(repoRoot, f)))).toBe(true);
  });
});

describe("依存関係の機械算出", () => {
  it("button: clsx（バージョン付き）+ focus-ring / tokens への registry 依存", () => {
    const button = item("button");
    expect(button.dependencies).toEqual(["clsx@^2.1.1"]);
    expect(button.registryDependencies).toEqual(
      expect.arrayContaining(["@orca/focus-ring", "@orca/tokens"]),
    );
  });

  it("dialog: icon-button への cross-component 依存と Base UI の exact pin", () => {
    const dialog = item("dialog");
    expect(dialog.dependencies).toEqual(
      expect.arrayContaining(["@base-ui/react@1.6.0", "clsx@^2.1.1"]),
    );
    expect(dialog.registryDependencies).toEqual(
      expect.arrayContaining(["@orca/icon-button", "@orca/tokens"]),
    );
  });

  it("select / search: option-row への依存", () => {
    expect(item("select").registryDependencies).toContain("@orca/option-row");
    expect(item("search").registryDependencies).toContain("@orca/option-row");
  });

  it("focus-ring は 9 個の ui アイテムから参照される", () => {
    const dependents = registry.items.filter((i) =>
      i.registryDependencies?.includes("@orca/focus-ring"),
    );
    expect(dependents.map((i) => i.name).sort()).toEqual([
      "button",
      "checkbox",
      "chip",
      "dropdown",
      "icon-button",
      "pagination",
      "search",
      "sidebar",
      "tabs",
    ]);
  });

  it("すべての ui / lib アイテムが tokens に registry 依存する", () => {
    for (const i of registry.items) {
      if (i.type === "registry:ui" || i.type === "registry:lib") {
        expect(i.registryDependencies, i.name).toContain("@orca/tokens");
      }
    }
  });

  it("baseUrl 指定時は registry 依存が絶対 URL になる", () => {
    const withUrl = buildRegistry({ repoRoot, baseUrl: "https://example.com" });
    const button = withUrl.items.find((i) => i.name === "button")!;
    expect(button.registryDependencies).toContain("https://example.com/r/tokens.json");
  });
});

describe("tokens アイテム", () => {
  it("4 つの CSS を ~/styles/orca/ に配布し、フォントを同梱する", () => {
    const tokens = item("tokens");
    expect(tokens.type).toBe("registry:item");
    expect(tokens.files.map((f) => f.target).sort()).toEqual([
      "~/styles/orca/orca.css",
      "~/styles/orca/tailwind-tokens.css",
      "~/styles/orca/tokens.css",
      "~/styles/orca/typography-utilities.css",
    ]);
    expect(tokens.dependencies).toEqual([
      "@fontsource/noto-sans-jp@^5.2.9",
      "@fontsource/roboto@^5.2.10",
    ]);
    expect(tokens.docs).toContain('@import "../styles/orca/orca.css"');
  });

  it("配布する tailwind-tokens.css は tailwindcss 本体を import しない", () => {
    const css = readFileSync(
      join(repoRoot, "packages/token-pipeline/generated/tailwind-tokens.css"),
      "utf8",
    );
    expect(css).not.toContain('@import "tailwindcss"');
  });
});

describe("orca メタアイテム", () => {
  it("全 14 ui アイテムへの registry 依存を持つ", () => {
    const orca = item("orca");
    expect(orca.type).toBe("registry:item");
    expect(orca.registryDependencies?.sort()).toEqual(
      UI_ITEMS.map((m) => `@orca/${m.name}`).sort(),
    );
  });
});

describe("原本の registry-ready 検査", () => {
  it("react / Base UI を import する配布対象ファイルは \"use client\" で始まる", () => {
    for (const meta of [...UI_ITEMS, ...LIB_ITEMS]) {
      for (const file of meta.files) {
        const content = readFileSync(join(repoRoot, file), "utf8");
        const usesClientRuntime = /from "(react|@base-ui\/react)/.test(content);
        if (usesClientRuntime) {
          expect(content.startsWith('"use client";'), file).toBe(true);
        }
      }
    }
  });

  it("import の分類: alias と同一ディレクトリ相対のみ許可し、親相対は拒否する", () => {
    expect(classifyImport("@/registry/orca/ui/icon-button")).toEqual({
      kind: "registry",
      item: "icon-button",
    });
    expect(classifyImport("@/registry/orca/lib/focus-ring")).toEqual({
      kind: "registry",
      item: "focus-ring",
    });
    expect(classifyImport("./get-pagination-items")).toEqual({ kind: "local" });
    expect(classifyImport("clsx")).toEqual({ kind: "npm", pkg: "clsx" });
    expect(classifyImport("@base-ui/react/dialog")).toEqual({
      kind: "npm",
      pkg: "@base-ui/react",
    });
    expect(classifyImport("react")).toEqual({ kind: "peer" });
    expect(classifyImport("react/jsx-runtime")).toEqual({ kind: "peer" });
    expect(() => classifyImport("../internal/focus-ring")).toThrow(/相対/);
    expect(() => classifyImport("@orca/token-pipeline")).toThrow();
  });

  it("同一ディレクトリ相対 import は同じアイテム内のファイルに閉じる", () => {
    // pagination.tsx → ./get-pagination-items は pagination アイテム内で完結している
    const pagination = UI_ITEMS.find((m) => m.name === "pagination")!;
    expect(pagination.files).toContain("packages/react/src/ui/get-pagination-items.ts");
  });
});
