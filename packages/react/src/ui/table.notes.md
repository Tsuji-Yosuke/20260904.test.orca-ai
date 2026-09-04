# Table implementation notes

`packages/design-language/components/Table/Table.md`（status: ready, Figma node 11662:17690 / 11662:20668）を
React へ写像するメモ。仕様の正は design-language。実装が安定したら削除してよい。

実装・原典とこのメモが食い違う場合は、実装・原典を正とし、このメモを直ちに修正または削除する。

## React への写像

- `Table`（Root: native `<table>` をスクロール領域 `<div data-table-scroll overflow-x-auto>` で包む）+
  `Table.Head` / `Table.Body` / `Table.Row` / `Table.HeaderCell` / `Table.Cell`。ネイティブ table セマン
  ティクス（table/thead/tbody/tr/th/td）をそのまま使う。`Table.Caption` / `Table.Foot` は提供しない
  （caption は素の `<caption>` を children として直接書ける。tfoot は原典 Anatomy に存在しない）。
- `size`（sm/md/lg, `data-size`, 既定 md）は context で Header/Body Cell の行高（`h-component-full-*` =
  40/48/56px）とタイポグラフィ（Header: `standard-title-*` / Body: `standard-body-*`）に伝播する。
- `Table.HeaderCell` / `Table.Cell` は `type`（text 既定 / slot / checkbox, `data-type`）を共有する軸として
  持つ。text の末尾アイコンは `trailingIcon` スロット。checkbox は Cell 側が Checkbox インスタンスを生成
  せず、呼び出し側が `<Checkbox/>` を children として渡す（Table は Checkbox の props 表面を再実装しない）。
- `Table.HeaderCell` は `scope`（col 既定 / row）で列見出し・行見出しを表現（columnheader / rowheader）。
- `Table.Cell` の `disabled`（opt-in）は `data-disabled` を立て、`text-on-disabled` / `border-disabled` に
  差し替える。Header Cell に disabled は無い（Figma に variant が無いため）。
- Hover の state layer（黒7.8%）・Focused の共有 focus リング（inset、border-collapse で隣接セルに侵食し
  ないため）は CSS の `:hover` / `:focus-within` のみで表現する。Body Cell の hover は優先度
  （Disabled > Focused > Hover）を `:not([data-disabled])` / `:not(:focus-within)` で担保する。
  Header Cell には Focused 視覚も disabled も無いため、hover はガード無しの別定数
  （`HEADER_HOVER_LAYER_CLASS`）にする。
- 内包コントロール自身の focus-visible リングの抑制は **CheckBox Type の Body Cell 限定**
  （`[&:not([data-disabled])_:focus-visible:focus-visible]:shadow-none`）。Figma の CheckBox セル
  Focused variant はセルにだけリングが付き内包 Checkbox にはリングが無い（ユーザー指摘 2026-07-20）。
  - disabled セルではセルのリング自体が出ないため抑制しない（内包 Checkbox のリングを生かし、
    フォーカス表示ゼロを防ぐ）。
  - Slot / Text セルでは抑制しない。複数コントロールを内包し得るため、どのコントロールに
    フォーカスがあるかの判別を優先する。セルの focus-within リングと二重に見えるのは許容する
    （2026-07-20 のレビュー裁定）。全 type 全子孫への抑制をやめたことで、Select 等の
    focus-visible ユーティリティとの詳細度タイ（生成順依存）も対象外になった。
  - :focus-visible を重ねているのは詳細度を上げ、生成順に依らず共有リング（0,2,0）に勝たせるため。
- アクセシブルネームは `<caption>`（無ければ `aria-label`）。
- `className` は `<table>` 自身に付与する（`TableProps extends HTMLAttributes<HTMLTableElement>` と一致）。
  スクロール領域 `<div>` は固定クラスのみ。
- スクロール領域 `<div>` は `tabIndex={0}` + `role="region"`（GOV.UK 等の確立パターン）で、横スクロール
  発生時もキーボードで到達・スクロールできる。既知の制約: region のアクセシブルネーム自動配線
  （caption との `aria-labelledby` 連結など）は未対応。必要なら利用側で `<caption>` と別途
  wrapper 相当のラベル付けを検討する。
- セル内容のラップ（`CellContent`）は必要なときだけ: trailingIcon 有りまたは CheckBox Type のときだけ
  flex ラップになる。素の children 経路（trailingIcon 無しの text/slot）なら td/th への
  `text-align` 等の className がそのまま効く。揃えが必要な列はこの経路を使う。icon 付きセルは
  flex になる点に注意。trailingIcon はスロット側で `size-icon-sm`（16px、Figma 実測）+
  `aria-hidden` を担保する（Dropdown の ICON_CLASS 慣例）。

## 実装判断

- 行高 40/48/56px は `h-component-full-{sm,md,lg}` を Cell に直接適用する。table-cell の `height` は仕様上
  「内容がそれ未満なら最小値として働く」ため、padding-xs(8px)×2 + line-height の積み上げが token 値を下回る
  限り、これだけで Figma 実測と一致する（Storybook で確認済み）。
- CheckBox Type セルの Checkbox サイズは Table の `size` から自動連動させない。呼び出し側で
  `<Checkbox size="sm">` のように揃える（cloneElement による自動注入は複雑さに見合わないと判断）。

## 一時的な gap・範囲外

- 列ソート（aria-sort）・sticky header/column・仮想スクロール・空状態は原典 Open Questions のまま範囲外。
- Header Cell の Focused/Disabled、Body Cell Focused の黒16.1%暗化、Body Cell 文字色の生 black は原典
  Open Questions を参照（本実装は原典の暫定方針どおり: リングのみ・on-surface 統一）。
