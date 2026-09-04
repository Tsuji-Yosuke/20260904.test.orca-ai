import { useEffect, useRef, useState } from 'react';
import type { FixCandidate, FixDiff } from '../../shared/messages';

interface FixDiffModalProps {
  diffs: FixDiff[];
  busy?: boolean;
  onCancel: () => void;
  /** 一括で修正。choices = FixDiff.id → 選び直したトークンの Variable.id (既定と異なるものだけ)。 */
  onConfirm: (choices: Record<string, string>) => void;
}

/**
 * 「適用」前に変更内容を見せる確認モーダル (デザイン 111:1314 Apply Variables)。
 * Dimension / Color のグループに分け、各項目について現在の状態 (before) と適用するトークン
 * (after) を並べる。after はドロップダウンで、そのフィールドのカテゴリ内の有効トークンへ
 * 選び直せる。トークンの中の実数/色が変わる場合は黄色の「?」+「数値/カラーが変わっています」で
 * 警告し、変わらない場合は緑の「✓」で示す。a11y はフォーカストラップ + Esc クローズ。
 */
export function FixDiffModal({ diffs, busy = false, onCancel, onConfirm }: FixDiffModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  // 親 (CheckScreen) は onCancel を毎レンダー作り直すので、effect の依存にすると適用中の
  // 再描画でフォーカスが先頭ボタンへ奪われる。最新の onCancel は ref 経由で読む (effect は 1 回)。
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  // 適用中 (busy) は背景クリック / Esc で閉じない。effect は 1 回なので最新値は ref で読む。
  const busyRef = useRef(busy);
  busyRef.current = busy;

  // 行ごとに選び直したトークン (FixDiff.id → Variable.id)。未選択の行は既定 (defaultId) を使う。
  const [choices, setChoices] = useState<Record<string, string>>({});
  const select = (fixId: string, varId: string) =>
    setChoices((prev) => ({ ...prev, [fixId]: varId }));

  useEffect(() => {
    focusableButtons(modalRef.current)[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!busyRef.current) onCancelRef.current(); // 適用中は閉じない
        return;
      }
      if (e.key !== 'Tab') return;
      const root = modalRef.current;
      const f = focusableButtons(root);
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      // フォーカスがモーダル外へ逃げたとき (例: 適用中に操作対象が disabled になり body へ移った)
      // は引き戻す。モーダル内 (select も含む) なら下の first/last 折り返しに任せる。
      if (root && (!(active instanceof Node) || !root.contains(active))) {
        e.preventDefault();
        (e.shiftKey ? last : first)?.focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // 適用が始まると操作対象 (フッターボタンや select) が disabled になり、フォーカスが body へ
  // 落ちてモーダル外へ逃げ得る。busy になった瞬間に、まだ有効な閉じる × へ引き戻す。
  useEffect(() => {
    if (busy) focusableButtons(modalRef.current)[0]?.focus();
  }, [busy]);

  const dimensions = diffs.filter((d) => d.kind === 'dimension');
  const colors = diffs.filter((d) => d.kind === 'color');

  const confirm = () => {
    // 既定と異なる選択だけ送る (未指定の行は apply 側で既定トークンが使われる)。
    const picked: Record<string, string> = {};
    for (const d of diffs) {
      const sel = choices[d.id];
      if (sel && sel !== d.defaultId) picked[d.id] = sel;
    }
    onConfirm(picked);
  };

  return (
    <div
      className="apply-modal-overlay"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel(); // 適用中は背景クリックで閉じない
      }}
    >
      <div
        ref={modalRef}
        className="apply-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="apply-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="apply-modal__header">
          <p className="apply-modal__title" id="apply-modal-title">
            Apply Variables
          </p>
          <button
            type="button"
            className="icon-button apply-modal__close"
            aria-label="閉じる"
            title="閉じる"
            onClick={onCancel}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="apply-modal__body">
          {dimensions.length > 0 && (
            <FixGroup title="Dimension" items={dimensions} choices={choices} onSelect={select} busy={busy} />
          )}
          {colors.length > 0 && (
            <FixGroup title="Color" items={colors} choices={choices} onSelect={select} busy={busy} />
          )}
        </div>

        <div className="apply-modal__footer">
          <button type="button" className="apply-modal__button" disabled={busy} onClick={confirm}>
            一括で修正
          </button>
        </div>
      </div>
    </div>
  );
}

interface FixGroupProps {
  title: string;
  items: FixDiff[];
  choices: Record<string, string>;
  onSelect: (fixId: string, varId: string) => void;
  busy: boolean;
}

function FixGroup({ title, items, choices, onSelect, busy }: FixGroupProps) {
  return (
    <section className="apply-group">
      <p className="apply-group__title">{title}</p>
      <div className="apply-group__rows">
        {items.map((d, i) => (
          <FixRow
            key={`${d.id}-${i}`}
            diff={d}
            selectedId={choices[d.id] ?? d.defaultId}
            onSelect={(id) => onSelect(d.id, id)}
            busy={busy}
          />
        ))}
      </div>
    </section>
  );
}

