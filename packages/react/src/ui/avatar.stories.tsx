import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./avatar";
import { AvatarUnit } from "./avatar-unit";

const meta: Meta<typeof Avatar> = {
  title: "Components/Avatar",
  component: Avatar,
  args: {
    name: "田中 太郎",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    decorative: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Avatar>;

export const InitialsFallback: Story = {};

export const WithImage: Story = {
  args: {
    src: "https://i.pravatar.cc/120?img=12",
    name: "Hanako Suzuki",
  },
};

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-3/5">
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6Z" />
  </svg>
);

export const IconFallback: Story = {
  args: { name: "ゲスト", fallback: <PersonIcon /> },
};

// AC-Avatar-03（検証: Storybook）: 密度3段階（Small/Medium/Large）を区別できる。
// AC-Avatar-04（検証: Storybook）: 形状は常に完全な円形であり、他の形状 variant は存在しない。
// AC-Avatar-06（検証: Storybook）: Container の外周に常設の白いボーダーが表示される。
// AC-Avatar-08（検証: Storybook）: 色・寸法・ボーダーは token 経由で、全テーマで破綻しない。
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-4 p-4">
      <Avatar {...args} size="sm" />
      <Avatar {...args} size="md" />
      <Avatar {...args} size="lg" />
    </div>
  ),
};

// AC-Avatar-09（検証: Storybook）: AvatarUnit は複数の Avatar を、各 Avatar のボーダーが
// 境界として視認できる状態を保ったまま重ねて表示する（Figma node 9005:9563 と同じ 5 個重ねの例）。
// Figma の AvatarUnit は 40px（sm）の Avatar で定義されており、重なり -12px はサイズ非連動の
// 固定値。md/lg では重なり比率が下がるため、Figma と同じ見た目になるのは sm のみ。
export const Unit: Story = {
  render: () => (
    <div className="p-4">
      <AvatarUnit role="group" aria-label="参加者 5 名">
        {["田中 太郎", "鈴木 花子", "佐藤 次郎", "高橋 三郎", "山田 五郎"].map((n) => (
          <Avatar key={n} name={n} size="sm" decorative />
        ))}
      </AvatarUnit>
    </div>
  ),
};
