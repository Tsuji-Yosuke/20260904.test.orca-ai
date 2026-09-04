import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { RangeSlider } from './RangeSlider';
import { clamp, clampIndex } from '../lib/swap';

/**
 * reference の全ドット上に、System トークン群が「実際に指している」ドットだけを点灯するデモ。
 * 割り当ては連続しないこともある (例 2xs の次が sm を飛ばして md) ので、その位置のドットだけが
 * 点灯し、ドラッグ/←→ で全点まとめて ±1 段スライドする。
 */
function Demo({ dotCount, baseIndices }: { dotCount: number; baseIndices: number[] }) {
  const [offset, setOffset] = useState(0);
  const baseMin = Math.min(...baseIndices);
  const baseMax = Math.max(...baseIndices);
  const offsetMin = -baseMin;
  const offsetMax = dotCount - 1 - baseMax;
  const off = clamp(offset, offsetMin, offsetMax);
  const active = baseIndices.map((b) => clampIndex(b + off, dotCount));
  return (
    <RangeSlider
      dotCount={dotCount}
      activeIndices={active}
      offset={off}
      offsetMin={offsetMin}
      offsetMax={offsetMax}
      onInput={setOffset}
      onCommit={() => {}}
      ariaLabel="参照範囲シフト"
      valueText={`${Math.min(...active)} 〜 ${Math.max(...active)}`}
    />
  );
}

const meta: Meta<typeof RangeSlider> = {
  title: 'Components/RangeSlider',
  component: RangeSlider,
  tags: ['autodocs'],
  parameters: { figmaFrame: { width: 360, padding: 16 } },
};
export default meta;

type Story = StoryObj<typeof RangeSlider>;

/** Spacing/Padding 相当: 2xs,xs,md,lg,2xl,4xl,5xl (= 連続しない) を点灯。ドラッグで一括スライド。 */
export const Default: Story = {
  render: () => <Demo dotCount={16} baseIndices={[2, 3, 5, 6, 8, 10, 11]} />,
};

/** 連続した割り当て (Spacing/Margin 相当)。 */
export const Contiguous: Story = {
  render: () => <Demo dotCount={16} baseIndices={[2, 3, 4, 5]} />,
};
