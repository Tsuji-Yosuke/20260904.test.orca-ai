import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const variants = ["primary", "secondary", "ghost"] as const;
const sizes = ["sm", "md", "lg"] as const;

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-full"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  args: {
    children: "Button",
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "ghost"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Disabled: Story = { args: { disabled: true } };

export const WithLeadingIcon: Story = {
  args: { leadingIcon: <PlusIcon />, children: "追加" },
};
export const WithTrailingIcon: Story = {
  args: { trailingIcon: <PlusIcon />, children: "次へ" },
};
export const WithBothIcons: Story = {
  args: { leadingIcon: <PlusIcon />, trailingIcon: <PlusIcon />, children: "Both" },
};

export const VariantSizeMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      {variants.map((v) => (
        <div key={v} className="flex gap-2 items-center">
          {sizes.map((s) => (
            <Button key={s} variant={v} size={s}>
              {v} / {s}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const DisabledMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      {variants.map((v) => (
        <div key={v} className="flex gap-2 items-center">
          {sizes.map((s) => (
            <Button key={s} variant={v} size={s} disabled>
              {v} / {s}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const IconMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      {sizes.map((s) => (
        <div key={s} className="flex gap-2 items-center">
          <Button size={s} leadingIcon={<PlusIcon />}>
            Leading / {s}
          </Button>
          <Button size={s} trailingIcon={<PlusIcon />}>
            Trailing / {s}
          </Button>
          <Button size={s} leadingIcon={<PlusIcon />} trailingIcon={<PlusIcon />}>
            Both / {s}
          </Button>
        </div>
      ))}
    </div>
  ),
};
