import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TokenSwapper } from './TokenSwapper';
import { clamp, clampIndex, indexOfOption, optionById } from '../lib/swap';
import { sampleSwapperGroups } from '../../../.storybook/fixtures';

const group = sampleSwapperGroups.find((g) => g.id === 'Spacing/Padding')!;
const options = group.options.map((o) => ({ value: o.name, label: o.name }));
const N = group.options.length;

/** SwapperGroupControl と同じ要領で offset / overrides (基準 index) を持つデモ用ラッパ。 */
function Demo({ withList, open = false }: { withList: boolean; open?: boolean }) {
  const [offset, setOffset] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const defaultBase = (s: (typeof group.steps)[number]) => {
    const name = optionById(group.options, s.currentRefId)?.name ?? s.defaultRefName;
    const i = indexOfOption(group.options, name);
    return i === -1 ? 0 : i;
  };
  const baseIdx = group.steps.map((s) => overrides[s.id] ?? defaultBase(s));
  const baseMin = Math.min(...baseIdx);
  const baseMax = Math.max(...baseIdx);
  const offsetMin = -baseMin;
  const offsetMax = N - 1 - baseMax;
  const off = clamp(offset, offsetMin, offsetMax);
  const effIdx = baseIdx.map((b) => clampIndex(b + off, N));
  const steps = group.steps.map((s, i) => {
    const name = group.options[effIdx[i] ?? 0]?.name ?? s.defaultRefName;
    return { id: s.id, step: s.step, selected: name, active: name !== s.defaultRefName };
  });

  return (
    <TokenSwapper
      label={withList ? group.label : 'FontSize'}
      offset={off}
      offsetMin={withList ? offsetMin : -(N - 1)}
      offsetMax={withList ? offsetMax : N - 1}
      dotCount={N}
      activeIndices={effIdx}
      onOffsetInput={(o) => setOffset(o)}
      onOffsetCommit={() => {}}
      options={withList ? options : undefined}
      steps={withList ? steps : undefined}
      defaultOpen={open}
      onStepChange={(id, name) => {
        const p = indexOfOption(group.options, name);
        if (p !== -1) setOverrides((o) => ({ ...o, [id]: clampIndex(p - off, N) }));
      }}
    />
  );
}

const meta: Meta<typeof TokenSwapper> = {
  title: 'Components/TokenSwapper',
  component: TokenSwapper,
  tags: ['autodocs'],
  parameters: { figmaFrame: { width: 360, padding: 16 } },
};
export default meta;

type Story = StoryObj<typeof TokenSwapper>;

/** エイリアス群: 背景の reference ドット上に現在範囲をバー表示。⋯ で参照先ドロップダウンを開閉。 */
export const AliasGroup: Story = { render: () => <Demo withList open /> };

/** FontSize 相当: ドロップダウンは持たず、スライダー (範囲シフト) のみ。 */
export const SliderOnly: Story = { render: () => <Demo withList={false} /> };
