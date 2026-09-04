import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { RadioCardGroup, type RadioCardOption } from './RadioCard';

const options: ReadonlyArray<RadioCardOption<string>> = [
  { value: 'expressive', title: 'Expressive', description: 'Webサイトに最適' },
  { value: 'productive', title: 'Productive', description: 'SaaS系プロダクトに最適' },
];

const meta: Meta<typeof RadioCardGroup<string>> = {
  title: 'Components/RadioCard',
  component: RadioCardGroup,
  tags: ['autodocs'],
  args: { options, value: 'expressive', ariaLabel: 'プリセット', onChange: fn() },
  parameters: { figmaFrame: { width: 360, padding: 16 } },
};
export default meta;

type Story = StoryObj<typeof RadioCardGroup<string>>;

/** クリック / ↑↓ で選択が動く。 */
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | null>(args.value);
    return (
      <RadioCardGroup
        {...args}
        value={value}
        onChange={(next) => {
          args.onChange(next);
          setValue(next);
        }}
      />
    );
  },
};

/** 未選択 (先頭だけ Tab 可)。 */
export const Unselected: Story = { args: { value: null } };
