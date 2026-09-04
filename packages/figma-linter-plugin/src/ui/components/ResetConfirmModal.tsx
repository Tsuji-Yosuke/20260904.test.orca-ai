import { useEffect, useRef } from 'react';

interface ResetConfirmModalProps {
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 「デフォルトに戻す」確認モーダル (破壊的操作)。サイズ (System の参照込み) と FontSize を
 * 出荷時へ完全復元するため、実行前に確認を挟む。a11y: 開いたらキャンセルへフォーカスし、
 * Tab をダイアログ内に閉じ込め (フォーカストラップ)、Esc で閉じる。
 */
export function ResetConfirmModal({ busy = false, onCancel, onConfirm }: ResetConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const focusables = () =>
      Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
    focusables()[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
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
  }, [onCancel]);

  return (
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div
        ref={modalRef}
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal__title" id="reset-modal-title">
          デフォルトに戻しますか？
        </p>
        <p className="modal__body">
          サイズ（Sizing / Spacing の参照含む）と FontSize を出荷時の状態へ完全復元します。
          現在のプリセット適用・トークンの割り当て・サイズ調整はすべて失われます。
        </p>
        <div className="modal__actions">
          <button type="button" className="button button--secondary" onClick={onCancel}>
            キャンセル
          </button>
          <button
            type="button"
            className="button button--danger"
            disabled={busy}
            onClick={onConfirm}
          >
            デフォルトに戻す
          </button>
        </div>
      </div>
    </div>
  );
}
