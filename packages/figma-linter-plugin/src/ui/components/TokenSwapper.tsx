import { useEffect, useRef, useState } from 'react';
import { Dropdown, type DropdownOption } from './Dropdown';
import { RangeSlider } from './RangeSlider';
import { clamp, formatOffset, parseOffset } from '../lib/swap';

/** Token Swapper 1 段ぶんの表示用ビュー (親が effective 値を計算して渡す)。 */
export interface SwapperStepView {
  id: string;
  step: string; // "sm"
  selected: string; // 現在選ばれている参照先の name (= <select> value)
  active: boolean; // デフォルトから変更済み → ブルー強調
}

interface TokenSwapperProps {
  label: string;
  offset: number;
  offsetMin: number;
  offsetMax: number;
  /** 背景ドットの数 (= reference スケールのトークン数)。 */
  dotCount: number;
  /** 実際に割り当てられている reference の index 群 (この位置のドットだけ点灯)。 */
  activeIndices: ReadonlyArray<number>;
  /** スクリーンリーダ向けの現在範囲の説明。 */
  valueText?: string;
  /** スライダー/数値入力での値更新 (プレビュー)。 */
  onOffsetInput: (offset: number) => void;
  /** 操作確定時に Figma へ即時反映する。 */
  onOffsetCommit: () => void;
  /** ドロップダウン候補 (エイリアス群のみ。FontSize 等は省略)。 */
  options?: ReadonlyArray<DropdownOption>;
  /** 各段の表示。空/未指定ならドロップダウンリストは出さない (スライダーのみ)。 */
  steps?: ReadonlyArray<SwapperStepView>;
  /** 段の参照先変更 (即時反映)。 */
  onStepChange?: (stepId: string, optionName: string) => void;
  /** 初期表示でドロップダウンリストを開いておく (既定: 閉)。 */
  defaultOpen?: boolean;
  disabled?: boolean;
}

/**
 * Token Swapper (デザイン 28:1629)。ヘッダ (ラベル＋「+N」オフセット入力＋⋯展開トグル) と
 * 段階スライダーを常時表示し、⋯ で各段の参照先ドロップダウンリストを開閉する。オフセットと
 * スライダーは同じ値の 2 表現で、全段を一括で N 段シフトする。個別の微調整はドロップダウンで行う。
 */
export function TokenSwapper({
  label,
  offset,
  offsetMin,
  offsetMax,
  dotCount,
  activeIndices,
  valueText,
  onOffsetInput,
  onOffsetCommit,
  options,
  steps,
  onStepChange,
  defaultOpen = false,
  disabled = false,
}: TokenSwapperProps) {
  const hasList = !!steps && steps.length > 0 && !!options;
  const [open, setOpen] = useState(defaultOpen);
  // オフセット数値欄は手入力中の文字列を保持し、確定 (blur/Enter) で親へ反映する。
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 親の offset が外から変わったら (リセット等) 編集中でなければ表示を同期する。
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(null);
  }, [offset]);

  const commitDraft = () => {
    if (draft !== null) {
      const parsed = parseOffset(draft);
      if (parsed !== undefined) {
        onOffsetInput(clamp(parsed, offsetMin, offsetMax));
      }
      setDraft(null);
    }
    onOffsetCommit();
  };

  return (
    <div className="swapper">
      <div className="swapper__head">
        <span className="swapper__label">{label}</span>
        <div className="swapper__controls">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            className="swapper__offset"
            aria-label={`${label} のオフセット`}
            value={draft ?? formatOffset(offset)}
            disabled={disabled}
            onChange={(e) => {
              setDraft(e.target.value);
              const parsed = parseOffset(e.target.value);
              if (parsed !== undefined) {
                onOffsetInput(clamp(parsed, offsetMin, offsetMax));
              }
            }}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitDraft();
                inputRef.current?.blur();
              }
            }}
          />
          {hasList && (
            <button
              type="button"
              className={'swapper__more' + (open ? ' swapper__more--open' : '')}
              aria-label={open ? '割り当てを閉じる' : '割り当てを開く'}
              aria-expanded={open}
              disabled={disabled}
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
                <circle cx="3" cy="8" r="1.4" />
                <circle cx="8" cy="8" r="1.4" />
                <circle cx="13" cy="8" r="1.4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <RangeSlider
        dotCount={dotCount}
        activeIndices={activeIndices}
        offset={offset}
        offsetMin={offsetMin}
        offsetMax={offsetMax}
        onInput={onOffsetInput}
        onCommit={onOffsetCommit}
        disabled={disabled}
        ariaLabel={`${label} の参照範囲シフト`}
        valueText={valueText}
      />

      {hasList && open && (
        <ul className="swapper__list">
          {steps!.map((s) => (
            <li key={s.id} className="swapper__row">
              <span className="swapper__step">{s.step}</span>
              <Dropdown
                value={s.selected}
                options={options!}
                active={s.active}
                disabled={disabled}
                ariaLabel={`${label} / ${s.step} の参照先`}
                onChange={(optionName) => onStepChange?.(s.id, optionName)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
