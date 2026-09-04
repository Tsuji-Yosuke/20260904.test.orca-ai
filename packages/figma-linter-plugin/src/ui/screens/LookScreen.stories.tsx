import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LookScreen } from './LookScreen';

/**
 * ルックの調整画面 (旧トップページ)。messaging mock がプリセット / Swapper のサンプルを返すので、
 * カード選択・段の付け替え・スライダー・リセットまで一通り操作できる。
 */
const meta: Meta<typeof LookScreen> = {
  title: 'Plugin/LookScreen',
  component: LookScreen,
  tags: ['autodocs'],
  args: { onBack: fn() },
  parameters: { figmaFrame: { width: 360, height: 600, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof LookScreen>;

export const Default: Story = {};
