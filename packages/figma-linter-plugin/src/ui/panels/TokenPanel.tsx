import { useState, type ReactNode } from 'react';
import type {
  SwapperGroup,
  SwapperStep,
} from '../../shared/messages';
import { TokenSwapper, type SwapperStepView } from '../components/TokenSwapper';
import { clamp, clampIndex, indexOfOption, optionById } from '../lib/swap';

interface TokenPanelProps {
  groups: SwapperGroup[] | null;
  /** 機能3: 割り当て (System → Reference) を即時反映する。 */
  onApplySwap: (assignments: Array<{ id: string; refId: string }>) => void;
  /** リセット後に全 Swapper のローカル状態を作り直すためのキー。 */
  resetNonce: number;
  /** プリセット適用後に Spacing/Sizing の Swapper だけ作り直すためのキー (FontSize は除く)。 */
  presetNonce: number;
}

type Assignment = { id: string; refId: string };

function isAssignment(a: Assignment | null): a is Assignment {
  return a !== null;
}

/**
 * 機能3: 1 つの Swapper グループ (例 Spacing/Padding) のローカル状態を持つコントロール。
 *
 * 各段は reference スケール (group.options, 昇順) 上の 1 点 (index) を指す。スライダーは各段が
 * 実際に指す reference のドットだけを点灯し (連続しない割り当てもそのまま可視化)、ドラッグで
 * 全点まとめて ±1 段スライドする (= offset)。ドロップダウンは段ごとに「基準 index」を直接置き換える
 * (= override)。effective = clamp(基準 index + offset)。offset は読み込み時のスナップショット
 * 基準なので冪等 (何度動かしても累積しない)。
 */
function SwapperGroupControl({
  group,
  onApply,
}: {
  group: SwapperGroup;
  onApply: (assignments: Assignment[]) => void;
}) {
  const [offset, setOffset] = useState(0);
  // 段ごとに直接指定された「基準 index」(ドロップダウン選択)。未指定の段は出荷時/現在の参照先。
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const N = group.options.length;

  // 出荷時/現在の参照先 index (override が無い段の基準)。
  const defaultBaseIndex = (step: SwapperStep): number => {
    const name = optionById(group.options, step.currentRefId)?.name ?? step.defaultRefName;
    const i = indexOfOption(group.options, name);
    return i === -1 ? 0 : i;
  };
  const baseIndexOf = (step: SwapperStep): number => overrides[step.id] ?? defaultBaseIndex(step);

  const baseIdx = group.steps.map(baseIndexOf);
  const baseMin = baseIdx.length ? Math.min(...baseIdx) : 0;
  const baseMax = baseIdx.length ? Math.max(...baseIdx) : N - 1;
  // 範囲がスケール端をはみ出さない範囲で全体スライド可能 (剛体スライド)。
  const offsetMin = -baseMin;
  const offsetMax = N - 1 - baseMax;
  const off = clamp(offset, offsetMin, offsetMax);

  // effective = 各段が実際に指す reference の index。連続しなくてもこの位置だけ点灯する。
  const effIdx = baseIdx.map((b) => clampIndex(b + off, N));
  const lo = effIdx.length ? Math.min(...effIdx) : 0;
  const hi = effIdx.length ? Math.max(...effIdx) : 0;

  const stepViews: SwapperStepView[] = group.steps.map((step, i) => {
    const name = group.options[effIdx[i] ?? 0]?.name ?? step.defaultRefName;
    return { id: step.id, step: step.step, selected: name, active: name !== step.defaultRefName };
  });

  // 現在の (offset, overrides) で全段の参照先を確定し、即時反映する。bounds を内部で
  // 取り直してから書くので、override 直後で offset が範囲外でも破綻しない。
  const commit = (rawOffset: number, ov: Record<string, number>) => {
    const idxs = group.steps.map((s) => ov[s.id] ?? defaultBaseIndex(s));
    const bMin = idxs.length ? Math.min(...idxs) : 0;
    const bMax = idxs.length ? Math.max(...idxs) : N - 1;
    const o = clamp(rawOffset, -bMin, N - 1 - bMax);
    const assignments = group.steps
      .map((s, i): Assignment | null => {
        const option = group.options[clampIndex((idxs[i] ?? 0) + o, N)];
        return option ? { id: s.id, refId: option.id } : null;
      })
      .filter(isAssignment);
    if (assignments.length > 0) onApply(assignments);
  };

  const valueText = `${group.label}: ${group.options[lo]?.name ?? ''} 〜 ${group.options[hi]?.name ?? ''}`;

  return (
    <TokenSwapper
      label={group.label}
      offset={off}
      offsetMin={offsetMin}
      offsetMax={offsetMax}
      dotCount={N}
      activeIndices={effIdx}
      valueText={valueText}
      onOffsetInput={(o) => setOffset(clamp(o, offsetMin, offsetMax))}
      onOffsetCommit={() => commit(off, overrides)}
      options={group.options.map((o) => ({ value: o.name, label: o.name }))}
      steps={stepViews}
      onStepChange={(stepId, optionName) => {
        // ドロップダウンで選んだ値が effective になるよう、基準 index = 選択 index − offset。
        const picked = indexOfOption(group.options, optionName);
        if (picked === -1) return;
        const next = { ...overrides, [stepId]: clampIndex(picked - off, N) };
        setOverrides(next);
        commit(off, next);
      }}
    />
  );
}

