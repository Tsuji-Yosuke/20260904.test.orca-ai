import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Search } from "./search";

const fruits = [
  "りんご",
  "みかん",
  "ぶどう",
  "もも",
  "いちご",
  "メロン",
  "バナナ",
  "なし",
];

const meta: Meta<typeof Search> = {
  title: "Components/Search",
  component: Search,
  args: {
    "aria-label": "果物を検索",
    placeholder: "果物を検索",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["small", "medium", "large"] },
    disabled: { control: "boolean" },
    error: { control: "boolean" },
    loading: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Search>;

// AC-Search-01（検証: Storybook）: Enabled / Hover / Focused の各状態語彙をこの Canvas 上でポインタ操作・
// キーボード操作により視覚的に区別できる（Hover はマウスを乗せる、Focused はクリック/Tab で確認）
export const Default: Story = {
  render: (args) => (
    <div className="w-[360px]">
      <Search {...args} />
    </div>
  ),
};

// AC-Search-07（検証: Storybook）: 入力してサジェストを展開すると、Container の下線が太く・黒くなり、
// Suggestion Surface と視覚的に連続した 1 つのサーフェスとして読める（Active 状態）
export const WithSuggestions: Story = {
  render: (args) => (
    <div className="w-[360px]">
      <Search {...args} items={fruits} />
    </div>
  ),
};

// AC-Search-01（検証: Storybook）: Small / Medium / Large のサイズ語彙を視覚的に区別できる
// AC-Search-10（検証: Storybook）: Size は固定高（Small 40px / Medium 48px / Large 56px）で、
// 内容や状態によって高さが変わらない
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3 w-[360px]">
      <Search {...args} size="small" placeholder="Small" />
      <Search {...args} size="medium" placeholder="Medium" />
      <Search {...args} size="large" placeholder="Large" />
    </div>
  ),
};

export const WithClear: Story = {
  render: (args) => (
    <div className="w-[360px]">
      <Search {...args} defaultValue="りんご" />
    </div>
  ),
};

export const WithTrailingHint: Story = {
  render: (args) => (
    <div className="w-[360px]">
      <Search
        {...args}
        trailingHint={
          <kbd className="typography-tight-body-small rounded-sm border-sm border-outline px-padding-sm">
            ⌘K
          </kbd>
        }
      />
    </div>
  ),
};

export const Loading: Story = {
  render: (args) => (
    <div className="w-[360px]">
      <Search {...args} defaultValue="りん" loading />
    </div>
  ),
};

// AC-Search-01（検証: Storybook）: Error 状態を視覚的に区別できる（下線 2px・警告色 + 専用アイコン + 補助テキスト）
export const Error: Story = {
  render: (args) => (
    <div className="w-[360px]">
      <Search {...args} defaultValue="!!!" error errorMessage="記号は使えません" />
    </div>
  ),
};

// AC-Search-01（検証: Storybook）: Disabled 状態を視覚的に区別できる（専用の背景・下線トークン）
export const Disabled: Story = {
  render: (args) => (
    <div className="w-[360px]">
      <Search {...args} disabled />
    </div>
  ),
};

export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState("");
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <div className="flex flex-col gap-3 w-[360px]">
        <Search
          {...args}
          items={fruits}
          value={value}
          onValueChange={setValue}
          onSubmit={setSubmitted}
        />
        <p className="typography-tight-body-small text-on-surface-dim">
          入力: {value || "（なし）"} / 送信: {submitted ?? "（なし）"}
        </p>
      </div>
    );
  },
};
