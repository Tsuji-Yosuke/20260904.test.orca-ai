import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertCircleIcon, ApertureIcon, ChevronIcon, SlidersIcon } from './icons';

/**
 * 同梱のインライン SVG アイコン一覧。Figma の asset URL は数日で失効するため、同等の見た目を
 * SVG で描き起こして同梱している (currentColor でテーマ追従)。各アイコンのインポート名つきで
 * 一覧表示する (個別のプレビューはこのギャラリーで確認する)。
 */
function IconsGallery() {
  const items: ReadonlyArray<{ name: string; node: React.ReactNode }> = [
    { name: 'ApertureIcon', node: <ApertureIcon /> },
    { name: 'SlidersIcon', node: <SlidersIcon /> },
    { name: 'AlertCircleIcon', node: <AlertCircleIcon /> },
    { name: 'ChevronIcon', node: <ChevronIcon /> },
    { name: 'ChevronIcon direction="right"', node: <ChevronIcon direction="right" /> },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
        width: '100%',
        color: 'var(--figma-color-text)',
      }}
    >
      {items.map((it) => (
        <div
          key={it.name}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '16px 8px',
            border: '1px solid var(--figma-color-border)',
            borderRadius: 8,
          }}
        >
          <span style={{ display: 'flex', minHeight: 32, alignItems: 'center' }}>{it.node}</span>
          <code style={{ fontSize: 11, textAlign: 'center', wordBreak: 'break-word' }}>{it.name}</code>
        </div>
      ))}
    </div>
  );
}

const meta: Meta<typeof IconsGallery> = {
  title: 'Components/Icons',
  component: IconsGallery,
  tags: ['autodocs'],
  parameters: { figmaFrame: { width: 360, padding: 16 } },
};
export default meta;

type Story = StoryObj<typeof IconsGallery>;

/** 全アイコンのギャラリー (ライト / ダークはツールバーのテーマ切替で確認)。 */
export const Default: Story = {};
