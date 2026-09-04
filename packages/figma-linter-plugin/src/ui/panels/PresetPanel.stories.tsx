import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import type { PresetSummary } from '../../shared/messages';
import { PresetPanel } from './PresetPanel';
import { samplePresets } from '../../../.storybook/fixtures';

const meta: Meta<typeof PresetPanel> = {
  title: 'Panels/PresetPanel',
  component: PresetPanel,
  tags: ['autodocs'],
  args: { presets: samplePresets, selectedId: null, onSelect: fn() },
  parameters: { figmaFrame: { width: 360, padding: 16 } },
};
export default meta;

type Story = StoryObj<typeof PresetPanel>;

/** カードを選ぶと即時に適用される (selectedId が追従)。 */
export const Default: Story = {
  render: (args) => {
    const [selectedId, setSelectedId] = useState<string | null>(args.selectedId ?? null);
    return (
      <PresetPanel
        {...args}
        selectedId={selectedId}
        onSelect={(preset: PresetSummary) => {
          args.onSelect(preset);
          setSelectedId(preset.id);
        }}
      />
    );
  },
};

/** Expressive を選択済み。 */
export const Selected: Story = {
  args: { selectedId: 'expressive' },
};

/** メインスレッドから取得中。 */
export const Loading: Story = { args: { presets: null } };

/** Extended Collection が見つからない。 */
export const Empty: Story = { args: { presets: [] } };
