# Chip implementation notes

`packages/design-language/components/Chips/Chips.md`（status: ready）を React へ写像するメモ。
仕様の正は design-language。実装が安定したら削除してよい。

## React への写像

- design-language の "Chips" 原典は単一のチップ要素を記述しているため、React コンポーネント名は
  単数の `Chip` とした（群は将来の ChipGroup、原典 Open Question）。
- `mode="static" | "selectable" | "removable"` … 原典の3モード。
  - `static`: `<span>`。非インタラクティブ。button role なし、フォーカス不可。enabled/disabled の2状態のみ
    （disabled は `data-disabled` + 視覚のみ。非インタラクティブなので aria-disabled は付けない）。
  - `selectable`: **Base UI Toggle** に委譲（`@base-ui-components/react/toggle`）。aria-pressed と
    controlled (`selected`) / uncontrolled (`defaultSelected`) を Toggle が担保。`onPressedChange` →
    `onSelectedChange(next)`。disabled は Toggle の native disabled。選択時は `data-[pressed]` で背景＋縁取り。
    [[project_base_ui_allowed]]
  - `removable`: `<span>` 本体 + 独立した `<button aria-label>`（削除）。本体は非インタラクティブ
    （原典 Open Question「本体押下の意味」は未確定のため、既定では本体に操作を持たせない）。
    削除ボタンのアクセシブルネームは `removeLabel`、未指定かつ children が文字列なら `${children} を削除`。
- `size="sm" | "md" | "lg"` … Figma の Size 軸（Small/Medium/Large）に一致（原典も3段階へ更新済み）。
- `leadingIcon` / `trailingIcon` … 任意の2スロット。`aria-hidden` の wrapper、`size-icon-*` でサイズ担保。
  アイコンは色を持たせず currentColor を継承（選択時に反転色へ追従させるため）。removable では trailing を
  削除ボタンが占める。

## 実装判断（Figma node 1162:10352 と照合済み）

- ピル形状 `rounded-full`、`border-sm`(1px)。高さは固定（`h-component-half-{sm,md,lg}` = 20/24/28）。
  Figma が `Sizing/Component/Half` の固定高で中央寄せするため、padding 積み上げではなく高さトークンを採用
  （IconButton の `Sizing/Component/Full` と同じ方針）。
- 状態別の色トークン（Figma 各 State の variable 束縛に一致）:
  - Enabled / 非選択: `bg-secondary`(白) / `border-on-secondary`(黒1px) / `text-on-secondary`(黒)。
  - 選択(=`data-[pressed]`) / Active: `bg-primary`(黒) / `text-on-primary`(白) / `border-primary`、
    ラベルは `group-data-[pressed]:typography-...-bold` で太字に差し替え（Figma の Active=MediumBold）。
  - Hover/Active: base fill を潰さないよう `dark-opacity` の background-image レイヤで合成。
  - Focused: `shadow-focus-outline`（= UI/OutlineFocus 赤2px リング）。
  - Disabled: `bg-disabled` / `text-on-disabled` / `border-disabled`。
- size 別: px=`padding-{xs,sm,sm}`(8/12/12)、gap=`padding-2xs`(4)、label=`typography-standard-label-{small,medium,large}`、icon=`size-icon-{sm,md,lg}`(16/20/24)。
- Tailwind JIT 対策で、bold ラベルの `group-data-[pressed]:typography-...-bold` は SIZE_CLASS に**完全リテラル**で保持（動的合成では検出されない）。

## 残 gap / Open Questions

- 取り消しモードの本体押下の意味、ChipGroup 切り出し、最小タップ領域は原典の Open Questions のまま。
