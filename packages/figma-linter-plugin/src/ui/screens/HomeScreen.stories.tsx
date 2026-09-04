import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { HomeScreen } from './HomeScreen';

/**
 * トップのホーム画面 (デザイン 45:321)。2 機能への入口を縦に並べる。プレゼンテーショナルな
 * ので messaging には依存せず、onNavigate のみを受け取る。
 */
const meta: Meta<typeof HomeScreen> = {
  title: 'Plugin/HomeScreen',
  component: HomeScreen,
  tags: ['autodocs'],
  args: { onNavigate: fn() },
  parameters: { figmaFrame: { width: 360, height: 600, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof HomeScreen>;

export const Default: Story = {};
