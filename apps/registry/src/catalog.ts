// registry.json を原本から機械的に組み立てる。
// - 依存関係（npm / registry）は配布ソースの import 文から算出する
// - 原本が registry-ready であること（alias import のみ・配布ファイルの過不足なし）を
//   ビルド時に検証し、違反があれば throw して CI を落とす
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { LIB_ITEMS, UI_ITEMS, type ItemMeta } from "@orca/component-meta";

export interface RegistryFile {
  path: string;
  type: string;
  target?: string;
}

export interface RegistryItem {
  name: string;
  type: string;
  title: string;
  description: string;
  files: RegistryFile[];
  dependencies?: string[];
  registryDependencies?: string[];
  docs?: string;
}

export interface Registry {
  $schema: string;
  name: string;
  homepage: string;
  items: RegistryItem[];
}

export interface BuildOptions {
  repoRoot: string;
  /** 配布 URL が確定したら指定する。省略時は namespace 形式（@orca/<name>）で出力する。 */
  baseUrl?: string;
}

export type ClassifiedImport =
  | { kind: "registry"; item: string }
  | { kind: "local" }
  | { kind: "npm"; pkg: string }
  | { kind: "peer" };

export function classifyImport(spec: string): ClassifiedImport {
  if (spec === "react" || spec === "react-dom" || spec.startsWith("react/")) {
    return { kind: "peer" };
  }
  const aliased = spec.match(/^@\/registry\/orca\/(?:ui|lib)\/([\w-]+)$/);
  if (aliased) {
    return { kind: "registry", item: aliased[1]! };
  }
  if (spec.startsWith("./")) {
    return { kind: "local" };
  }
  if (spec.startsWith(".")) {
    throw new Error(
      `親ディレクトリへの相対 import は配布できません（@/registry/orca/* alias を使うこと）: ${spec}`,
    );
  }
  if (spec === "clsx") {
    return { kind: "npm", pkg: "clsx" };
  }
  if (spec === "@base-ui/react" || spec.startsWith("@base-ui/react/")) {
    return { kind: "npm", pkg: "@base-ui/react" };
  }
  throw new Error(`registry で扱えない import です（catalog に規則を追加する）: ${spec}`);
}

export function parseImports(source: string): string[] {
  const specs: string[] = [];
  const pattern = /(?:from|import)\s+"([^"]+)"/g;
  for (const match of source.matchAll(pattern)) {
    specs.push(match[1]!);
  }
  return specs;
}

const TOKEN_CSS_FILES = [
  { source: "packages/token-pipeline/registry/orca.css", name: "orca.css" },
  { source: "packages/token-pipeline/generated/tailwind-tokens.css", name: "tailwind-tokens.css" },
  { source: "packages/token-pipeline/generated/typography-utilities.css", name: "typography-utilities.css" },
  { source: "packages/token-pipeline/generated/tokens.css", name: "tokens.css" },
];

const TOKENS_DOCS = [
  "グローバル CSS の `@import \"tailwindcss\";` の後に 1 行追加してください:",
  '  @import "../styles/orca/orca.css";',
  "（パスは globals.css から styles/orca/ への相対パスに合わせて調整）",
  "styles/orca/ 配下は手編集せず、更新時は tokens を再 add（--overwrite）してください。",
  "next/font 等でフォントを自前管理する場合は orca.css 先頭の @fontsource 4 行を削除できます。",
  "テーマ属性（任意）: <html> に data-lang / data-density / data-color-system。現状 light テーマのみ。",
].join("\n");

/**
 * アイテムの説明文を解決する。designDoc があるアイテムは design-language 原典
 * frontmatter の description が正本（規約: packages/design-language/README.md）。
 */
export function descriptionOf(repoRoot: string, meta: ItemMeta): string {
  if (!meta.designDoc) {
    if (!meta.description) {
      throw new Error(`${meta.name}: designDoc も description も無いアイテムは説明を解決できません`);
    }
    return meta.description;
  }
  const markdown = readFileSync(join(repoRoot, meta.designDoc), "utf8");
  const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (!description) {
    throw new Error(`${meta.designDoc}: frontmatter に description がありません`);
  }
  return description;
}

/** 配布対象となる実ファイル（テスト・stories・notes・barrel を除く）を列挙する。 */
function listDistributableFiles(repoRoot: string, dir: "ui" | "lib"): string[] {
  return readdirSync(join(repoRoot, "packages/react/src", dir))
    .filter((name) => /\.(ts|tsx)$/.test(name))
    .filter((name) => !/\.(test|stories)\.(ts|tsx)$/.test(name))
    .map((name) => `packages/react/src/${dir}/${name}`)
    .sort();
}

function moduleBase(file: string): string {
  return basename(file).replace(/\.(ts|tsx)$/, "");
}

