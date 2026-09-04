/**
 * 正しいトークン数 (緑チェック) と要確認数 (オレンジ「?」) を並べて出す小バッジ。
 * 複数選択時のインフォバー集計と Index 行の各コンポーネント件数で共用する
 * (デザイン 106:890 / 106:1043)。色は検査の合否バッジ (status-badge) と揃える。
 */
interface CountBadgesProps {
  /** 正しいトークン数 (pass)。 */
  pass: number;
  /** 要確認数 (fail)。 */
  fail: number;
}

export function CountBadges({ pass, fail }: CountBadgesProps) {
  return (
    <span className="count-badges" aria-label={`正しいトークン ${pass} 件 / 要確認 ${fail} 件`}>
      <span className="count-badge">
        <span className="count-badge__icon count-badge__icon--pass" aria-hidden="true">
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7.3 5.6 10 11 4"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="count-badge__num">{pass}</span>
      </span>
      <span className="count-badge">
        <span className="count-badge__icon count-badge__icon--fail" aria-hidden="true">
          ?
        </span>
        <span className="count-badge__num">{fail}</span>
      </span>
    </span>
  );
}
