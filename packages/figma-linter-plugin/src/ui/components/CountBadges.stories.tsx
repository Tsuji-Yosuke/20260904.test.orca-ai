import type { Meta, StoryObj } from '@storybook/react-vite';
import { CountBadges } from './CountBadges';

/**
 * 正しいトークン数 (緑チェック) と要確認数 (オレンジ「?」) を並べる小バッジ
 * (デザイン 106:890 / 106:1043)。インフォバーの集計や Index 行の各コンポーネント件数で共用する。
 */
const meta: Meta<typeof CountBadges> = {
  title: 'Components/CountBadges',
  component: CountBadges,
  tags: ['autodocs'],
  args: { pass: 30, fail: 6 },
  parameters: { figmaFrame: { width: 160, padding: 16 } },
};
export default meta;

type Story = StoryObj<typeof CountBadges>;

/** pass / fail どちらもある通常表示。 */
export const Default: Story = {};

/** 全件 OK (要確認 0 件)。 */
export const AllValid: Story = { args: { pass: 36, fail: 0 } };

/** 要確認が多いケース。 */
export const ManyIssues: Story = { args: { pass: 4, fail: 12 } };