function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="subsection">
      <h3 className="subsection__title">{title}</h3>
      {children}
    </div>
  );
}

/** セクションの表示順 (既知 3 群)。未知の section はこの後ろに名前順で続ける。 */
const SECTION_ORDER = ['spacing', 'sizing', 'typography'];

/** section id → 見出し。未知の section は先頭大文字化して表示する。 */
const SECTION_TITLES: Record<string, string> = {
  spacing: 'Spacing',
  sizing: 'Sizing',
  typography: 'Typography',
};

function sectionTitle(id: string): string {
  return SECTION_TITLES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/** groups に存在する section を、既知順 → 未知 (名前順) で並べる。 */
function orderedSections(groups: SwapperGroup[]): string[] {
  const present = [...new Set(groups.map((g) => g.section))];
  const known = SECTION_ORDER.filter((s) => present.includes(s));
  const unknown = present.filter((s) => !SECTION_ORDER.includes(s)).sort();
  return [...known, ...unknown];
}

/**
 * 機能3: 「デザイントークンの調整」セクション。section ごとに Token Swapper を表示する。
 * section は live (./schema deriveSwapperGroups) 由来で、UI 側に固定セクションリストを持たず、
 * 既知 3 群を先頭固定順・未知 section を末尾に表示する。Apply ボタンは持たず即時反映。
 */
export function TokenPanel({
  groups,
  onApplySwap,
  resetNonce,
  presetNonce,
}: TokenPanelProps) {
  // Swapper はリセット・プリセット適用のどちらでも作り直す。
  const swapKey = `${resetNonce}-${presetNonce}`;

  return (
    <section className="section">
      <h2 className="section__title">デザイントークンの調整</h2>

      {groups === null ? (
        <p className="state">読み込み中…</p>
      ) : groups.length === 0 ? (
        <p className="state">調整できる System トークンが見つかりません。</p>
      ) : (
        <>
          {orderedSections(groups).map((sectionId) => {
            const items = groups.filter((g) => g.section === sectionId);
            if (items.length === 0) return null;
            return (
              <Subsection key={sectionId} title={sectionTitle(sectionId)}>
                {items.map((group) => (
                  <SwapperGroupControl
                    key={`${group.id}#${swapKey}`}
                    group={group}
                    onApply={onApplySwap}
                  />
                ))}
              </Subsection>
            );
          })}
        </>
      )}
    </section>
  );
}
