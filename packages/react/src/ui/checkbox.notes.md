# Checkbox implementation notes

`packages/design-language/components/Checkbox/Checkbox.md`（status: ready, Figma node 11019:3024）を
React へ写像するメモ。仕様の正は design-language。実装が安定したら削除してよい。

## React への写像

- Base UI `@base-ui-components/react/checkbox` の `Checkbox.Root`（Container=span[role=checkbox] +
  隠し native `<input type="checkbox">` を sibling で保持）+ `Checkbox.Indicator`（checked ||
  indeterminate のときだけマウントされる Mark の入れ物）の上に実装。
- `checked` / `defaultChecked` / `onCheckedChange` / `disabled` / `readOnly` / `required` / `name` /
  `value` / `indeterminate` はすべて Base UI の Root にそのまま委譲。
- Box（原典の「実際に見える正方形」）は独自の `<span>` として Root の子に配置。値状態
  （Unchecked/Selected/Indeterminate）は Root が持つ `data-checked` / `data-unchecked` /
  `data-indeterminate` / `data-disabled` を `group` + `group-data-[...]:` で参照して描画する
  （Root 自身が controlled/uncontrolled どちらでも正しい checked を data 属性として持つため、
  Box 側で checked state を再計算・二重管理しない）。
- Mark（チェックマーク/水平バー）は Indicator 内に両方常時描画し、Root の `data-indeterminate`
  実状態を参照する CSS（`group-data-[indeterminate]:hidden` / `hidden group-data-[indeterminate]:block`）
  で切り替える。ローカル prop の JS 分岐だと、CheckboxGroup の parent チェックボックスのように
  group 側が indeterminate を計算するケースで誤ったマークになるため（レビュー指摘 2026-07-20）。
  なお Base UI 1.0.0-rc.0 の parent 計算は controlled な `value` のみを参照する
  （`defaultValue` は `useCheckboxGroupParent` に渡らない）。

## 実装判断

- Container 実寸（20/24/28px）: `size-component-half-{sm,md,lg}`（`--spacing-component-half-*` token）。
- Box 実寸（Figma実測 14/16/18px）: 専用 token が無いため `sizing-lg`（16px = md の実寸と一致）を基準に
  `sizing-2xs`（2px）を `calc()` で加減して sm/lg を組み立てた（`size-[calc(var(--sizing-lg)-var(--sizing-2xs))]`
  等）。固定寸法を token の組み合わせで再現する方針（`packages/react/CLAUDE.md` の実装判断の原則）に従う。
- Container の角丸は Figma に明記が無いが、Box と同じ `radius-xs` を hover/active state layer にも適用した
  （このコンポーネントで定義されている唯一の半径であり、新しい形状を発明しないための選択）。
- Mark のサイズは Figma に sm/lg 実測が無いため、Box に対する相対値（チェックマーク `size-2/3`、
  Indeterminate バー `w-1/2` × 高さ `border-width-md`(2px) token）で比例させた。md では Indeterminate
  バーが 16×1/2=8px となり、原典に記載の「8×2px」に一致する。
- disabled × 値状態の組み合わせは `group-data-[disabled]:group-data-[checked]:...` のような compound
  variant を使い、単独 variant より詳細度を上げて確実に上書きする（Tailwind のユーティリティ生成順に
  依存しないため）。
- Hover/Active の state layer は他コンポーネント（Button/Chip/IconButton 等）と同じ
  `linear-gradient` レイヤ合成方式に統一し、`:not([data-disabled])` で disabled 時は出さない。
- Focus リングは共有 `shadow-focus-outline`（`focus-visible`）。Container（span, tabIndex 管理は
  Base UI 側）がフォーカス対象になる。
- `className` は文字列のみ公開する（Base UI 由来の関数形 className は型で遮断。Dropdown と同じ
  型契約テストで担保）。
- disabled は Root が span（native button でない）のため、Base UI の `useFocusableWhenDisabled` が
  `aria-disabled="true"` を付与し、`tabIndex=-1` でフォーカス不可にする（native `disabled` 属性は無い）。

## 一時的な gap

- Disabled×Indeterminate、Hover/Active が Selected/Indeterminate に重なったときの見た目は Figma に
  定義が無く、原典 Open Questions に記載の暫定方針（Disabled-Selected に準じる／対話グループを値グループと
  直交させる）をそのまま実装した。正式な Figma 確認が取れ次第、原典・実装ともに更新する。
