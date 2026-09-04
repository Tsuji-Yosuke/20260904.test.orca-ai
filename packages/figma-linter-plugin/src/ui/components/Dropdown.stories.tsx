import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Dropdown } from './Dropdown';
import { sampleRefOptions } from '../../../.storybook/fixtures';

const options = sampleRefOptions.map((o) => ({ value: o.name, label: o.name }));

const meta: Meta<typeof Dropdown> = {
  title: 'Components/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  args: { value: 'Sizing/2xs', options, onChange: fn(), ariaLabel: '参照先' },
  parameters: { figmaFrame: { width: 200, padding: 16 } },
};
export default meta;

type Story = StoryObj<typeof Dropdown>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <Dropdown
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

/** デフォルトから変更済みのブルー強調表示。 */
export const Active: Story = { args: { value: 'Sizing/md', active: true } };

export const Disabled: Story = { args: { disabled: true } };
