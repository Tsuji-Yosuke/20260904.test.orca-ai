---
name: Table
status: ready
layer: component
description: サイズとセル種別を持つデータテーブル。
sources:
  figma:
    # Table セルの published component set は2つ（テーブル全体の symbol は Figma に無い）。
    # Header セル: Size Small/Medium/Large（行高 40/48/56）× State Enable/Hover。
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=11662-17690
    # Body セル: Type Text/Slot/CheckBox × Size Small/Medium/Large × State Enabled/Hover/Focused/Disabled。
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=11662-20668
    # Checkbox（CheckBox セルが内包する）: Size Small/Medium/Large × State 8 値。
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=11019-3024
  implementations:
    - packages/react/src/ui/table.tsx
  storybook: []
---

# Table

## 本原典の前提（重要）

Figma の published component には **テーブル全体を表す symbol が存在しない**。存在するのは以下 2 つの component set のみで、いずれも「1 セル」の見た目を定義する。

- `Table/Header/Text`（列見出し行のセル）
- `Table/Header/Body/Text`（データ行のセル。Type = Text / Slot / CheckBox）

したがって本原典は、テーブル全体の構造（container / caption / thead / tbody / row のまとまり）については **Figma の意匠ではなく HTML の表セマンティクスをそのまま正とする**。密度スケール・zebra・cell alignment・Caption 専用スタイル・Foot・行/セルの発明的なボーダー体系（旧版が持っていたもの）は Figma にも根拠が無いため、本改訂で**すべて削除**した。テーブル自体は静的な構造を提供するだけで、独自の視覚的発明を持たない。

## Guide

### Purpose

- 行と列に整理された表形式データを、走査・比較しやすい形で提示する。
- 「同じ属性が列で揃い、1 行が 1 レコードを表す」という二次元の対応関係を担保する責務を負う。
- ヘッダーセルとボディセルという 2 種類のセルの見た目・状態を Figma の実測どおりに提供する。
- データ取得・整形・並べ替えのロジックそのものは責務外（呼び出し側）。
- レイアウトのためのグリッド（非表形式の配置）には使わない。

### Usage

**Use when**

- 複数レコードを同一スキーマ（列）で並べ、列方向に比較したいとき。
- 数値・日付・状態などの構造化データを走査するとき。
- 行を選択可能にしたいとき（CheckBox 型セルを列として使う）。

**Do not use when**

- 視覚的なレイアウト目的の格子（CSS グリッドを使う）。
- 1 レコードの詳細表示（説明リスト / フォームを使う）。
- 並びの軽い列挙でカラム比較が不要なとき（List を使う）。

### User Mental Model

- 「上の見出し行が各列の意味、以降の各行が 1 件のデータ」と読む。
- ヘッダー行は背景色の違い（`surface-container`）で本文行と区別できると認識する。罫線の太さや文字の太さの違いには依存しない。
- 各データセルは自身の下端にある 1 本の細い線で行の区切りを認識する（表全体を囲む格子線ではない）。
- 横に収まらない表は横スクロールで続きを見られると期待する。

### Anatomy

- **Container**（必須）— 表全体。横幅を超える場合のスクロール領域を含む。
- **Caption**（任意）— 表のタイトル。指定すれば表のアクセシブルネームになる。専用の視覚スタイル API は持たない（素の HTML `<caption>` としてマークアップできればよい）。
- **Column Header 行**（推奨）— 各列の意味を示す見出しのまとまり。
- **Header Cell**（推奨）— 列（または行）の見出しセル。スコープ（列見出し / 行見出し）を持つ。3 つの Type: Text（ラベル + 任意の末尾アイコンスロット）/ Slot（自由内容）/ CheckBox（全選択トグル用）。
- **Body**（必須）— データ行のまとまり。
- **Row**（必須、1 つ以上）— 1 レコード。
- **Cell**（必須）— 1 つの値。Header Cell と同じ 3 つの Type: Text / Slot / CheckBox。

順序（上→下）: Caption → Column Header 行 → Body の Row 群。

禁止:

- レイアウト目的でセルを使わない（意味のある表データに限る）。
- 1 セルに複数の独立操作を詰め込み、行の可読性を損なわない。
- Figma に根拠の無い密度スケール・zebra・独自ボーダー体系・Foot（合計行）専用スタイルを「発明」として追加しない（Open Questions 参照）。

### Content Model

- Header Cell の Text Type はラベル文言 + 任意の末尾アイコンスロット（ソート方向インジケータ等、Figma 上はプレースホルダー枠のみで具体アイコンは規定していない）。
- Body Cell の Text Type は値文言 + 任意の末尾アイコンスロット。
- Slot Type は Header / Body いずれも自由内容（カスタム UI）を差し込める空きコンテナ。
- CheckBox Type は Checkbox コンポーネント（別原典 `components/Checkbox/Checkbox.md`）1 個を内包する。Header 側は全選択トグル、Body 側は行選択トグルとして使う。
- 空セルは「データ無し」を示す表現（プレースホルダ）を入れ、無言の空白にしない。
- 長いセル内容は折り返しか省略を列方針として統一する。
- 国際化: Caption / Header / セル内容すべて翻訳対象。書字方向で揃えが反転する。
- セルの内容揃え（左/右/中央）は列のデータ種別に応じて呼び出し側が決める。Table 自身は特定の揃えを既定として強制しない（旧版が持っていた `align` variant は Figma に根拠が無いため削除した）。

