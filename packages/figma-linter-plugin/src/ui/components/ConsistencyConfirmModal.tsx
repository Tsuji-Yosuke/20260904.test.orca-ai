import { useEffect, useRef } from 'react';

interface ConsistencyConfirmModalProps {
  /** 揃える外れ値の合計件数。 */
  count: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 「すべて揃える」前の確認モーダル。複数バリアントのトークンを一度に寄せ替えるため、件数を見せて
 * 確認を挟む。a11y は BulkFixModal と同様にフォーカストラップ + Esc クローズ (適用中は閉じない)。
 */
export function ConsistencyConfirmModal({
  count,
  busy = false,
  onCancel,
  onConfirm,
}: ConsistencyConfirmModalProps) {
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
        aria-labelledby="consistency-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal__title" id="consistency-modal-title">
          一括で修正しますか？
        </p>
        <p className="modal__body">
          外れ値{count}件を、各グループの揃え先トークンへまとめて修正します。適用後の状態は再検査で
          確認できます。
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