export function buildRegistry({ repoRoot, baseUrl }: BuildOptions): Registry {
  const reactPkg = JSON.parse(
    readFileSync(join(repoRoot, "packages/react/package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };
  const storybookPkg = JSON.parse(
    readFileSync(join(repoRoot, "apps/storybook/package.json"), "utf8"),
  ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

  const npmVersion = (pkg: string): string => {
    const version =
      reactPkg.dependencies?.[pkg] ??
      storybookPkg.dependencies?.[pkg] ??
      storybookPkg.devDependencies?.[pkg];
    if (!version) {
      throw new Error(`npm 依存のバージョンを特定できません: ${pkg}`);
    }
    return version;
  };

  const ref = (name: string): string =>
    baseUrl ? `${baseUrl.replace(/\/$/, "")}/r/${name}.json` : `@orca/${name}`;

  // 配布ファイルとメタの過不足検査
  const metaFiles = [...UI_ITEMS, ...LIB_ITEMS].flatMap((meta) => meta.files);
  const actualFiles = [
    ...listDistributableFiles(repoRoot, "ui"),
    ...listDistributableFiles(repoRoot, "lib"),
  ];
  const metaSet = new Set(metaFiles);
  const actualSet = new Set(actualFiles);
  const missing = actualFiles.filter((f) => !metaSet.has(f));
  const stale = metaFiles.filter((f) => !actualSet.has(f));
  if (missing.length > 0 || stale.length > 0) {
    throw new Error(
      `registry-meta と配布ソースが一致しません。\n` +
        `  meta に未登録: ${missing.join(", ") || "(なし)"}\n` +
        `  実体が無い: ${stale.join(", ") || "(なし)"}`,
    );
  }

  // モジュール名 → 所属アイテム
  const ownerOf = new Map<string, ItemMeta>();
  for (const meta of [...UI_ITEMS, ...LIB_ITEMS]) {
    for (const file of meta.files) {
      ownerOf.set(moduleBase(file), meta);
    }
  }

  const buildSourceItem = (meta: ItemMeta, type: "registry:ui" | "registry:lib"): RegistryItem => {
    const npmDeps = new Set<string>();
    const registryDeps = new Set<string>([ref("tokens")]);
    const localBases = new Set(meta.files.map(moduleBase));

    for (const file of meta.files) {
      const source = readFileSync(join(repoRoot, file), "utf8");
      for (const spec of parseImports(source)) {
        const classified = classifyImport(spec);
        if (classified.kind === "npm") {
          npmDeps.add(`${classified.pkg}@${npmVersion(classified.pkg)}`);
        } else if (classified.kind === "registry") {
          const owner = ownerOf.get(classified.item);
          if (!owner) {
            throw new Error(`${file}: import 先のアイテムが見つかりません: ${spec}`);
          }
          if (owner.name !== meta.name) {
            registryDeps.add(ref(owner.name));
          }
        } else if (classified.kind === "local") {
          const base = spec.replace(/^\.\//, "");
          if (!localBases.has(base)) {
            throw new Error(
              `${file}: 同一ディレクトリ相対 import "${spec}" がアイテム ${meta.name} の外を指しています。` +
                `別アイテムのファイルは @/registry/orca/* alias で import してください。`,
            );
          }
        }
      }
    }

    return {
      name: meta.name,
      type,
      title: meta.title,
      description: descriptionOf(repoRoot, meta),
      files: meta.files.map((path) => ({ path, type })),
      ...(npmDeps.size > 0 ? { dependencies: [...npmDeps].sort() } : {}),
      registryDependencies: [...registryDeps].sort(),
    };
  };

  const tokensItem: RegistryItem = {
    name: "tokens",
    type: "registry:item",
    title: "Orca design tokens",
    description:
      "Terrazzo 生成のトークン CSS 一式（Tailwind v4 @theme、typography / state-layer ユーティリティ、" +
      "data-lang / data-density / data-color-system テーマ変数）とフォント。",
    files: TOKEN_CSS_FILES.map(({ source, name }) => {
      if (!existsSync(join(repoRoot, source))) {
        throw new Error(`tokens の配布ファイルがありません: ${source}`);
      }
      return { path: source, type: "registry:file", target: `~/styles/orca/${name}` };
    }),
    dependencies: [
      `@fontsource/noto-sans-jp@${npmVersion("@fontsource/noto-sans-jp")}`,
      `@fontsource/roboto@${npmVersion("@fontsource/roboto")}`,
    ],
    docs: TOKENS_DOCS,
  };

  const orcaItem: RegistryItem = {
    name: "orca",
    type: "registry:item",
    title: "Orca UI (all components)",
    description: "Orca の全コンポーネントとデザイントークンを一括インストールするメタアイテム。",
    files: [],
    registryDependencies: UI_ITEMS.map((meta) => ref(meta.name)).sort(),
  };

  const items = [
    ...UI_ITEMS.map((meta) => buildSourceItem(meta, "registry:ui")),
    ...LIB_ITEMS.map((meta) => buildSourceItem(meta, "registry:lib")),
    tokensItem,
    orcaItem,
  ].sort((a, b) => a.name.localeCompare(b.name));

  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "orca",
    homepage: baseUrl ?? "https://github.com/orca-ds/orca",
    items,
  };
}
