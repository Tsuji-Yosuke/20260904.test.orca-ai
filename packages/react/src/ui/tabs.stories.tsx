import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabList, Tab, TabPanel } from "./tabs";

const meta: Meta<typeof Tabs> = {
  title: "Components/Tabs",
  component: Tabs,
  argTypes: {
    size: { control: "inline-radio", options: ["small", "medium", "large"] },
    layout: { control: "inline-radio", options: ["spread", "fit"] },
    disabled: { control: "boolean" },
  },
  args: {
    defaultValue: "overview",
    size: "medium",
    layout: "spread",
  },
};
export default meta;

type Story = StoryObj<typeof Tabs>;

const PanelBody = ({ children }: { children: React.ReactNode }) => (
  <div className="p-4 typography-tight-body-medium text-on-surface">{children}</div>
);

const renderBasic: Story["render"] = (args) => (
  <div className="w-[480px]">
    <Tabs {...args}>
      <TabList aria-label="商品の詳細">
        <Tab value="overview">概要</Tab>
        <Tab value="detail">詳細</Tab>
        <Tab value="history">履歴</Tab>
      </TabList>
      <TabPanel value="overview">
        <PanelBody>概要の内容</PanelBody>
      </TabPanel>
      <TabPanel value="detail">
        <PanelBody>詳細の内容</PanelBody>
      </TabPanel>
      <TabPanel value="history">
        <PanelBody>履歴の内容</PanelBody>
      </TabPanel>
    </Tabs>
  </div>
);

// AC-Tabs-02（検証: Storybook）: 選択中 Tab がポインタ・キーボードどちらの操作後も視覚的に区別できる
// AC-Tabs-04（検証: Storybook）: layout=spread では Tab が Tab List 幅を均等に占有する
export const Default: Story = { render: renderBasic };

// AC-Tabs-04（検証: Storybook）: layout=fit では Tab がラベル幅に従う
export const Fit: Story = {
  args: { layout: "fit" },
  render: renderBasic,
};

// issue #50 の再現: 幅を持つ親（flex-1 相当）の中でも layout=fit の下線が
// タブの内容幅に収まり、親の幅いっぱいに伸びないこと
export const FitInWideParent: Story = {
  args: { layout: "fit", defaultValue: "projects" },
  render: (args) => (
    <div className="w-[900px] border-sm border-outline-dim p-4">
      <Tabs {...args}>
        <TabList aria-label="ナビゲーション">
          <Tab value="projects">プロジェクト</Tab>
          <Tab value="admin">管理</Tab>
        </TabList>
        <TabPanel value="projects">
          <PanelBody>プロジェクト一覧</PanelBody>
        </TabPanel>
        <TabPanel value="admin">
          <PanelBody>管理</PanelBody>
        </TabPanel>
      </Tabs>
    </div>
  ),
};

export const WithIconAndBadge: Story = {
  render: (args) => (
    <div className="w-[480px]">
      <Tabs {...args} defaultValue="inbox">
        <TabList aria-label="メール">
          <Tab
            value="inbox"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="size-full"
              >
                <path d="M4 4h16v16H4z" />
                <path d="m4 8 8 5 8-5" />
              </svg>
            }
            badge={
              <span className="inline-flex items-center justify-center size-icon-sm rounded-full bg-primary text-on-primary typography-tight-body-small">
                3
              </span>
            }
          >
            受信
          </Tab>
          <Tab value="sent">送信済み</Tab>
          <Tab value="draft" disabled>
            下書き
          </Tab>
        </TabList>
        <TabPanel value="inbox">
          <PanelBody>受信トレイ</PanelBody>
        </TabPanel>
        <TabPanel value="sent">
          <PanelBody>送信済み</PanelBody>
        </TabPanel>
        <TabPanel value="draft">
          <PanelBody>下書き</PanelBody>
        </TabPanel>
      </Tabs>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: renderBasic,
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-[480px]">
      {(["small", "medium", "large"] as const).map((size) => (
        <Tabs key={size} defaultValue="a" size={size}>
          <TabList aria-label={`size ${size}`}>
            <Tab value="a">タブ A</Tab>
            <Tab value="b">タブ B</Tab>
            <Tab value="c">タブ C</Tab>
          </TabList>
          <TabPanel value="a">
            <PanelBody>{size} / A</PanelBody>
          </TabPanel>
          <TabPanel value="b">
            <PanelBody>{size} / B</PanelBody>
          </TabPanel>
          <TabPanel value="c">
            <PanelBody>{size} / C</PanelBody>
          </TabPanel>
        </Tabs>
      ))}
    </div>
  ),
};

// AC-Tabs-05（検証: Storybook）: ラベルが収まらない場合は折り返さず、選択中 Tab が可視範囲外でも横スクロールで到達できる
export const Overflow: Story = {
  args: { layout: "fit", defaultValue: "six" },
  render: (args) => (
    <div className="max-w-xs">
      <Tabs {...args}>
        <TabList aria-label="長いラベルの一覧">
          <Tab value="one">とても長いラベルその一</Tab>
          <Tab value="two">とても長いラベルその二</Tab>
          <Tab value="three">とても長いラベルその三</Tab>
          <Tab value="four">とても長いラベルその四</Tab>
          <Tab value="five">とても長いラベルその五</Tab>
          <Tab value="six">選択中はここ（六）</Tab>
        </TabList>
        <TabPanel value="one">
          <PanelBody>1</PanelBody>
        </TabPanel>
        <TabPanel value="two">
          <PanelBody>2</PanelBody>
        </TabPanel>
        <TabPanel value="three">
          <PanelBody>3</PanelBody>
        </TabPanel>
        <TabPanel value="four">
          <PanelBody>4</PanelBody>
        </TabPanel>
        <TabPanel value="five">
          <PanelBody>5</PanelBody>
        </TabPanel>
        <TabPanel value="six">
          <PanelBody>6</PanelBody>
        </TabPanel>
      </Tabs>
    </div>
  ),
};
