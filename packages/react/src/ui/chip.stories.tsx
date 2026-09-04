import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Chip } from "./chip";

const sizes = ["sm", "md", "lg"] as const;

const TagIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-full"
  >
    <path d="M20.59 13.41 11 3.83V8h-4.17L3 12l9.59 9.58a2 2 0 0 0 2.83 0l5.17-5.17a2 2 0 0 0 0-2.83z" />
    <circle cx="7" cy="8" r="0" />
  </svg>
);

const meta: Meta<typeof Chip> = {
  title: "Components/Chip",
  component: Chip,
  args: {
    children: "関東",
  },
  argTypes: {
    mode: { control: "inline-radio", options: ["static", "selectable", "removable"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Chip>;

export const Static: Story = { args: { mode: "static" } };
export const Selectable: Story = { args: { mode: "selectable" } };
export const SelectableSelected: Story = {
  args: { mode: "selectable", selected: true },
};
export const Removable: Story = {
  args: { mode: "removable", onRemove: () => {} },
};
export const WithLeadingIcon: Story = {
  args: { mode: "static", leadingIcon: <TagIcon /> },
};
export const WithTrailingIcon: Story = {
  args: { mode: "static", trailingIcon: <TagIcon /> },
};
export const WithBothIcons: Story = {
  args: { mode: "selectable", leadingIcon: <TagIcon />, trailingIcon: <TagIcon /> },
};
export const Disabled: Story = { args: { mode: "selectable", disabled: true } };

export const SizeMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      {sizes.map((s) => (
        <div key={s} className="flex gap-2 items-center">
          <Chip size={s} mode="static">
            静的 {s}
          </Chip>
          <Chip size={s} mode="selectable">
            選択 {s}
          </Chip>
          <Chip size={s} mode="selectable" selected>
            選択済 {s}
          </Chip>
          <Chip size={s} mode="removable" onRemove={() => {}}>
            取消 {s}
          </Chip>
        </div>
      ))}
    </div>
  ),
};

export const SelectableGroup: Story = {
  render: () => {
    const options = ["北海道", "東北", "関東", "中部", "近畿", "中国", "四国", "九州"];
    const [selected, setSelected] = useState<string[]>(["関東"]);
    return (
      <div className="flex flex-wrap gap-2 p-4 max-w-md">
        {options.map((opt) => (
          <Chip
            key={opt}
            mode="selectable"
            selected={selected.includes(opt)}
            onSelectedChange={(next) =>
              setSelected((prev) =>
                next ? [...prev, opt] : prev.filter((o) => o !== opt),
              )
            }
          >
            {opt}
          </Chip>
        ))}
      </div>
    );
  },
};

export const RemovableGroup: Story = {
  render: () => {
    const [tags, setTags] = useState(["赤", "青", "緑", "黄"]);
    return (
      <div className="flex flex-wrap gap-2 p-4 max-w-md">
        {tags.map((tag) => (
          <Chip
            key={tag}
            mode="removable"
            onRemove={() => setTags((prev) => prev.filter((t) => t !== tag))}
          >
            {tag}
          </Chip>
        ))}
      </div>
    );
  },
};
