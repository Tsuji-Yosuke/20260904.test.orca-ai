import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { InfoBar } from './InfoBar';

/**
 * 複数選択時に TopAppBar の下へ出すインフォバー (デザイン 106:862)。選択数と合否件数を表示し、
 * クリックで Index (一覧) を開閉する。frame の padding を 0 にして実機どおり下線を端まで伸ばす。
 */
const meta: Meta<typeof InfoBar> = {
  title: 'Components/InfoBar',
  component: InfoBar,
  tags: ['autodocs'],
  args: { count: 16, pass: 30, fail: 6, expanded: false, onToggle: fn() },
  parameters: { figmaFrame: { width: 360, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof InfoBar>;

/** 折りたたみ (キャレット下向き ∨)。 */
export const Collapsed: Story = {};

/** 展開中 (キャレット上向き ∧。Index を表示している状態)。 */
export const Expanded: Story = { args: { expanded: true } };

/** 全件 OK (要確認 0 件)。 */
export const AllValid: Story = { args: { pass: 36, fail: 0 } };
