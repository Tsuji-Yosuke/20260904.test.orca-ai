import { describe, expect, it } from "vitest";
import { activeControls, defaultValues, generateJsx } from "./generate-jsx";
import type { ControlValues, PlaygroundConfig } from "./types";

const config: PlaygroundConfig = {
  component: "Button",
  imports: ['import { Button } from "@orca/react";'],
  controls: [
    { kind: "select", prop: "variant", label: "Variant", options: ["primary", "secondary", "ghost"], defaultValue: "primary" },
    { kind: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"], defaultValue: "md" },
    { kind: "text", prop: "children", label: "Label", defaultValue: "ラベル", asChildren: true },
    { kind: "toggle", prop: "disabled", label: "Disabled", defaultValue: false },
    {
      kind: "toggle",
      prop: "leadingIcon",
      label: "Show Leading Icon",
      defaultValue: false,
      jsxValue: (currentValues) =>
        currentValues["leadingIconName"] === "search" ? "<SearchIcon />" : "<PlusIcon />",
      children: [
        {
          kind: "select",
          prop: "leadingIconName",
          label: "Leading Icon",
          options: ["plus", "search"],
          defaultValue: "plus",
          uiOnly: true,
        },
      ],
    },
  ],
  render: () => null,
};

const values = (overrides: ControlValues = {}): ControlValues => ({
  ...defaultValues(config.controls),
  ...overrides,
});

describe("defaultValues", () => {
  it("ネスト項目を含む全コントロールの既定値を集める", () => {
    expect(defaultValues(config.controls)).toEqual({
      variant: "primary",
      size: "md",
      children: "ラベル",
      disabled: false,
      leadingIcon: false,
      leadingIconName: "plus",
    });
  });
});

describe("activeControls", () => {
  it("toggle が OFF のとき children を含めない", () => {
    const active = activeControls(config.controls, values());
    expect(active.map(({ prop }) => prop)).not.toContain("leadingIconName");
  });

  it("toggle が ON のとき children を含める", () => {
    const active = activeControls(config.controls, values({ leadingIcon: true }));
    expect(active.map(({ prop }) => prop)).toContain("leadingIconName");
  });
});

describe("generateJsx", () => {
  it("すべて既定値なら props を出力しない", () => {
    expect(generateJsx(config, values())).toBe(
      ['import { Button } from "@orca/react";', "", "<Button>", "  ラベル", "</Button>", ""].join("\n"),
    );
  });

  it("既定値と異なる select だけを属性に出力する", () => {
    expect(generateJsx(config, values({ variant: "ghost" }))).toContain('<Button variant="ghost">');
    expect(generateJsx(config, values({ variant: "ghost" }))).not.toContain("size=");
  });

  it("boolean toggle は属性名のみ出力する", () => {
    expect(generateJsx(config, values({ disabled: true }))).toContain("<Button disabled>");
  });

  it("jsxValue 付き toggle は JSX 式を出力する", () => {
    expect(generateJsx(config, values({ leadingIcon: true }))).toContain(
      "<Button leadingIcon={<PlusIcon />}>",
    );
  });

  it("ネストした選択値を JSX 式へ反映する", () => {
    expect(
      generateJsx(config, values({ leadingIcon: true, leadingIconName: "search" })),
    ).toContain("<Button leadingIcon={<SearchIcon />}>");
  });

  it("children テキストの変更を反映する", () => {
    expect(generateJsx(config, values({ children: "保存" }))).toContain("  保存");
  });

  it("JSXとして特別な文字を含む children を文字列式にする", () => {
    expect(generateJsx(config, values({ children: "保存 < {draft}" }))).toContain(
      '{"保存 < {draft}"}',
    );
  });

  it("開きタグが長いときは属性を複数行に分ける", () => {
    const jsx = generateJsx(
      config,
      values({ variant: "secondary", size: "lg", disabled: true, leadingIcon: true }),
    );
    expect(jsx).toContain("<Button\n");
    expect(jsx).toContain('  variant="secondary"\n');
  });

  it("children の無いコンポーネントは自己閉じタグにする", () => {
    const selfClosing: PlaygroundConfig = {
      component: "Avatar",
      imports: ['import { Avatar } from "@orca/react";'],
      controls: [
        { kind: "select", prop: "size", label: "Size", options: ["sm", "md"], defaultValue: "sm" },
      ],
      render: () => null,
    };
    expect(generateJsx(selfClosing, { size: "md" })).toContain('<Avatar size="md" />');
  });
});
