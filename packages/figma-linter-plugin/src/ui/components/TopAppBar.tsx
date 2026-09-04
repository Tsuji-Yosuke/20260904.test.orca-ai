interface TopAppBarProps {
  /** 中央〜左に表示するタイトル (例: 「ルックの調整」)。 */
  title: string;
  /** 指定すると左に戻るキャレットを表示する (サブ画面 → ホーム)。 */
  onBack?: () => void;
  /** 指定すると右にリスタートアイコンを表示する (押下時の挙動は画面ごと)。 */
  onReset?: () => void;
  /** リセット不可 (読み込み中・処理中) のときに無効化する。 */
  resetDisabled?: boolean;
  /** 右アイコンの aria-label / title (既定: 「デフォルトに戻す」)。 */
  resetLabel?: string;
}

/**
 * 上部アプリバー。左に戻るキャレット (任意) とタイトル、右にリスタートアイコン (任意) を置く。
 * ホームはタイトルのみ、ルック調整はタイトル + リスタート、チェックデザインは戻る + タイトル +
 * リスタート (= 再検査) のように、画面ごとに左右のアフォーダンスを出し分ける。
 */
export function TopAppBar({
  title,
  onBack,
  onReset,
  resetDisabled = false,
  resetLabel = "デフォルトに戻す",
}: TopAppBarProps) {
  return (
    <header className="topbar">
      {onBack && (
        <button
          type="button"
          className="icon-button topbar__back"
          aria-label="戻る"
          title="戻る"
          onClick={onBack}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
            <path
              d="M10 3 5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <h1 className="topbar__title">{title}</h1>
      {onReset && (
        <button
          type="button"
          className="icon-button topbar__reset"
          aria-label={resetLabel}
          title={resetLabel}
          disabled={resetDisabled}
          onClick={onReset}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
            {/* 反時計回りのリロード矢印 (restart)。 */}
            <path
              d="M3.4 6.2A5 5 0 1 1 3 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M1.7 3.2v3h3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </header>
  );
}
