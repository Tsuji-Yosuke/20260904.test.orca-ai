export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: ReadonlyArray<DropdownOption>;
  onChange: (value: string) => void;
  /** デフォルトと異なる選択 (= 変更済み) を強調するブルー表示にする。 */
  active?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Token Swapper の各段で参照先を選ぶドロップダウン (デザイン 24:770)。ネイティブ
 * <select> を使ってキーボード操作・候補リストを OS に委ね、見た目だけ CSS で寄せる。
 * `active` (デフォルトから変更済み) のときはブルー枠の強調スタイルにする。
 */
export function Dropdown({
  value,
  options,
  onChange,
  active = false,
  disabled = false,
  ariaLabel,
}: DropdownProps) {
  // 現在値が候補に無い場合でも表示できるよう、先頭にプレースホルダ option を補う。
  const known = options.some((o) => o.value === value);
  return (
    <span className={'dropdown' + (active ? ' dropdown--active' : '')}>
      <select
        className="dropdown__select"
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
      >
        {!known && <option value={value}>{value}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="dropdown__chevron"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-hidden="true"
        fill="none"
      >
        <path
          d="M3.5 5l2.5 2.5L8.5 5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
