import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { IndexList } from './IndexList';
import { sampleComponentSummaries } from '../../../.storybook/fixtures';

/**
 * 複数選択時の Index (一覧)。各コンポーネントをサムネ + 名前 + 合否件数の 1 行で並べる
 * (デザイン 106:1019)。Storybook ではプレビュー画像が無いためサムネは空枠になる。
 */
const meta: Meta<typeof IndexList> = {
  title: 'Components/IndexList',
  component: IndexList,
  tags: ['autodocs'],
  args: { items: sampleComponentSummaries, onOpen: fn() },
  parameters: { figmaFrame: { width: 360, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof IndexList>;

export const Default: Story = {};
