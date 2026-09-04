import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Select } from "./select";

const members = [
  { value: "tanaka", label: "田中 太郎" },
  { value: "suzuki", label: "鈴木 花子" },
  { value: "sato", label: "佐藤 次郎" },
  { value: "takahashi", label: "高橋 三郎" },
  { value: "ito", label: "伊藤 四郎", disabled: true },
];

const meta: Meta<typeof Select> = {
  title: "Components/Select",
  component: Select,
  args: {
    items: members,
    "aria-label": "担当者",
    placeholder: "担当者を選択",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["small", "medium", "large"] },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    error: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Select>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[280px]">{children}</div>
);

export const Default: Story = {
  render: (args) => (
    <Frame>
      <Select {...args} />
    </Frame>
  ),
};

// AC-Select-02（検証: Storybook）: Trigger の Size（Small/Medium/Large）が固定高さの
// 3 段階（40px / 48px / 56px）として区別できる。
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3 w-[280px]">
      <Select {...args} size="small" placeholder="Small" />
      <Select {...args} size="medium" placeholder="Medium" />
      <Select {...args} size="large" placeholder="Large" />
    </div>
  ),
};

// AC-Select-12: Trigger 先頭の Leading Icon（装飾）。ProjectList 画面のフィルタ用途を再現
export const WithLeadingIcon: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3 w-[280px]">
      {(["small", "medium", "large"] as const).map((size) => (
        <Select
          {...args}
          key={size}
          size={size}
          leadingIcon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-full"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          }
        />
      ))}
    </div>
  ),
};

// AC-Select-01（検証: Storybook）: Trigger の 7 状態語彙が下線の太さ・色・背景の組み合わせで
// 区別できる。Hover/Focused/Active はマウスオーバー・Tab キー・クリックで目視確認する
// （Enabled の実例で確認: マウスオーバーで背景が沈み下線が黒 2px、Tab で同じ見た目 + focus
// リング、クリックで Active＝下線ではなく白背景＋薄い輪郭のプレーンな面に変わる）。
export const TriggerStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3 w-[280px]">
      <Select {...args} placeholder="Enabled（マウスオーバー・Tab・クリックで確認）" />
      <Select {...args} disabled defaultValue="sato" placeholder="Disabled" />
      <Select {...args} readOnly defaultValue="suzuki" placeholder="Read only" />
      <Select {...args} error errorMessage="担当者を選択してください" />
    </div>
  ),
};

// AC-Select-06（検証: Storybook）: Error 状態では Trigger 直下に Error Text 行が現れ、
// 背景・下線に加えて値・アイコンの前景もエラー色に切り替わる。Error Text の文字サイズは
// Size に追従する（12/14/16px・標準ウェイト・行高 24px）。
export const ErrorState: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3 w-[280px]">
      {(["small", "medium", "large"] as const).map((size) => (
        <Select
          {...args}
          key={size}
          size={size}
          defaultValue="sato"
          error
          errorMessage="担当者を選択してください"
        />
      ))}
    </div>
  ),
};

export const ReadOnly: Story = {
  render: (args) => (
    <Frame>
      <Select {...args} readOnly defaultValue="suzuki" />
    </Frame>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <Frame>
      <Select {...args} disabled defaultValue="sato" />
    </Frame>
  ),
};

// AC-Select-04（検証: Storybook）: Suggestion Surface は Trigger 幅にアンカーされ、
// 角丸・輪郭・影を持つ独立したサーフェスとして Trigger 直下に連続して読める。
// Surface は内側 padding を持たず、高さは Item（40px）の積み上げで決まる。
// AC-Select-07 / AC-Select-08（検証: Storybook）: Item の 5 状態語彙が区別できる。
// Enabled=白、Hover/Focused=state layer 重畳＋focus リング（マウスオーバー・矢印キーで確認）、
// Active（選択済み・鈴木）=行全面の黒塗り＋前景反転、Disabled（伊藤）=文字のみ弱色。
export const ItemStates: Story = {
  render: (args) => (
    <Frame>
      <Select {...args} defaultValue="suzuki" placeholder="開いて Item の状態を確認" />
    </Frame>
  ),
};

const itemIconGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-full"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
);

// AC-Select-13: Item の Leading / Trailing Icon スロット（装飾・16px 固定）。
// 前景色は Label に追従する（Active の黒塗りでは反転、Disabled では弱色）。
export const ItemIcons: Story = {
  render: (args) => (
    <Frame>
      <Select
        {...args}
        defaultValue="suzuki"
        items={members.map((m) => ({
          ...m,
          leadingIcon: itemIconGlyph,
          trailingIcon: itemIconGlyph,
        }))}
      />
    </Frame>
  ),
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <div className="flex flex-col gap-3 w-[280px]">
        <Select {...args} value={value} onValueChange={setValue} />
        <p className="typography-tight-body-small text-on-surface-dim">
          選択: {value ?? "（なし）"}
        </p>
      </div>
    );
  },
};
