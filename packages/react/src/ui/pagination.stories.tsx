import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Pagination } from "./pagination";

const meta: Meta<typeof Pagination> = {
  title: "Components/Pagination",
  component: Pagination,
  args: {
    count: 10,
    page: 1,
  },
  argTypes: {
    count: { control: { type: "number", min: 0 } },
    page: { control: { type: "number", min: 1 } },
    showEndpoints: { control: "boolean" },
    siblingCount: { control: { type: "number", min: 0 } },
    boundaryCount: { control: { type: "number", min: 1 } },
  },
};
export default meta;

type Story = StoryObj<typeof Pagination>;

export const FirstPage: Story = { args: { count: 10, page: 1 } };
export const MiddlePage: Story = { args: { count: 10, page: 5 } };
export const LastPage: Story = { args: { count: 10, page: 10 } };
export const WithEndpoints: Story = {
  args: { count: 20, page: 10, showEndpoints: true },
};
export const FewPages: Story = { args: { count: 3, page: 2 } };

export const Interactive: Story = {
  render: (args) => {
    const [page, setPage] = useState(1);
    return (
      <div className="flex flex-col gap-3 p-4">
        <Pagination {...args} page={page} onPageChange={setPage} />
        <p className="typography-tight-body-small text-on-surface-dim">
          現在ページ: {page}
        </p>
      </div>
    );
  },
  args: { count: 12, showEndpoints: true },
};

export const LinkMode: Story = {
  args: {
    count: 8,
    page: 3,
    getHref: (p: number) => `?page=${p}`,
  },
};

// AC-Pagination-07（検証: Storybook）: RTL では矢印の向きが反転する
export const RTL: Story = {
  args: { count: 10, page: 5, showEndpoints: true },
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
};
