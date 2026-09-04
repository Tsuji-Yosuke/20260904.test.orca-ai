import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TopAppBar } from './TopAppBar';

/**
 * 上部アプリバー。左にタイトル、右に「デフォルトに戻す」リスタートアイコン (デザイン 24:268)。
 * frame の padding を 0 にして、実機どおり画面端まで下線が伸びるのを確認できる。
 */
const meta: Meta<typeof TopAppBar> = {
  title: 'Components/TopAppBar',
  component: TopAppBar,
  tags: ['autodocs'],
  args: { title: 'ルックの調整', onReset: fn() },
  parameters: { figmaFrame: { width: 360, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof TopAppBar>;

export const Default: Story = {};

/** 読み込み中・処理中はリセットを無効化する。 */
export const ResetDisabled: Story = {
  args: { resetDisabled: true },
};

/** サブ画面 (チェックデザイン等): 左に戻るキャレット、右は再検査アイコン。 */
export const WithBack: Story = {
  args: { title: 'Variablesの確認', onBack: fn(), resetLabel: '再検査' },
};

/** ホーム: タイトルのみ (戻る・リスタートなし)。 */
export const TitleOnly: Story = {
  args: { title: 'Common UI Plugin', onReset: undefined },
};
