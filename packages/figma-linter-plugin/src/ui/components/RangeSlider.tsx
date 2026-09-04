import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp } from '../lib/swap';

interface RangeSliderProps {
  /** 背景に並べるドットの数 (= reference/sizing スケールのトークン数)。 */
  dotCount: number;
  /** 実際に割り当てられている reference の index 群 (effective)。この位置のドットだけ点灯する。 */
  activeIndices: ReadonlyArray<number>;
  /** 現在のシフト量。 */
  offset: number;
  offsetMin: number;
  offsetMax: number;
  /** ドラッグ/キー操作中の値更新 (プレビュー)。 */
  onInput: (offset: number) => void;
  /** 操作確定時 (離した/キーアップ) に呼ぶ。ここで Figma へ即時反映する。 */
  onCommit: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  /** スクリーンリーダ向けの現在範囲の説明 (例 "Sizing/2xs 〜 Sizing/5xl")。 */
  valueText?: string;
}

/**
 * 範囲スライダー (デザイン 24:217 "range" の意図に沿う)。背景に reference/sizing の全ドットを
 * 並べ、対象 System トークン群が「実際に指している」ドットだけを点灯する (連続しない割り当ても
 * そのまま可視化されるので、トークンとビジュアルがずれない)。点灯ドットの最小〜最大に細い
 * レールを敷いて範囲とドラッグ可能であることを示す。ドラッグ/キーで全段を ±1 段スライドする。
 * 点灯位置・範囲は親が effective から計算して渡し、本コンポーネントは「ポインタ移動量 → offset の
 * 増減」だけを担う (dumb)。
 */
export function RangeSlider({
  dotCount,
  activeIndices,
  offset,
  offsetMin,
  offsetMax,
  onInput,
  onCommit,
  disabled = false,
  ariaLabel,
  valueText,
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startOffset: number } | null>(null);

  const span = Math.max(1, dotCount - 1);
  const pct = (i: number) => (i / span) * 100;
  const fixed = offsetMin >= offsetMax; // 動かせない (範囲がスケール全体 等)

  const activeSet = new Set(activeIndices);
  const lo = activeIndices.length ? Math.min(...activeIndices) : 0;
  const hi = activeIndices.length ? Math.max(...activeIndices) : 0;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || fixed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startOffset: offset };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || disabled) return;
    const width = trackRef.current?.clientWidth ?? 0;
    const dotWidth = width / span;
    if (dotWidth <= 0) return;
    const delta = Math.round((e.clientX - drag.current.startX) / dotWidth);
    onInput(clamp(drag.current.startOffset + delta, offsetMin, offsetMax));
  };
  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    onCommit();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || fixed) return;
    let next = offset;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clamp(offset + 1, offsetMin, offsetMax);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clamp(offset - 1, offsetMin, offsetMax);
    else if (e.key === 'Home') next = offsetMin;
    else if (e.key === 'End') next = offsetMax;
    else return;
    e.preventDefault();
    if (next !== offset) onInput(next);
  };
  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End'].includes(e.key)) onCommit();
  };

  return (
    <div className={'rangeslider' + (disabled ? ' rangeslider--disabled' : '')}>
      <div
        ref={trackRef}
        className="rangeslider__track"
        role="slider"
        tabIndex={disabled || fixed ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuemin={offsetMin}
        aria-valuemax={offsetMax}
        aria-valuenow={offset}
        aria-valuetext={valueText}
        aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        <div
          className="rangeslider__rail"
          style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }}
        />
        <div className="rangeslider__dots" aria-hidden="true">
          {Array.from({ length: dotCount }, (_, i) => (
            <span
              key={i}
              className={'rangeslider__dot' + (activeSet.has(i) ? ' rangeslider__dot--on' : '')}
              style={{ left: `${pct(i)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
