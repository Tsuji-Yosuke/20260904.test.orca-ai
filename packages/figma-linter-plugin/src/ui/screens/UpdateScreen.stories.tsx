import type { Meta, StoryObj } from '@storybook/react-vite';
import { UpdateScreen } from './UpdateScreen';

/**
 * 更新通知の全面画面 (デザイン 109:785)。新しい配布が見つかったとき home/look/check の代わりに
 * 全面表示し、ダウンロードを促す。プレゼンテーショナルなので messaging には依存せず update のみ受け取る。
 */
const meta: Meta<typeof UpdateScreen> = {
  title: 'Plugin/UpdateScreen',
  component: UpdateScreen,
  tags: ['autodocs'],
  args: {
    update: {
      version: '0.1.1',
      buildNumber: 20,
      downloadUrl: '#',
      forced: false,
    },
  },
  parameters: { figmaFrame: { width: 360, height: 600, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof UpdateScreen>;

/** 通常の更新通知 (デザインの初期表示)。 */
export const Default: Story = {};

/** バージョン番号が長い場合 (説明文の折り返し確認)。 */
export const LongVersion: Story = {
  args: {
    update: {
      version: '12.34.56-beta.1',
      buildNumber: 1280,
      downloadUrl: '#',
      forced: false,
    },
  },
};