### Layout And Density

- 横幅を超える場合は Container 内で横スクロールさせる（行の対応関係を保つ）。
- セルの高さは **size** の 3 段階で決まり、Header Cell / Body Cell 双方で共通: Small=40px / Medium=48px / Large=56px（token: `sizing-component-full-{sm,md,lg}`）。密度という独自軸ではなく、Figma の `Size` variant にそのまま対応する固定値。
- セルの内側余白は全 size・全 Type 共通で横 `padding-md`（16px）・縦 `padding-xs`（8px）、内容とアイコンの gap も `padding-xs`（8px）。段階的に変化する「density スケール」は持たない（旧版の density は Figma に根拠が無いため削除した）。
- 列幅は内容に追従。固定列幅・列幅指定は呼び出し側の責務。
- CheckBox Type セルは幅が内容（Checkbox 20/24/28px 相当 + 左右 padding-md）に追従し、Text/Slot のような固定 160px 幅を持たない。

### Accessibility Notes

- HTML の表セマンティクス（table / caption / thead / tbody / tr / th / td、`th` の scope）に準拠する。Figma に無い意味付けであっても、これは Web 実装の恒久契約として維持する（ユーザー裁定）。
- 表のアクセシブルネームは Caption（無い場合は別途ラベル）で提供する。
- Header Cell は列見出し / 行見出しのスコープを正しく持ち、データセルとの対応を支援技術に伝える。
- CheckBox Type セルの Checkbox は、Checkbox 原典の Accessibility Notes（role=checkbox、ラベル関連付け必須）に従う。ヘッダー側の全選択チェックボックスは、列全体を代表する意味を持つことをアクセシブルネームで伝える。
- Focused の視覚的リングは、セル内にフォーカス可能な要素がある場合の `:focus-within` 相当の見え方であり、フォーカス可能な要素そのものの提供（tabindex 等）はセル内コンテンツ側の責務。
- 横スクロール領域はキーボードでもスクロール到達できるようにする。

## Spec

### Interaction Model

- 構造表示そのものに固有の操作は持たない。
- Header Cell / Body Cell は Hover と Focus-within の軽い視覚フィードバックを持つ（State Model 参照）。これは走査補助・キーボード操作の可視化であり、クリックそのものに機能を持たせるかは呼び出し側の責務（例: ソート可能な列ヘッダーにする、フォーカス可能な要素をセル内に置く）。
- CheckBox Type セルは内包する Checkbox のポインタ / キーボード操作（Checkbox 原典の Interaction Model）にそのまま従う。
- 列ソート（`aria-sort` とトグル）・行クリックでの遷移などの機能は本原典の範囲外（Open Questions）。

### State Model

Figma の 2 つの component set は、セル自身の状態を以下のように定義する。

**Header Cell**（`Table/Header/Text`）:

- Enable — 既定。
- Hover — Container 全体に黒 7.8% の state layer（Checkbox の Hover と同じ強度）。
- Focused / Disabled の variant は Figma に無い（Open Questions）。

**Body Cell**（`Table/Header/Body/Text`、Type = Text で確認。Slot / CheckBox も同じ枠の状態を共有する）:

- Enabled — 既定。
- Hover — 黒 7.8% の state layer。
- Focused — セル内にフォーカスが入った状態。共有 focus リング（`outline-focus` 色、2px）を表示する。Figma の当該 variant は同時に黒 16.1% の state layer も持つが、これは Hover と別の意味合いを持つか未確認のため、本原典では「Focused の視覚的契約」を共有 focus リングのみに限定し、追加の暗化は Open Questions とする。
- Disabled — opt-in。文字色（および末尾アイコン）を disabled 系の弱色に差し替える。境界線色も disabled 系に変わる。ポインタ操作の可否そのものはセルではなくセル内コンテンツ（リンク・ボタン・Checkbox 等）が個別に持つ。

優先度: Disabled（Hover/Focused の強調を出さない）> Focused > Hover。

CheckBox Type セルの Checkbox 自体の状態（checked/indeterminate/disabled 等）は Checkbox 原典の State Model に従う。セルの Hover/Focused/Disabled とは独立した軸。

### Visual Semantics

