import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Project } from "ts-morph";
import { extractComponentSchema } from "./extract-component-schema";

const FIXTURE = `
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type SampleVariant = "primary" | "secondary" | "ghost";

export interface SampleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 見た目の強さ。 */
  variant?: SampleVariant;
  scope?: "col" | "row";
  count?: number;
  /** アクセシブルネーム。 */
  "aria-label"?: string;
  label: string;
  active?: boolean;
  icon?: ReactNode;
  onPick?: (value: string) => void;
}

export const Sample = forwardRef(function Sample(
  { variant = "primary", scope = "col", active = false, count = 3, ...rest },
  ref,
) {
  return null;
});
`;

function extract(source: string, displayName = "Sample") {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { skipLibCheck: true } });
  const file = project.createSourceFile("sample.tsx", source);
  return extractComponentSchema(file, "sample", displayName);
}

describe("extractComponentSchema", () => {
  const schema = extract(FIXTURE);
  const prop = (name: string) => schema.props.find((entry) => entry.name === name);

  it("string literal union を型エイリアスの宣言順で enum にする", () => {
    expect(prop("variant")).toMatchObject({
      kind: "enum",
      options: ["primary", "secondary", "ghost"],
      defaultValue: "primary",
      required: false,
      jsdoc: "見た目の強さ。",
    });
  });

  it("inline union も enum として扱う", () => {
    expect(prop("scope")).toMatchObject({ kind: "enum", options: ["col", "row"], defaultValue: "col" });
  });

  it("boolean / number / string / node / 関数を分類する", () => {
    expect(prop("active")).toMatchObject({ kind: "boolean", defaultValue: false });
    expect(prop("count")).toMatchObject({ kind: "number", defaultValue: 3 });
    expect(prop("label")).toMatchObject({ kind: "string", required: true });
    expect(prop("icon")).toMatchObject({ kind: "node" });
    expect(prop("onPick")).toMatchObject({ kind: "other" });
  });

  it("クォート付きキーを素の名前に正規化する", () => {
    expect(prop("aria-label")).toMatchObject({ kind: "string", jsdoc: "アクセシブルネーム。" });
  });

  it("継承（extends）由来の props は含めない", () => {
    expect(prop("disabled")).toBeUndefined();
    expect(prop("children")).toBeUndefined();
  });

  it("同じ prop 名を持つ別コンポーネントのデフォルトを拾わない", () => {
    const source = `
function Helper({ variant = "secondary" }) { return null; }
export type SampleVariant = "primary" | "secondary";
export interface SampleProps { variant?: SampleVariant; }
export const Sample = forwardRef(function Sample({ variant = "primary" }, ref) { return null; });
`;
    expect(extract(source).props[0]?.defaultValue).toBe("primary");
  });

  it("interface が無く型エイリアスだけなら own props ゼロとして扱う", () => {
    const schema = extract('export type EmptyProps = { className?: string };\n', "Empty");
    expect(schema.props).toEqual([]);
  });

  it("interface も型エイリアスも無ければ throw する", () => {
    expect(() => extract("export const x = 1;\n", "Missing")).toThrow();
  });
});

describe("実ファイルからの抽出（回帰スナップショット）", () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
  const project = new Project({ compilerOptions: { skipLibCheck: true }, skipAddingFilesFromTsConfig: true });

  it("button: variant / size / leadingIcon / trailingIcon", () => {
    const file = project.addSourceFileAtPath(join(repoRoot, "packages/react/src/ui/button.tsx"));
    const schema = extractComponentSchema(file, "button", "Button");
    expect(schema.props.map(({ name, kind }) => [name, kind])).toEqual([
      ["variant", "enum"],
      ["size", "enum"],
      ["leadingIcon", "node"],
      ["trailingIcon", "node"],
    ]);
  });

  it("checkbox: Base UI 継承は展開せず own members（size / className）のみ", () => {
    const file = project.addSourceFileAtPath(join(repoRoot, "packages/react/src/ui/checkbox.tsx"));
    const schema = extractComponentSchema(file, "checkbox", "Checkbox");
    expect(schema.props.map(({ name }) => name)).toEqual(["size", "className"]);
  });
});
