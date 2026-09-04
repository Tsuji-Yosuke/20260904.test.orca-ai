# Search implementation notes

`packages/design-language/components/Search/Search.md`（status: ready）を React へ写像するメモ。
仕様の正は design-language。実装が安定したら削除してよい。

## 採用した実装プリミティブ

- **Base UI Autocomplete**（`@base-ui-components/react/autocomplete`）の上に token スタイルを載せて実装。
  Combobox の WAI-ARIA（role=combobox / listbox / option）、キーボード操作、focus 管理、Esc 挙動、
  Clear の表示制御（値があるときだけ）を Base UI に委譲する。[[project_base_ui_allowed]]
- Suggestion Surface は Base UI の Portal/Positioner/Popup/List/Item/Empty で構成。原典 Open Question
  「Surface を内蔵するか別コンポーネントに委ねるか」は **Base UI Combobox に委譲**で解決。
  Select の Item/Option を共有プリミティブにする案は、Base UI 採用により当面不要。

## React への写像

- `items?: string[]`（サジェスト。未指定ならサジェスト無しの検索入力）。
- `value` / `defaultValue` / `onValueChange`（入力文字列。即時絞り込み）。
- `onSubmit`: Input の Enter で、ハイライト中の候補が無い（`aria-activedescendant` 無し）ときに現在値で
  発火。原典「Enter は確定 / 展開時はハイライト選択」を実現。`event.defaultPrevented` では判定できない
  理由は「実装判断」節参照。
- `onSelect`: サジェスト項目選択時。
- `size`（small/medium/large）、`disabled`、`error` + `errorMessage`（aria-invalid + aria-describedby）、
  `loading`（aria-busy + Trailing スピナー）、`trailingHint`、`emptyMessage`、`clearLabel`。
- アクセシブルネームは `aria-label` で必須提供（プレースホルダー単独に依存しない）。
- Input には `type="search"`。サジェストありのため role は combobox（Base UI 既定）。
- focus-visible リングは Container（`focus-within:shadow-focus-outline`）単位で提示。

## 実装判断（原典 Open Question の暫定既定）

- Leading Indicator = 虫眼鏡（装飾、`data-search-icon` + aria-hidden）。
- Container = 下線型（基準は下線。上 2 辺のみの小さい角丸 + border-bottom。原典 Visual Semantics
  参照。旧: 全周の丸い枠 `rounded-md border-sm` だったが Figma 実データ node 1748:16971 で確定）。
- Submission = 即時絞り込み（onValueChange を都度発火）。明示送信は onSubmit。
- Trailing = loading 中はスピナー、非 loading は `trailingHint`（⌘K 等）。
- landmark `role="search"` のラップは呼び出し側責務（本コンポーネントは付けない）。
- Error 発生条件は呼び出し側（`error` prop で受ける）。
- Error 時の専用アイコン: Figma の Trailing Icon は Clear と同じ X パスを `--ui/error` で塗るのみ
  （形状は変えない）。get_design_context で実際の SVG path を確認して判断した。そのため別アイコンを
  追加するのではなく、`Autocomplete.Clear` の X を `hasError` のとき `text-error` に塗り替える形で
  実装している（値がある前提の Figma variant と一致）。
- Hover と Focused/Active の優先度（原典: Disabled > Error > Active > Focused > Hover > Enabled）は
  CSS 疑似クラスの合成だけでは素直には表現できない（`:hover` は `:focus-within` より強い詳細度になる
  組み合わせがある）。`[&:hover:not(:focus-within)]:...` で Hover 用 class を `:focus-within` の間は
  無効化することで対処した。Base UI の Autocomplete.Input は開いている間ずっとフォーカスを保持する
  ため、この除外だけで Active（`has-[[data-popup-open]]:...` で検出）> Hover の優先度も自動的に成立
  する。Disabled / Error は JS 側で hasError/disabled を見て Hover 用 class 自体を出し分けているため
  詳細度の問題が起きない。
- Enter 二重発火の回避: `Autocomplete.Input`（`ComboboxInput`）の `onKeyDown` は、渡した props が
  内部で最も外側（rightmost）にマージされるため、Base UI 自身の内部 Enter ハンドラより**先に**実行
  される（`@base-ui-components/react` の `mergeProps` は「rightmost が先に呼ばれる」設計。node_modules
  の `merge-props/mergeProps.js` と `combobox/input/ComboboxInput.js` で確認）。そのため
  `event.defaultPrevented` では「この後 Base UI がハイライト選択するか」を判定できない。Base UI は
  `virtual: true` の `useListNavigation` によりハイライト中だけ Input に `aria-activedescendant` を
  付与する（`combobox/root/AriaCombobox.js` の `getReferenceProps()`）ため、これの有無で判定している。

## 2026-07-14: 候補行の視覚を Select と共有

`plans/spike-notes/010-option-primitive-design.md`（案A）に基づき、`Autocomplete.Item` の
className を非公開の `packages/react/src/internal/option-row.tsx`（`optionRowClassName()` /
`OptionRowLabel`）に置き換えた。Search は `selectable` を渡さない（`data-selected` の黒塗りは
Select 専用、Search は候補確定後に Surface を閉じるため永続的な選択済み表現を持たない）。
見た目のみの置換で公開 API・既存テストへの影響は無い。行高が `py-padding-sm` ベースの可変から
`h-component-full-sm`（40px 固定、Figma `Select/Menu/MenuItem` 実測）に変わった。

2026-08-07 追記: Select の Figma 再照合（裁定済み）に伴い option-row が MenuItem 実測へ
更新され、Search のサジェスト行も同時に変わった: 行高 `min-h-component-full-sm`（40px 下限）、
横 padding `px-padding-lg`（24px）→ `px-padding-md`（16px）、`typography-tight-body-medium`
（14px）→ `typography-tight-body-small`（12px）。Figma 上も Search の Suggestion Surface は
同じ MenuItem のインスタンスであることを確認済み（node 1748:16971）。option-row に追加された
Leading / Trailing Icon slot（`OptionRowIcon`）は Search の公開 API には出していない。

## 一時的な gap

- 最小タッチターゲット: small は 32px 下限（原典の Foundations 逸脱、マウス前提面用途）。
- vite の lib build で `@base-ui-components/react` は external 化（バンドルしない）。
- Suggestion Surface（Autocomplete.Popup）の幅は `Autocomplete.Positioner` に
  `anchor={containerRef}`（虫眼鏡・Clear を含む視覚的な検索ボックス全体の div）を明示している。
  既定のまま anchor 未指定だと Base UI は `Autocomplete.Input`（生の `<input>`）を anchor にするため、
  `--anchor-width` が input 自身の幅（アイコン・Clear の padding 分を含まない）になり、サジェストが
  入力欄より狭く・左にズレて表示される。
