import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TokenPanel } from './TokenPanel';
import { sampleSwapperGroups } from '../../../.storybook/fixtures';

const meta: Meta<typeof TokenPanel> = {
  title: 'Panels/TokenPanel',
  component: TokenPanel,
  tags: ['autodocs'],
  args: {
    groups: sampleSwapperGroups,
    onApplySwap: fn(),
    resetNonce: 0,
    presetNonce: 0,
  },
  parameters: { figmaFrame: { width: 360, height: 600, padding: 16 } },
};
export default meta;

type Story = StoryObj<typeof TokenPanel>;

/** Spacing / Sizing / Typography すべて Token Swapper で参照先を付け替え。 */
export const Default: Story = {};

/** メインスレッドから取得中。 */
export const Loading: Story = { args: { groups: null } };

/** 調整できる System トークンが無い。 */
export const Empty: Story = { args: { groups: [] } };