interface FixRowProps {
  diff: FixDiff;
  selectedId: string;
  onSelect: (varId: string) => void;
  busy: boolean;
}

function FixRow({ diff, selectedId, onSelect, busy }: FixRowProps) {
  const isColor = diff.kind === 'color';
  // 選択中の候補 (見つからなければ既定 after/afterValue にフォールバック)。
  const selected: FixCandidate =
    diff.candidates.find((c) => c.id === selectedId) ?? {
      id: diff.defaultId,
      name: diff.after,
      value: diff.afterValue,
    };
  // 適用でトークンの中の実数/色が変わるか。変わる = 黄「?」/ 変わらない = 緑「✓」。
  const changed = diff.beforeValue !== selected.value;
  // before がトークン (= 実数/hex そのものでない) なら、その中の値を別ボックスで添える。
  const beforeIsToken = diff.before !== diff.beforeValue;
  // 候補が 2 件以上あるときだけ選び直せる (1 件以下は静的表示)。
  const hasDropdown = diff.candidates.length > 1;

  return (
    <div className="apply-item">
      <div className="apply-item__head">
        <StatusDot changed={changed} />
        <p className="apply-item__label">{diff.label}</p>
      </div>
      <div className="apply-item__row">
        {/* before: 現在の状態 (グレーのチップ) */}
        <div className="apply-pill apply-pill--before">
          {isColor && (
            <span className="apply-pill__swatch" style={{ background: swatchColor(diff.beforeValue) }} />
          )}
          <span className="apply-pill__token">{shortName(diff.before)}</span>
          {!isColor && beforeIsToken && (
            <span className="apply-value apply-value--before">{diff.beforeValue}</span>
          )}
        </div>

        <span className="apply-arrow" aria-hidden="true">
          <ArrowRightIcon />
        </span>

        {/* after: 適用するトークン (ドロップダウン) + 変更時の注記 */}
        <div className="apply-item__after">
          <div className="apply-pill apply-pill--after">
            {hasDropdown && (
              <select
                className="apply-pill__select"
                aria-label={`${diff.label} に適用するトークン`}
                value={selectedId}
                disabled={busy}
                onChange={(e) => onSelect(e.currentTarget.value)}
              >
                {diff.candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.value ? `${shortName(c.name)} — ${c.value}` : shortName(c.name)}
                  </option>
                ))}
              </select>
            )}
            <span className="apply-pill__inner" aria-hidden={hasDropdown ? true : undefined}>
              {isColor && (
                <span className="apply-pill__swatch" style={{ background: swatchColor(selected.value) }} />
              )}
              <span className="apply-pill__token">{shortName(selected.name)}</span>
              {isColor ? (
                <span className={`apply-flag ${changed ? 'apply-flag--diff' : 'apply-flag--ok'}`}>
                  {changed ? '?' : <CheckIcon />}
                </span>
              ) : (
                <span className={`apply-value ${changed ? 'apply-value--diff' : 'apply-value--ok'}`}>
                  {selected.value}
                </span>
              )}
            </span>
            {hasDropdown && (
              <span className="apply-pill__chevron" aria-hidden="true">
                <ChevronDownIcon />
              </span>
            )}
          </div>
          {changed && (
            <p className="apply-item__note">
              {isColor ? 'カラーが変わっています' : '数値が変わっています'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** 見出しの状態ドット。緑「✓」= 値そのまま / 黄「?」= 値が変わる。 */
function StatusDot({ changed }: { changed: boolean }) {
  if (changed) {
    return (
      <span className="apply-dot apply-dot--diff" aria-label="数値/カラーが変わります">
        ?
      </span>
    );
  }
  return (
    <span className="apply-dot apply-dot--ok" aria-label="数値/カラーは変わりません">
      <CheckIcon stroke="#fff" />
    </span>
  );
}

/**
 * トークンのフルネームから先頭セグメント (コレクション名) を落として簡潔に表示する。
 * 例: "Dimension System/Spacing/2xs" → "Spacing/2xs"。実数 / hex など "/" を含まない値は素通し。
 */
function shortName(name: string): string {
  const i = name.indexOf('/');
  return i >= 0 ? name.slice(i + 1) : name;
}

/** hex (#rgb / #rrggbb) ならスウォッチ色に、それ以外 (解決不能の "?") は透明にする。 */
function swatchColor(value: string): string {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : 'transparent';
}

/** モーダル内のフォーカス可能なボタン (フォーカストラップの両端に使う)。 */
function focusableButtons(root: HTMLElement | null): HTMLElement[] {
  return Array.from(root?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
}

function CheckIcon({ stroke = 'currentColor' }: { stroke?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 7.3 5.6 10 11 4"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h9M9 5l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
