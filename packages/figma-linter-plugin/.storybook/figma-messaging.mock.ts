import type { PluginMessage, UIMessage } from '../src/shared/messages';
import {
  sampleComponentName,
  sampleComponentSummaries,
  sampleComponentSummariesAfterBulk,
  sampleComponentSummariesFixed,
  sampleConsistencyReport,
  sampleConsistencyReportAligned,
  sampleInspection,
  sampleInspectionFixed,
  sampleInspectionHover,
  sampleInspectionHoverFixed,
  samplePresets,
  sampleSwapperGroupsFor,
} from './fixtures';

/**
 * In-browser stand-in for src/ui/messaging.ts.
 *
 * The real module bridges the UI iframe to Figma's main thread over postMessage.
 * There is no main thread in a browser, so this mock plays that role in memory:
 * it answers the UI's get-* / apply-* messages with representative data (after a
 * small delay to mimic the round-trip), letting the whole App story run interactively
 * in Storybook. Wired in by the resolveId plugin in .storybook/main.ts, which points
 * App.tsx's `./messaging` import here. The emit / onMessage signatures match the real
 * module exactly so App.tsx needs no changes.
 */

type Handler = (message: PluginMessage) => void;

const handlers = new Set<Handler>();
const LATENCY_MS = 300;

// 実機の pluginData (active プリセット記録) を模す。apply-preset で更新、reset でクリア。
let mockActivePreset: string | null = 'expressive';
// チェックデザイン: apply-fixes 後は修正済みの検査結果を返す (適用で NG が消える様子を再現)。
let mockInspectionFixed = false;
// 横断チェック: apply-consistency-fixes 後は不整合なしの結果を返す (揃えで NG が消える様子を再現)。
let mockConsistencyAligned = false;
// 単一選択 (single) と複数選択 (multi) を切り替える。CheckScreen のストーリーが decorator で設定する。
let mockSelectionMode: 'single' | 'multi' = 'single';
// 単一検査の内容: default = 背景が実数指定 / hover = 地色 + StateLayers の 2 枚 fill (1 行 2 チップ)。
let mockColorMode: 'default' | 'hover' = 'default';

/** ストーリーから検査の選択モード (single / multi) を設定する。切替時は修正状態もリセット。 */
export function __setMockSelectionMode(mode: 'single' | 'multi'): void {
  mockSelectionMode = mode;
  mockInspectionFixed = false;
}

/** ストーリーから単一検査の色モード (default / hover) を設定する。切替時は修正状態もリセット。 */
export function __setMockColorMode(mode: 'default' | 'hover'): void {
  mockColorMode = mode;
  mockInspectionFixed = false;
}

/** 現在の色モードに応じた単一検査結果 (修正前 / 修正後)。 */
function singleResult() {
  if (mockColorMode === 'hover') {
    return mockInspectionFixed ? sampleInspectionHoverFixed : sampleInspectionHover;
  }
  return mockInspectionFixed ? sampleInspectionFixed : sampleInspection;
}

function reply(message: PluginMessage): void {
  setTimeout(() => {
    for (const handler of handlers) handler(message);
  }, LATENCY_MS);
}

export function emit(message: UIMessage): void {
  switch (message.type) {
    case 'get-presets':
      // 記録 (mockActivePreset) を現在の active として返す。
      reply({ type: 'presets', presets: samplePresets, activeId: mockActivePreset });
      break;
    case 'get-swapper-groups':
      // 現在の active プリセットに応じた割り当てを返す (プリセットで変わることを示す)。
      reply({ type: 'swapper-groups', groups: sampleSwapperGroupsFor(mockActivePreset) });
      break;
    case 'get-file-info':
      // Storybook は本体ファイルではない想定 (アラートは出さない)。
      reply({ type: 'file-info', isCommonUiKit: false });
      break;
    case 'apply-preset':
      mockActivePreset = message.presetId; // 記録 (実機の pluginData 相当)
      reply({ type: 'apply-done', applied: 48, skipped: 0 });
      break;
    case 'apply-swap':
      reply({
        type: 'swap-applied',
        count: message.assignments.length,
        requested: message.assignments.length,
      });
      break;
    case 'apply-base-scale':
      reply({
        type: 'base-scale-applied',
        count: message.values.length,
        requested: message.values.length,
      });
      break;
    case 'reset-defaults':
      mockActivePreset = null; // 記録クリア (実機の pluginData 相当)
      reply({ type: 'defaults-reset', restored: 47 });
      break;
    case 'set-inspecting':
      // active=true で現在の選択 (サンプル) の検査結果を返す。multi モードでは Index を返す。
      if (message.active) {
        if (mockSelectionMode === 'multi') {
          reply({
            type: 'inspection',
            payload: {
              status: 'multi',
              items: mockInspectionFixed ? sampleComponentSummariesFixed : sampleComponentSummaries,
            },
          });
        } else {
          reply({
            type: 'inspection',
            payload: { status: 'ok', result: singleResult() },
          });
        }
      }
      break;
    case 'apply-fixes':
      mockInspectionFixed = true;
      reply({ type: 'fixes-applied', fixed: 1, failed: 0 });
      // 修正後の状態を再検査で返す (single / multi それぞれ)。
      if (mockSelectionMode === 'multi') {
        reply({ type: 'inspection', payload: { status: 'multi', items: sampleComponentSummariesFixed } });
      } else {
        reply({ type: 'inspection', payload: { status: 'ok', result: singleResult() } });
      }
      break;
    case 'inspect-node':
      // ドリルインした 1 件の詳細を返す (要求 id / 名前を反映)。nodeId はエコーする。
      reply({
        type: 'node-inspection',
        nodeId: message.nodeId,
        result: {
          ...singleResult(),
          nodeId: message.nodeId,
          name: sampleComponentName(message.nodeId),
        },
      });
      break;
    case 'apply-fixes-bulk':
      // 一括は「Color を変換せず・実数が変わらない寸法だけ」直す。直しきれない Color が残った
      // コンポーネントだけが選択に残る (= afterBulk の subset)。残りは Index 表示のまま絞り込まれる。
      reply({
        type: 'bulk-fixes-applied',
        fixed: message.nodeIds.length,
        failed: 0,
        components: message.nodeIds.length,
      });
      reply({ type: 'inspection', payload: { status: 'multi', items: sampleComponentSummariesAfterBulk } });
      break;
    case 'get-consistency':
      // 横断チェック: 揃え前は外れ値 + ambiguous を、揃え後は不整合なしを返す。
      reply({
        type: 'consistency',
        report: mockConsistencyAligned ? sampleConsistencyReportAligned : sampleConsistencyReport,
      });
      break;
    case 'apply-consistency-fixes':
      mockConsistencyAligned = true;
      reply({ type: 'consistency-applied', fixed: message.fixes.length, failed: 0 });
      reply({ type: 'consistency', report: sampleConsistencyReportAligned });
      break;
    // get-collections / get-base-tokens / notify / resize / close need no response in the mock.
    default:
      break;
  }
}

export function onMessage(handler: Handler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}
