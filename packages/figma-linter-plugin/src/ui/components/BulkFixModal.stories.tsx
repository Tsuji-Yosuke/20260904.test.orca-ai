import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { BulkFixModal } from './BulkFixModal';

/**
 * 「一括で修正」前の確認モーダル (複数選択)。個別 diff は数が多くなりすぎるため、対象
 * コンポーネント数と変更件数の要約だけを見せて確認を挟む。a11y はフォーカストラップ + Esc
 * クローズ (適用中は閉じない)。
 */
const meta: Meta<typeof BulkFixModal> = {
  title: 'Components/BulkFixModal',
  component: BulkFixModal,
  tags: ['autodocs'],
  args: { components: 3, changes: 7, busy: false, onCancel: fn(), onConfirm: fn() },
  parameters: { figmaFrame: { width: 360, height: 600, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof BulkFixModal>;

/** 複数コンポーネントの一括修正確認。 */
export const Default: Story = {};

/** 対象が 1 コンポーネントのみ。 */
export const SingleComponent: Story = { args: { components: 1, changes: 2 } };

/** 適用中。確定ボタンが disabled になり、背景クリック / Esc では閉じない。 */
export const Busy: Story = { args: { busy: true } };
