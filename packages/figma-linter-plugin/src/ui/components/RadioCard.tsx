import type { KeyboardEvent } from 'react';

export interface RadioCardOption<T extends string> {
  value: T;
  /** 主見出し (例: "Expressive")。 */
  title: string;
  /** 副見出し (例: "Web サイトに最適")。 */
  description?: string;
}

interface RadioCardGroupProps<T extends string> {
  options: ReadonlyArray<RadioCardOption<T>>;
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * カード型のラジオグループ (デザイン 28:1196 "Radio Card")。プリセット選択に使う。
 * a11y: WAI-ARIA radiogroup パターンに沿って roving tabindex (選択中のみ Tab 可) と
 * ↑↓/←→ での移動を実装。選択は移動に追従する (selection follows focus)。
 */
export function RadioCardGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: RadioCardGroupProps<T>) {
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
    const pos = (index + dir + options.length) % options.length;
    const next = options[pos];
    if (!next) return;
    e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]')?.[pos]?.focus();
    onChange(next.value);
  };

  return (
    <div className="radio-cards" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option, index) => {
        const active = option.value === value;
        // 選択が未確定 (value=null) のときは先頭だけ Tab 可にして radiogroup に到達できるようにする。
        const tabbable = active || (value === null && index === 0);
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={tabbable ? 0 : -1}
            disabled={disabled}
            className={'radio-card' + (active ? ' radio-card--selected' : '')}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            <span className="radio-card__title">{option.title}</span>
            {option.description && (
              <span className="radio-card__description">{option.description}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
