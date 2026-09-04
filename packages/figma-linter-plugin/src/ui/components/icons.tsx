/**
 * ホームメニュー用のインライン SVG アイコン。Figma の asset URL は数日で失効するため、
 * 同等の見た目を SVG で描き起こして同梱する (currentColor でテーマ追従)。
 */

interface IconProps {
  className?: string;
}

/** カメラの絞り (aperture) 風アイコン。「Variablesの確認」メニュー用。 */
export function ApertureIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12V4" />
      <path d="M12 12l6.9 4" />
      <path d="M12 12l-6.9 4" />
    </svg>
  );
}

/**
 * 山形 (chevron) アイコン。既定は下向き (∨)。InfoBar の開閉キャレットに使い、開いたときは
 * CSS で 180° 回して上向き (∧) にする。Index 行の「詳細へ」キャレットは direction="right"。
 */
export function ChevronIcon({
  className,
  direction = 'down',
}: IconProps & { direction?: 'down' | 'right' }) {
  // down の path を基準に、right は 90° 回して使う (見た目の太さを揃えるため同じ path を流用)。
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={direction === 'right' ? { transform: 'rotate(-90deg)' } : undefined}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

/** 水平スライダー風アイコン。「ルックの調整」メニュー用。 */
export function SlidersIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3.5" y1="8" x2="20.5" y2="8" />
      <line x1="3.5" y1="16" x2="20.5" y2="16" />
      <circle cx="15.5" cy="8" r="2.6" fill="var(--knob, var(--bg))" />
      <circle cx="8.5" cy="16" r="2.6" fill="var(--knob, var(--bg))" />
    </svg>
  );
}

/**
 * 円の中に「!」のアラートアイコン。更新通知画面 (UpdateScreen) 用。Figma 109:1270 の素材を
 * そのまま SVG 化したもの (stroke/fill を currentColor にしてテーマ追従させる)。
 */
export function AlertCircleIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 4C23.368 4 28 8.632 28 16C28 23.368 23.368 28 16 28C8.632 28 4 23.368 4 16C4 8.632 8.632 4 16 4Z"
        stroke="currentColor"
        strokeWidth="2.66667"
      />
      <path
        d="M15.9998 20C16.8105 20 17.3332 20.5227 17.3332 21.3333C17.3332 22.144 16.8105 22.6667 15.9998 22.6667C15.1892 22.6667 14.6665 22.144 14.6665 21.3333C14.6665 20.5227 15.1892 20 15.9998 20Z"
        fill="currentColor"
      />
      <path
        d="M16 11.3334L16 16.6667"
        stroke="currentColor"
        strokeWidth="2.66667"
        strokeLinecap="round"
      />
    </svg>
  );
}
