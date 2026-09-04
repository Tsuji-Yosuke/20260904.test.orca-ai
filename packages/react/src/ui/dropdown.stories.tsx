import type { Meta, StoryObj } from "@storybook/react";
import { Dropdown } from "./dropdown";

const meta: Meta<typeof Dropdown> = {
  title: "Components/Dropdown",
  component: Dropdown,
};
export default meta;

type Story = StoryObj<typeof Dropdown>;

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);

// AC-Dropdown-02（検証: Storybook）: Menu Item は leading/trailing icon（任意）+ label（必須）
// + disabled（任意）のみを持つ単一種類。チェックボックス/ラジオ/グループ見出し/区切り線/
// サブメニューを持たない。
// AC-Dropdown-07（検証: Storybook）: Trigger は leading icon（任意）+ label（必須、flex-1）
// + trailing icon（任意）の構成を持つ。
export const Default: Story = {
  render: () => (
    <Dropdown>
      <Dropdown.Trigger leadingIcon={<PencilIcon />} trailingIcon={<ChevronDownIcon />}>
        操作
      </Dropdown.Trigger>
      <Dropdown.Menu>
        <Dropdown.Item leadingIcon={<PencilIcon />} onClick={() => {}}>
          編集
        </Dropdown.Item>
        <Dropdown.Item leadingIcon={<CopyIcon />} onClick={() => {}}>
          複製
        </Dropdown.Item>
        <Dropdown.Item leadingIcon={<TrashIcon />} onClick={() => {}}>
          削除
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  ),
};

// AC-Dropdown-06（検証: Storybook）: Trigger の size（sm/md/lg）は高さ 40/48/56 の 3 段階
// として区別できる。
export const TriggerSizes: Story = {
  render: () => (
    <div className="flex items-center gap-margin-lg">
      <Dropdown>
        <Dropdown.Trigger size="sm" trailingIcon={<ChevronDownIcon />}>
          Small
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item>編集</Dropdown.Item>
          <Dropdown.Item>複製</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      <Dropdown>
        <Dropdown.Trigger size="md" trailingIcon={<ChevronDownIcon />}>
          Medium
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item>編集</Dropdown.Item>
          <Dropdown.Item>複製</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      <Dropdown>
        <Dropdown.Trigger size="lg" trailingIcon={<ChevronDownIcon />}>
          Large
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item>編集</Dropdown.Item>
          <Dropdown.Item>複製</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  ),
};

// AC-Dropdown-08（検証: Storybook）: Menu Item は高さ 40px 固定で、Trigger の size に
// 連動しない（Large の Trigger を開いても Menu Item は Small/Medium と同じ高さ）。
export const MenuItemHeightIndependentOfTriggerSize: Story = {
  render: () => (
    <Dropdown defaultOpen modal={false}>
      <Dropdown.Trigger size="lg" trailingIcon={<ChevronDownIcon />}>
        Large Trigger
      </Dropdown.Trigger>
      <Dropdown.Menu>
        <Dropdown.Item>編集</Dropdown.Item>
        <Dropdown.Item>複製</Dropdown.Item>
        <Dropdown.Item>削除</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  ),
};

// AC-Dropdown-09（検証: Storybook）: Menu Item の 5 状態が視覚的に区別できる。
// Enabled=面と同化した白、Hover/Focused=黒 8% レイヤー重畳・共有 focus リング
// （マウスオーバー・矢印キーで確認）、Active=押下中のみ黒 16% レイヤー（マウスダウンで確認）、
// Disabled（無効な項目）=背景は変えず文字とアイコンのみ弱色。
export const ItemStates: Story = {
  render: () => (
    <Dropdown defaultOpen modal={false}>
      <Dropdown.Trigger trailingIcon={<ChevronDownIcon />}>
        開いて状態を確認
      </Dropdown.Trigger>
      <Dropdown.Menu>
        <Dropdown.Item leadingIcon={<PencilIcon />}>
          編集（マウスオーバー・Tab・クリックで確認）
        </Dropdown.Item>
        <Dropdown.Item leadingIcon={<CopyIcon />}>複製</Dropdown.Item>
        <Dropdown.Item leadingIcon={<TrashIcon />} disabled>
          削除（disabled）
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  ),
};

// AC-Dropdown-10（検証: Storybook）: Menu Surface は Trigger 直下に gap を空けて開き、
// Trigger の描画幅に追従し、1px の輪郭線・角丸を持ち影を持たない。
export const MenuSurfaceFollowsTriggerWidth: Story = {
  render: () => (
    <Dropdown defaultOpen modal={false}>
      <Dropdown.Trigger
        leadingIcon={<PencilIcon />}
        trailingIcon={<ChevronDownIcon />}
      >
        幅の広いトリガーラベル
      </Dropdown.Trigger>
      <Dropdown.Menu>
        <Dropdown.Item>編集</Dropdown.Item>
        <Dropdown.Item>複製</Dropdown.Item>
        <Dropdown.Item>削除</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  ),
};

// AC-Dropdown-12（検証: Storybook）: 色・寸法・角丸・影は token 経由で全テーマで破綻しない。
// Storybook のテーマ切替（data-theme）で Light/Dark 双方を確認する。
export const ThemeCheck: Story = {
  render: () => (
    <Dropdown defaultOpen modal={false}>
      <Dropdown.Trigger
        leadingIcon={<PencilIcon />}
        trailingIcon={<ChevronDownIcon />}
      >
        操作
      </Dropdown.Trigger>
      <Dropdown.Menu>
        <Dropdown.Item leadingIcon={<PencilIcon />}>編集</Dropdown.Item>
        <Dropdown.Item leadingIcon={<CopyIcon />}>複製</Dropdown.Item>
        <Dropdown.Item leadingIcon={<TrashIcon />} disabled>
          削除
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  ),
};

// AC-Dropdown-13: アイコンだけのボタンからメニューを開く（一覧のカードに置く「…」メニュー）
export const IconTrigger: Story = {
  render: () => (
    <Dropdown>
      <Dropdown.IconTrigger
        label="カードの操作"
        variant="secondary"
        size="sm"
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="size-full"
          >
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
          </svg>
        }
      />
      <Dropdown.Menu>
        <Dropdown.Item>複製する</Dropdown.Item>
        <Dropdown.Item>名前を変更する</Dropdown.Item>
        <Dropdown.Item>削除する</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  ),
};
