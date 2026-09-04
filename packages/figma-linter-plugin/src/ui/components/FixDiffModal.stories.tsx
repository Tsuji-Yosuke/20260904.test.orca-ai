import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FixDiffModal } from './FixDiffModal';
import { sampleFixDiffs } from '../../../.storybook/fixtures';

/**
 * 「適用」前に変更内容を見せる確認モーダル (デザイン 111:1314 Apply Variables)。
 * Dimension / Color のグループに分け、各項目の before → after を並べる。after は候補が
 * 2 件以上あるときドロップダウンで選び直せる。トークンの中の実数 / 色が変わる行は黄「?」+
 * 「数値 / カラーが変わっています」で警告し、変わらない行は緑「✓」で示す。
 */
const meta: Meta<typeof FixDiffModal> = {
  title: 'Components/FixDiffModal',
  component: FixDiffModal,
  tags: ['autodocs'],
  args: { diffs: sampleFixDiffs, busy: false, onCancel: fn(), onConfirm: fn() },
  parameters: { figmaFrame: { width: 360, height: 600, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof FixDiffModal>;

/** Dimension + Color の混在。値そのまま (緑) と値が変わる (黄) の両方を含む。 */
export const Default: Story = {};

/** Dimension のみ (実数 → トークン、トークン → 別トークン)。 */
export const DimensionOnly: Story = {
  args: { diffs: sampleFixDiffs.filter((d) => d.kind === 'dimension') },
};

/** Color のみ (実数 hex → トークン)。スウォッチつきで色の差分を確認できる。 */
export const ColorOnly: Story = {
  args: { diffs: sampleFixDiffs.filter((d) => d.kind === 'color') },
};

/** 適用中。select / フッターボタンが disabled になり、背景クリック / Esc では閉じない。 */
export const Busy: Story = { args: { busy: true } };
