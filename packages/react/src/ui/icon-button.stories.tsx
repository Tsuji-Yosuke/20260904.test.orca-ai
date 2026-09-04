import type { Meta, StoryObj } from "@storybook/react";
import { IconButton } from "./icon-button";

const variants = ["primary", "secondary", "ghost"] as const;
const sizes = ["sm", "md", "lg"] as const;
const shapes = ["rounded", "circle"] as const;

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

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-full"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const meta: Meta<typeof IconButton> = {
  title: "Components/IconButton",
  component: IconButton,
  args: {
    label: "追加",
    icon: <PlusIcon />,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "ghost"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    shape: { control: "inline-radio", options: ["rounded", "circle"] },
    disabled: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof IconButton>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Circle: Story = { args: { shape: "circle" } };
export const Disabled: Story = { args: { disabled: true } };

export const VariantSizeMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      {variants.map((v) => (
        <div key={v} className="flex gap-2 items-center">
          {sizes.map((s) => (
            <IconButton key={s} variant={v} size={s} label={`${v} ${s}`} icon={<PlusIcon />} />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const ShapeMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      {shapes.map((shape) => (
        <div key={shape} className="flex gap-2 items-center">
          {variants.map((v) => (
            <IconButton
              key={v}
              variant={v}
              shape={shape}
              label={`${v} ${shape}`}
              icon={<CloseIcon />}
            />
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
            <IconButton
              key={s}
              variant={v}
              size={s}
              disabled
              label={`${v} ${s}`}
              icon={<PlusIcon />}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};
