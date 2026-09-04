import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Checkbox, type CheckboxSize } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Checkbox",
  component: Checkbox,
  args: {
    "aria-label": "同意する",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
    indeterminate: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

function Interactive(props: React.ComponentProps<typeof Checkbox>) {
  const [checked, setChecked] = useState(false);
  return <Checkbox {...props} checked={checked} onCheckedChange={setChecked} />;
}

export const Unchecked: Story = { render: (args) => <Interactive {...args} /> };
export const Selected: Story = {
  args: { defaultChecked: true },
};
export const Indeterminate: Story = {
  args: { indeterminate: true },
};

// AC-Checkbox-01（検証: Storybook）: Container は Small / Medium / Large の3段階の密度を持つ。
// AC-Checkbox-02（検証: Storybook）: Box は Container 中央に配置され、サイズごとの実寸差を保つ。
const sizes: CheckboxSize[] = ["sm", "md", "lg"];
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-padding-lg">
      {sizes.map((size) => (
        <Checkbox key={size} size={size} aria-label={`${size} 同意する`} defaultChecked />
      ))}
    </div>
  ),
};

// AC-Checkbox-03（検証: Storybook）: Unchecked（Enabled）の Box は塗りを持たず、境界線のみで表示される。
// AC-Checkbox-04（検証: Storybook）: Selected の Box は塗りつぶされ、チェックマークの Mark を表示する。
// AC-Checkbox-05（検証: Storybook）: Indeterminate の Box は塗りつぶされ、水平バーの Mark を表示し、
//   Selected のチェックマークとは異なる形状で区別できる。
export const ValueStates: Story = {
  render: () => (
    <div className="flex items-center gap-padding-lg">
      <Checkbox aria-label="unchecked" />
      <Checkbox aria-label="selected" defaultChecked />
      <Checkbox aria-label="indeterminate" indeterminate />
    </div>
  ),
};

// AC-Checkbox-06（検証: Storybook）: Hover は Container に state layer（オーバーレイ）が加わる。
// AC-Checkbox-07（検証: Storybook）: Active は Hover よりも強い state layer が加わる。
// マウスでの hover / mousedown で目視確認する（pseudo-class を script で強制しない）。
export const HoverAndActive: Story = {
  render: () => (
    <div className="flex items-center gap-padding-lg">
      <Checkbox aria-label="hover して確認" />
      <p className="typography-tight-body-small text-on-surface-dim">
        マウスを乗せる（hover）/ 押し下げる（active）と state layer の濃さの違いを確認できる。
      </p>
    </div>
  ),
};

// AC-Checkbox-08（検証: Storybook）: Focused は Container を囲む共有 focus リングを表示する。
// Tab キーでフォーカスすると focus-visible の共有リング（shadow-focus-outline）が見える。
export const Focused: Story = {
  render: () => (
    <div className="flex items-center gap-padding-lg">
      <Checkbox aria-label="1つ目" />
      <Checkbox aria-label="Tab で focus" />
    </div>
  ),
};

// AC-Checkbox-09（検証: Storybook）: Disabled は境界線色・塗り色を disabled 系の弱色に差し替え、
//   Hover / Active / Focused の強調を出さない。
export const DisabledStates: Story = {
  render: () => (
    <div className="flex items-center gap-padding-lg">
      <Checkbox aria-label="disabled unchecked" disabled />
      <Checkbox aria-label="disabled selected" disabled defaultChecked />
      <Checkbox aria-label="disabled indeterminate" disabled indeterminate />
    </div>
  ),
};

// AC-Checkbox-16（検証: Storybook）: 色・寸法・境界は token 経由で表現され、全テーマで破綻しない。
// data-theme（light/dark）を切り替えて確認する。
export const AllStatesGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-padding-lg items-center">
      {sizes.map((size) => (
        <div key={size} className="flex items-center gap-padding-md">
          <Checkbox size={size} aria-label={`${size} unchecked`} />
          <Checkbox size={size} aria-label={`${size} selected`} defaultChecked />
          <Checkbox size={size} aria-label={`${size} indeterminate`} indeterminate />
          <Checkbox size={size} aria-label={`${size} disabled unchecked`} disabled />
          <Checkbox
            size={size}
            aria-label={`${size} disabled selected`}
            disabled
            defaultChecked
          />
        </div>
      ))}
    </div>
  ),
};
