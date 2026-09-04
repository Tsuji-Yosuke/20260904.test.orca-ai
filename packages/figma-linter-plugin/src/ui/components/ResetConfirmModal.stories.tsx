import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ResetConfirmModal } from './ResetConfirmModal';

/**
 * 「デフォルトに戻す」確認モーダル (破壊的操作)。サイズ (System の参照込み) と FontSize を
 * 出荷時へ完全復元するため、実行前に確認を挟む。a11y はフォーカストラップ + Esc クローズ。
 * オーバーレイは position:fixed なので、プレビューのフレームいっぱいに中央表示される。
 */
const meta: Meta<typeof ResetConfirmModal> = {
  title: 'Components/ResetConfirmModal',
  component: ResetConfirmModal,
  tags: ['autodocs'],
  args: { busy: false, onCancel: fn(), onConfirm: fn() },
  parameters: { figmaFrame: { width: 360, height: 600, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof ResetConfirmModal>;

/** 確認待ち。キャンセル / デフォルトに戻す (danger) の 2 ボタン。 */
export const Default: Story = {};

/** 復元処理中。確定ボタンが disabled になり、背景クリック / Esc では閉じない。 */
export const Busy: Story = { args: { busy: true } };
