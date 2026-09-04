import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CheckScreen } from './CheckScreen';
import {
  __setMockColorMode,
  __setMockSelectionMode,
} from '../../../.storybook/figma-messaging.mock';

/**
 * チェックデザイン画面 (デザイン 54:326)。Storybook では messaging mock がサンプルの検査結果を
 * 返すので、検査一覧の表示と「適用」→ 修正反映までインタラクティブに確認できる
 * (Figma が無いためプレビュー画像は「プレビューなし」になる)。decorator で mock の選択モード
 * (単一 / 複数) を切り替え、複数選択時のインフォバー + Index + 一括修正も確認できるようにする。
 */
const meta: Meta<typeof CheckScreen> = {
  title: 'Plugin/CheckScreen',
  component: CheckScreen,
  tags: ['autodocs'],
  args: { onBack: fn() },
  parameters: { figmaFrame: { width: 360, height: 600, padding: 0 } },
  decorators: [
    (Story, context) => {
      __setMockSelectionMode(context.parameters.selectionMode === 'multi' ? 'multi' : 'single');
      __setMockColorMode(context.parameters.colorMode === 'hover' ? 'hover' : 'default');
      return <Story />;
    },
  ],
};
export default meta;

type Story = StoryObj<typeof CheckScreen>;

/** 単一選択: 1 コンポーネントの詳細検査。 */
export const Default: Story = {};

/**
 * 複数選択: インフォバー + Index 一覧。バーをクリックで一覧を開閉、行クリックで詳細へドリルイン、
 * 「一括で修正」で全コンポーネントをまとめて修正できる。
 */
export const MultiSelect: Story = { parameters: { selectionMode: 'multi' } };

/**
 * State=Hover: Background が「地色 (Brand/Primary) + StateLayers のオーバーレイ」の 2 枚 fill。
 * 1 行 2 チップ (地色 + + + オーバーレイ) で表示し、生値オーバーレイは「要確認」。「適用」で
 * 最近傍 StateLayers トークンへ寄せると両 fill とも OK になる。
 */
export const HoverStateLayers: Story = { parameters: { colorMode: 'hover' } };
