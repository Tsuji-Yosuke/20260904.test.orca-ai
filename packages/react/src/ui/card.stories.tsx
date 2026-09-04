import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./card";
import { Button } from "@/registry/orca/ui/button";
import { IconButton } from "@/registry/orca/ui/icon-button";

const meta: Meta<typeof Card> = {
  title: "Components/Card",
  component: Card,
};
export default meta;

type Story = StoryObj<typeof Card>;

const MoreIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-full"
  >
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

// Figma（node 9481:8874）実測: published Card の variant 軸は hasImage / hasContextMenu の2つ。
// 以下 4 story はその組み合わせに対応する。

// AC-Card-02（検証: Storybook）: スロットは Image → Header → Content → Footer の順序で表示される。
// AC-Card-06（検証: Storybook）: Container は白背景・1px 枠線・角丸を持つ。
// AC-Card-08（検証: Storybook）: 色・余白・角丸は token 経由で、全テーマで破綻しない。
export const HasImageHasContextMenu: Story = {
  name: "hasImage=true / hasContextMenu=true",
  render: () => (
    <div className="w-[334px]">
      <Card>
        <Card.Media>
          <img alt="" src="https://picsum.photos/seed/orca/480/200" />
        </Card.Media>
        <Card.Header action={<IconButton label="メニューを開く" icon={<MoreIcon />} variant="ghost" size="sm" shape="circle" />}>
          <Card.Title>カードのタイトル</Card.Title>
          <Card.Description>主題を補足する短い説明文。</Card.Description>
        </Card.Header>
        <Card.Body>
          ここに主たる内容が入ります。要約に留め、詳細は遷移先に委ねます。
        </Card.Body>
        <Card.Footer>
          <Button size="sm">開く</Button>
          <Button size="sm" variant="ghost">
            あとで
          </Button>
        </Card.Footer>
      </Card>
    </div>
  ),
};

export const HasImageNoContextMenu: Story = {
  name: "hasImage=true / hasContextMenu=false",
  render: () => (
    <div className="w-[334px]">
      <Card>
        <Card.Media>
          <img alt="" src="https://picsum.photos/seed/orca-2/480/200" />
        </Card.Media>
        <Card.Header>
          <Card.Title>カードのタイトル</Card.Title>
          <Card.Description>主題を補足する短い説明文。</Card.Description>
        </Card.Header>
        <Card.Body>
          ここに主たる内容が入ります。要約に留め、詳細は遷移先に委ねます。
        </Card.Body>
      </Card>
    </div>
  ),
};

export const NoImageHasContextMenu: Story = {
  name: "hasImage=false / hasContextMenu=true",
  render: () => (
    <div className="w-[334px]">
      <Card>
        <Card.Header action={<IconButton label="メニューを開く" icon={<MoreIcon />} variant="ghost" size="sm" shape="circle" />}>
          <Card.Title>カードのタイトル</Card.Title>
          <Card.Description>主題を補足する短い説明文。</Card.Description>
        </Card.Header>
        <Card.Body>
          画像が無い場合、Header は本文幅いっぱいから始まります。
        </Card.Body>
        <Card.Footer>
          <Button size="sm">開く</Button>
        </Card.Footer>
      </Card>
    </div>
  ),
};

// AC-Card-09（検証: Storybook）: Title は太字見出しスタイル・Brand/Primary 系の色、
// Description は本文スタイル・UI/OnSurface 系の色で表示される。
export const NoImageNoContextMenu: Story = {
  name: "hasImage=false / hasContextMenu=false",
  render: () => (
    <div className="w-[334px]">
      <Card>
        <Card.Header>
          <Card.Title>カードのタイトル</Card.Title>
          <Card.Description>主題を補足する短い説明文。</Card.Description>
        </Card.Header>
        <Card.Body>
          もっとも単純な組み合わせ。Image も Header Slot も持ちません。
        </Card.Body>
      </Card>
    </div>
  ),
};

// AC-Card-03（検証: Storybook）: Header 内の Text ブロック（Title・Description）と Header Slot は
// 横並びで配置され、Header Slot は 40px 四方である。
export const HeaderLayout: Story = {
  render: () => (
    <div className="w-[334px]">
      <Card>
        <Card.Header action={<IconButton label="メニューを開く" icon={<MoreIcon />} variant="ghost" size="sm" shape="circle" />}>
          <Card.Title>Text ブロックと Header Slot の横並び</Card.Title>
          <Card.Description>Header Slot は常に 40px 四方。</Card.Description>
        </Card.Header>
      </Card>
    </div>
  ),
};
