import type { BaseScaleValue, BaseTokenSnapshot, RefOption } from '../../shared/messages';

/**
 * 機能3 (Token Swapper) の純関数ロジック。プレビュー (ドロップダウン/範囲バー) と実反映
 * (書き戻し) が同じ計算を通るので、画面と Figma の値が必ず一致する。
 *
 * モデル: System トークン群の各段は reference/sizing スケール上の 1 点を指す。スライダーは
 * その全段が占める「範囲」を reference のドット列の上にバーで重ね、ドラッグで範囲ごと
 * ±1 段ずらす (= 全段の参照先を一律 +1 / -1 シフト)。オフセットは常に各段の基準
 * (現在/出荷時の参照先) からの絶対変換にして冪等にする (何度動かしても累積しない)。
 */

/** オフセット値を符号付きで表示する (0 → "+0", 2 → "+2", -1 → "-1")。 */
export function formatOffset(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

/** "+2" / "-1" / "3" を整数に。解釈できなければ undefined。 */
export function parseOffset(text: string): number | undefined {
  const t = text.trim().replace(/^\+/, '');
  if (!/^-?\d+$/.test(t)) return undefined;
  return Number(t);
}

/** index を [0, length-1] に丸める。 */
export function clampIndex(i: number, length: number): number {
  return Math.min(length - 1, Math.max(0, i));
}

/** v を [min, max] に丸める。 */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** options 内で name に一致する候補の index。無ければ -1。 */
export function indexOfOption(options: ReadonlyArray<RefOption>, name: string): number {
  return options.findIndex((o) => o.name === name);
}

/** id から候補を引く (currentRefId → 名前の解決に使う)。 */
export function optionById(options: ReadonlyArray<RefOption>, id: string | null): RefOption | undefined {
  return id ? options.find((o) => o.id === id) : undefined;
}

/**
 * 生スケール (FontSize/* など) を `offset` 段ずらした書き戻し値を返す。各トークンは順序 i に
 * 対し、i+offset 段のトークンの出荷値 (shipped) を取る (端はクランプ)。offset=0 は恒等。
 * tokens は呼び出し側が昇順で渡す前提だが、念のためここでも昇順に整える。
 */
export function shiftScaleValues(tokens: BaseTokenSnapshot[], offset: number): BaseScaleValue[] {
  const sorted = [...tokens].sort((a, b) => a.shipped - b.shipped || a.name.localeCompare(b.name));
  return sorted.map((t, i) => ({
    id: t.id,
    value: sorted[clampIndex(i + offset, sorted.length)]?.shipped ?? t.shipped,
  }));
}
