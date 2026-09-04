// 手書き config（PR #89 時点）から definePlayground ベースへの移行で、
// 型から導出する controls とアイコン用オーバーレイの組み合わせを検証する。
import { describe, expect, it } from "vitest";
import { buttonPlayground } from "./button";
import { defaultValues, generateJsx } from "../generate-jsx";
import type { ControlValues } from "../types";

const values = (overrides: ControlValues = {}): ControlValues => ({
  ...defaultValues(buttonPlayground.controls),
  ...overrides,
});

describe("buttonPlayground（definePlayground 移行の等価性）", () => {
  it("コントロール構成が手書き config と等価（prop / kind / label / 既定値 / 順序）", () => {
    expect(
      buttonPlayground.controls.map(({ kind, prop, label, defaultValue }) => ({
        kind,
        prop,
        label,
        defaultValue,
      })),
    ).toEqual([
      { kind: "select", prop: "variant", label: "Variant", defaultValue: "primary" },
      { kind: "select", prop: "size", label: "Size", defaultValue: "md" },
      { kind: "text", prop: "children", label: "Label", defaultValue: "ラベル" },
      { kind: "toggle", prop: "disabled", label: "Disabled", defaultValue: false },
      { kind: "toggle", prop: "leadingIcon", label: "Show Leading Icon", defaultValue: false },
      { kind: "toggle", prop: "trailingIcon", label: "Show Trailing Icon", defaultValue: false },
    ]);
  });

  it("variant / size の選択肢は TS 型から導出される", () => {
    const select = (prop: string) =>
      buttonPlayground.controls.find((control) => control.prop === prop);
    expect(select("variant")).toMatchObject({ options: ["primary", "secondary", "ghost"] });
    expect(select("size")).toMatchObject({ options: ["sm", "md", "lg"] });
  });

  it("既定値の生成コードが旧実装と一致する", () => {
    expect(generateJsx(buttonPlayground, values())).toBe(
      ['import { Button } from "@orca/react";', "", "<Button>", "  ラベル", "</Button>", ""].join("\n"),
    );
  });

  it("variant / disabled の生成コードが旧実装と一致する", () => {
    expect(generateJsx(buttonPlayground, values({ variant: "ghost", disabled: true }))).toContain(
      '<Button variant="ghost" disabled>',
    );
  });

  it("アイコン toggle は選択中のアイコン名に対応する JSX を出す", () => {
    expect(generateJsx(buttonPlayground, values({ leadingIcon: true }))).toContain(
      "leadingIcon={<PlusIcon />}",
    );
    expect(
      generateJsx(buttonPlayground, values({ leadingIcon: true, leadingIconName: "arrow" })),
    ).toContain("leadingIcon={<ArrowIcon />}");
  });

  it("アイコン名 select は生成コードに漏れない（旧実装のバグ修正）", () => {
    const jsx = generateJsx(
      buttonPlayground,
      values({ leadingIcon: true, leadingIconName: "arrow" }),
    );
    expect(jsx).not.toContain("leadingIconName");
  });

  it("render が propMappers 経由でアイコンを解決できる（throw しない）", () => {
    expect(() => buttonPlayground.render(values({ leadingIcon: true, trailingIcon: true }))).not.toThrow();
  });
});
