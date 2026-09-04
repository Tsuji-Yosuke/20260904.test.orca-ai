import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConsistencyList } from './ConsistencyList';
import {
  sampleConsistencyReport,
  sampleConsistencyReportAligned,
} from '../../../.storybook/fixtures';

/**
 * 機能5: 横断チェック (Variant Consistency) の結果表示。
 * 「指摘 1 件 = カード 1 枚」。固定して見る軸 (gov) を絞り、比較軸 (free) をまたいだ全セルを
 * フルラインで並べ、外れたセルを強調して 1 ボタンで直す。票が割れたカードは候補から寄せ先を選ぶ。
 */
const meta: Meta<typeof ConsistencyList> = {
  title: 'Plugin/ConsistencyList',
  component: ConsistencyList,
  args: { onApply: fn(), busy: false },
  parameters: { figmaFrame: { width: 360, height: 600, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof ConsistencyList>;

/**
 * 主要状態を一望: 複数外れ値 (Radius) / 単一外れ値 (背景色) / 票割れ (背景色, Ghost/Hover)。
 */
export const WithFindings: Story = { args: { report: sampleConsistencyReport } };

/** 適用中 (全ボタン無効)。 */
export const Busy: Story = { args: { report: sampleConsistencyReport, busy: true } };

/** 不整合なし (揃え後)。 */
export const NoFindings: Story = { args: { report: sampleConsistencyReportAligned } };
