# Tabs implementation notes

`packages/design-language/components/Tabs/Tabs.md`（status: ready）を React へ写像するメモ。
仕様の正は design-language。実装が安定したら削除してよい。

## 採用した実装プリミティブ

- **Base UI Tabs**（`@base-ui-components/react/tabs`）の上に token スタイル。WAI-ARIA Tabs Pattern、
  roving tabindex、矢印/Home/End、Panel の id/aria-labelledby/hidden を Base UI に委譲。[[project_base_ui_allowed]]
- 公開 API は薄いラッパー（`Tabs` / `TabList` / `Tab` / `TabPanel`）として維持。size/layout/disabled の
  スタイル文脈のみ自前 context で持つ。

## React への写像

- `Tabs` → `BaseTabs.Root`（`value` / `defaultValue` / `onValueChange`）。原典 Open Question の
  「制御/非制御の両モード」は Base UI が担保。`size`（small/medium/large）/ `layout`（spread/fit）/
  `disabled`（全体無効）。
- **手動活性化（manual activation）**: `TabList`（=`BaseTabs.List`）に `activateOnFocus={false}`。
  矢印キーはフォーカス移動のみ、選択は click / Enter / Space。
- `Tab` → `BaseTabs.Tab`（`value` / `disabled`）。`icon`（装飾, aria-hidden）と `badge`（内容）スロット。
  選択中は `data-[active]`（Base UI の Tabs.Tab は選択中を `data-selected` ではなく `data-active` で
  表す）で下線幅・色のみ切り替える。文字色・太さは state 間で不変（下線のみが「いまここ」を示す）。
- 無効 Tab は Base UI が roving tabindex を保つため native `disabled` を付けず `aria-disabled` +
  `data-disabled` で表す。Tailwind の `disabled:`（`:disabled` 疑似クラス）はこの `data-disabled`
  属性には反応しないため、無効時の下線・文字色・カーソルはすべて `data-[disabled]:` variant で実装する。
- `TabPanel` → `BaseTabs.Panel`（`value`, `keepMounted`）。非選択は Base UI が `hidden`。

## 実装判断

- **Selection Indicator は下線**（選択中 Tab の `border-b` を primary・2px、TabList 下辺に divider）。
  原典 Open Question「Indicator の形」の既定採用。
- 無効 Tab は **`aria-disabled`**（Base UI 既定。native disabled ではない）。**矢印キーではフォーカスが到達するが
  活性化しない**方式を採用（原典 Open Question の二択のうち「フォーカス到達・非活性化」を Base UI 委譲で採用）。
- **文字色・太さは state 間で不変**（常に Bold、常に `text-on-surface`）。選択中でも `text-primary` には
  ならない。強調は下線の太さ・色（1px outline → 2px primary）だけで表現する。Figma 実データ（node
  1161:3903, Tabs/TabItem component_set）で確認済み。過去のメモにあった「選択中は前景強調」は誤りだった
  ため削除・修正した。
- **非選択でも常に 1px の下線**（`border-outline`）を表示する。以前の `border-transparent`（非選択は下線
  非表示）は Figma と齟齬があったため修正した。
- **hover は背景 `bg-surface-container` を追加**するのみ（文字色は変えない）。
- **disabled でも下線は消えない**。色のみ `border-on-disabled`（#bfbfbf 相当）に変わる。

## Figma 実データとの照合（完了）

- 2026-07 に Figma 実データを持つノード（fileKey `dhuY0Fs1irfTaxTRbTCd1h`, node `1161:3903`,
  "Tabs/TabItem" component_set, 🧰 Common UI Kit (Web)）が発見され、Size=Small/Type=Spread の
  5 State（Enabled / Hover / Focused / Active / Disabled）を実測して照合した。以前 Tabs.md
  frontmatter が指していた node `1722:18846`（"Doc/Tabs"）は依然として空のプレースホルダーグリッド
  で実データを持たない別ノードだったことも判明した。
- 照合の結果、以下を修正した（詳細は上の「実装判断」参照）:
  - 全 State で Bold（以前は非選択時に太さ指定なし）。
  - 非選択でも 1px outline 色の下線を表示（以前は非表示）。
  - 選択中でも文字色は不変（以前は `text-primary` に変化）。
  - hover で背景 `surface-container` が付く（以前は文字色のみ変化）。
  - disabled でも下線が薄い `on-disabled` 色で残る（以前は非表示のまま）。
  - Focus の `shadow-focus-outline`（全コンポーネント共有 token）は当初 spread 4px で Figma 実測
    （2px）とズレていたが、2026-07-14 に token-pipeline の `tailwind.template.css` で
    `var(--border-width-md)`（= Sizing/Border/md = 2px）参照へ修正済み。
- TabList の共有下線（`border-b-sm border-outline-dim`）と個々の Tab の下線が二重線・色ズレを起こさない
  か Storybook（Default / Sizes / Disabled）で確認した。`layout=spread` では各 Tab の下線がリスト幅
  いっぱいに並ぶため、個々の Tab の下線（selected 以外は `outline` 色）が List の divider（`outline-dim`
  色）を完全に覆い隠し、見た目上は 1 本の連続した線になるはず、と当初判断したが、**実際には `-mb-sm` の
  負マージンが効いておらず（`"sm"` が margin スケールの実キー名 `--spacing-margin-sm`＝2px と一致せず
  Tailwind に無視され `margin-bottom: 0px` のままだった）、TabList 自身の 1px 下線が Tab の下線から
  1px はみ出て見える不具合があった**（ユーザー報告により発覚）。`-mb-[var(--sizing-border-sm)]`
  （TabList の border-bottom-width と同じ token を直接参照）に修正し、全 state・両 layout で
  Tab の下端座標が TabList の下端座標と一致することをブラウザで実測して解消済み。`layout=fit` で
  Tab がリスト幅に満たない場合は List 側の divider が地の色（残り部分）として見えるままになるが、
  これは意図された役割（「Tab が無い残り部分を埋める」）であり問題ではない。

## 未実装（原典 Open Questions のまま）

- 横スクロール時のオーバーフローアフォーダンス（フェード/矢印ボタン）、選択中 Tab の自動スクロールイン
  （原典 Open Questions）は未実装。横スクロールでの手動到達は Storybook `Overflow` story（AC-Tabs-05）
  で確認できる。縦並び Tabs は別コンポーネント扱い（原典）。