- Header Cell の背景は `surface-container`（実測 `#f5f5f5`）。Body Cell の背景は `surface`（白）。この背景色差だけでヘッダーと本文を区別し、罫線や太字には依存しない（旧版の「太さ / 下境界などで階層差」を削除し、Figma 実測どおりの背景色差に置き換えた）。
- Header Cell は罫線を持たない。Body Cell は自身の下端に 1px の `outline` 色境界線を持つ（表全体を囲む格子線・thead 下線・tbody outline-dim という旧版の独自ボーダー体系は削除し、Figma 実測どおり「各ボディセル自身の下線のみ」に置き換えた）。
- Header Cell のテキストは `on-surface` 色、typography は size ごとに `standard-title-{small,medium,large}`（Small=14px / Medium=16px / Large=22px）。
- Body Cell のテキストは Figma 上トークン未束縛の生 `black` で描かれているが、実装は `on-surface` 相当のセマンティックトークンに束ねる（デザイナー確認待ち。Open Questions 参照）。typography は size ごとに `standard-body-{small,medium,large}`（Small=12px / Medium=14px / Large=16px）。
- Hover の state layer は Header / Body いずれも黒 7.8% の重ね（Checkbox の Hover と同じ強度）。
- Focused の共有 focus リングは他コンポーネント（Checkbox・Dropdown 等）と同じ `outline-focus` 色・2px の表現を踏襲する。
- Disabled は文字色・境界線色を disabled 系トークンに差し替える。塗りの明暗だけに頼らず、コントラスト低下と（内包コンテンツ側の）操作不能という複合的な手がかりを持つ。
- 色・寸法・境界は token 経由で表現し、全テーマで破綻しない。

### Variants And Options

- **cell type**: Text / Slot / CheckBox。Header Cell / Body Cell 共通の軸。
- **size**: Small / Medium / Large。行高（40/48/56px）を決める固定値。Header Cell / Body Cell 共通。
- **cell state**: Enabled(Enable) / Hover / Focused（Body のみ Figma 定義）/ Disabled（Body のみ Figma 定義、opt-in）。

旧版にあった density（padding スケール）/ zebra / cell alignment / Caption 専用スタイル / Foot は、Figma published に根拠が無いため本改訂で全て削除した。

### Open Questions

- Header Cell の Focused / Disabled 状態が Figma に無い。キーボード操作でヘッダーセル内にフォーカス可能な要素（ソートボタン等）を置く実装が出てきた場合、Body と同じ Focused リングを転用してよいか正式確認が必要。
- Body Cell の Focused variant が Figma 上で共有 focus リングに加えて黒 16.1% の state layer も持っている（Active 相当の強度）。本原典は「控えめに実装する」というユーザー裁定に従いリングのみを正式契約としたが、この暗化を追加すべきかは未確認。
- Body Cell の文字色が Figma 上トークン未束縛の生 `black` になっている（Header は `on-surface` にきちんと束ねられている）。実装は `on-surface` に統一したが、意図的な差別化か Figma 側の束ね漏れかはデザイナー確認待ち。
- 列ソート（`aria-sort` と方向トグル）の API と視覚。
- 列幅制御・固定列（sticky column）・ヘッダ固定（sticky header）の標準サポート範囲。
- 大量行の仮想スクロール対応。
- 空状態（0 件）の表示責務を Table が持つか呼び出し側か。
- Slot Type セルの自由内容と、Hover/Focused の state layer・focus リングとの重なり方（Slot 内側が独自の背景を持つ場合の見え方）。
- 実装着手時の notes 移送先: `packages/react/src/ui/table.notes.md`（スロット API、size の伝播、CheckBox セルと Checkbox コンポーネントの統合方法、スクロール領域の構成）。

### Acceptance Criteria

- AC-Table-01: 表セマンティクス（table / caption / thead / tbody / tr / th / td）で構造を表現する。
- AC-Table-02: Caption を指定すると表のアクセシブルネームになる。
- AC-Table-03: Header Cell が列（行）見出しのスコープを持ち、データセルと対応づく。
- AC-Table-04: size は Small / Medium / Large の 3 段階を持ち、Header Cell / Body Cell とも行高 40 / 48 / 56px に対応する。（検証: Storybook）
- AC-Table-05: cell type は Text / Slot / CheckBox の 3 種を Header Cell / Body Cell 共通で持つ。（検証: Storybook）
- AC-Table-06: Header Cell の背景は Body Cell と異なる面色（`surface-container` 相当）で区別され、罫線を持たない。（検証: Storybook）
- AC-Table-07: Body Cell は自身の下端に 1px の境界線を持つ。（検証: Storybook）
- AC-Table-08: Header Cell / Body Cell とも Hover で state layer 相当の視覚変化が加わる。（検証: Storybook）
- AC-Table-09: Body Cell は `:focus-within` 相当でセルを囲む共有 focus リングを表示する。（検証: Storybook）
- AC-Table-10: Body Cell は disabled を opt-in で指定でき、文字色が disabled 系の弱色に変わる。（検証: Storybook）
- AC-Table-11: CheckBox Type セルは Checkbox コンポーネントを内包し、Checkbox 原典の状態（checked/indeterminate/disabled）をそのまま表現する。（検証: Storybook）
- AC-Table-12: 横幅超過時に行対応を保ったまま横スクロールできる。
- AC-Table-13: density（padding スケール）・zebra・cell alignment・Caption 専用スタイル・Foot は提供しない（Figma に根拠の無い発明を持ち込まない契約）。（検証: 対象外）
- AC-Table-14: 色・寸法・境界は token 経由で、全テーマで破綻しない。（検証: Storybook）
