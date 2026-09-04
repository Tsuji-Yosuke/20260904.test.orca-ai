import { ChevronIcon } from './icons';
import { CountBadges } from './CountBadges';

interface InfoBarProps {
  /** 選択中のコンポーネント数。 */
  count: number;
  /** 正しいトークンの合計数 (全コンポーネント横断)。 */
  pass: number;
  /** 要確認の合計数 (全コンポーネント横断)。 */
  fail: number;
  /** Index (一覧) を開いているか。true でキャレットを上向き (∧) にする。 */
  expanded: boolean;
  /** バー全体クリックで一覧の開閉をトグルする。 */
  onToggle: () => void;
}

/**
 * 複数選択時に TopAppBar の下へ出すインフォバー (デザイン 106:862)。
 * 「N個のコンポーネント選択中」+ 合否件数バッジ + 開閉キャレットを 1 行に並べたボタン。
 * クリックで Index (一覧) を開閉する (ドロップダウン的トグル)。
 */
export function InfoBar({ count, pass, fail, expanded, onToggle }: InfoBarProps) {
  return (
    <button
      type="button"
      className="info-bar"
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <span className="info-bar__text">{count}個のコンポーネント選択中</span>
      <CountBadges pass={pass} fail={fail} />
      <span className={`info-bar__caret${expanded ? ' info-bar__caret--open' : ''}`}>
        <ChevronIcon />
      </span>
    </button>
  );
}
