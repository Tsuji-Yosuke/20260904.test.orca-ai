import { useEffect, useRef } from 'react';

interface BulkFixModalProps {
  /** 修正対象のコンポーネント数 (fix を 1 件以上持つもの)。 */
  components: number;
  /** 適用する変更の合計件数。 */
  changes: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 「一括で修正」前の確認モーダル。複数コンポーネントへ一度に変更を加えるため、件数の要約を
 * 見せて確認を挟む (個別 diff は数が多くなりすぎるので集計のみ)。a11y は FixDiffModal と同様に
 * フォーカストラップ + Esc クローズ (適用中は閉じない)。
 */
export function BulkFixModal({ components, changes, busy = false, onCancel, onConfirm }: BulkFixModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  // 親は onCancel を毎レンダー作り直すので、effect の依存にせず ref で最新を読む (effect は 1 回)。
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    const focusables = () =>
      Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
    focusables()[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!busyRef.current) onCancelRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        ref={modalRef}
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bulk-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal__title" id="bulk-modal-title">
          一括で修正しますか？
        </p>
        <p className="modal__body">
          {components}個のコンポーネントの合計{changes}件を、正しいトークンへまとめて修正します。
          適用後の状態は再検査で確認できます。
        </p>
        <div className="modal__actions">
          <button type="button" className="button button--secondary" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="button" disabled={busy} onClick={onConfirm}>
            一括で修正
          </button>
        </div>
      </div>
    </div>
  );
}
