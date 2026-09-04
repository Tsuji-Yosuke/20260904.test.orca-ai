---
name: Chips
status: ready
layer: component
description: 選択・フィルタ操作のためのトグル可能なチップ（Base UI Toggle ベース）。
sources:
  figma:
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=1162-10352&m=dev
  implementations:
    # 実装名は単数形の Chip（単一チップ要素の原典のため。群は将来の ChipGroup）。AC ID は原典基準（AC-Chips-NN）のまま。
    - packages/react/src/ui/chip.tsx
  storybook: []
---

# Chips

## Guide

### Purpose

- 属性・選択項目・条件など、小さな単位の情報やアクションをコンパクトに表す要素。
- 検索条件、カテゴリ、ユーザー選択内容の表示・取り消しといった、軽量な操作と表示を兼ねる責務を持つ。
- Tag のような静的ラベルとは異なり、インタラクティブな要素である（押下による選択切替、削除など）。
- 主アクションのトリガーは責務外（それは Button）。

### Usage

**Use when**

- 複数の選択肢から 0 個以上 / 1 個以上を選ばせるフィルタや属性付与の UI。
- 入力済みのタグ・値を一覧として並べ、個別に取り消せるようにする場面。
- 結果セットのフィルタ表現、検索条件のサマリ。
- ユーザー選択内容の表示（読み取り専用に近い使い方も含む）。

**Do not use when**

- 単一の主アクション（Button を使う）。
- 排他選択でかつ強い構造的グループ表現が必要な場面（RadioGroup や SegmentedControl を検討）。
- 自由入力のテキストフィールドそのもの（Input を使う）。
- 完全に静的なラベル表示（Tag / Badge を使う。Chips はインタラクティブを前提とする）。

### User Mental Model

- 「短い値の塊」が並んでおり、押すと選ばれたり外れたりする、あるいは消せる。
- 1 つの Chip は 1 つの値・条件・属性を表す単位として読める。
- Chip 群は同じカテゴリの選択肢集合や、付与済み値の集合として理解される。
- アイコンが付随する場合は、その Chip が何を表すかを視覚的に補強する手がかりとして読まれる。

### Anatomy

- 必須: Container と Label。
- 任意: Leading Icon と Trailing Icon の 2 つのアイコンスロット（Figma の Chip は両側にスロットを持つ）。
  - Leading Icon は識別子として Label の意味を補強する。
  - Trailing Icon は用途に応じた付随表現で、取り消し（削除 / 閉じる）操作を載せる場合は本体の押下とは別個に発火する独立した操作領域とする。
- Container はピル形状（完全な角丸）。1 行で完結することを基本とする。
- Label と各アイコンは水平に等間隔で並ぶ。

### Content Model

- Label は短い名詞句、または短い条件表現。動詞句は避ける。
- 句読点を付けない。
- Label の長さが極端に長い場合は省略表示するか、そもそも Chip に乗せない。
- 動的なカウント値などを Label に含めても構わないが、構造は単一 Label として扱う。
- Leading Icon は Label の意味を補強する目的のみ。Label と矛盾する意味を持ってはいけない。
- Trailing Action のアクセシブルな名前は対象を明示する（例: "<Label> を削除"）。

### Layout And Density

- Container はピル形状（強い角丸）。
- 密度は Small / Medium / Large の 3 段階（Figma の Size 軸に一致）。
  - Small は高密度なフィルタ列・検索条件サマリ向け（マウス前提面）。
  - Medium は標準。フォーム内や一般的な選択肢列向け。
  - Large はユーザー選択肢を強調したい場面向け。
- 複数の Chip を並べる場合は、行折り返しを許容する Chip グループとして配置する。

### Accessibility Notes

- 選択モードは WAI-ARIA Button Pattern (toggle button, `aria-pressed`) または用途に応じ Checkbox / Radio セマンティクスに準拠。
- 取り消しモードの Trailing Action は独立した button として到達可能で、対象を含むアクセシブルネームを持つ（例: "<Label> を削除"）。
- 静的モードは操作要素として扱わず、フォーカス不可（Foundations の「すべてのインタラクティブ要素はアクセシブルネームを持つ」が適用されない非インタラクティブ要素）。
- 群として並べる場合は、Chip 群が何の選択かをアクセシブルなグループ名で伝える（呼び出し側の責務）。

## Spec

### Interaction Model

- Trailing Action は本体と独立にフォーカス可能で、本体の活性化とは別に発火する。

### State Model

Figma の Chip は Size × State のマトリクスを持ち、State は **Enabled / Hover / Focused / Active / Disabled** の 5 つ。各状態の視覚処理は Visual Semantics に定義する。状態の優先度は Disabled > Active(押下/選択) > Focused > Hover > Enabled。

- 用途モードによって持つ状態が変わる:
  - 選択モード: 5 state を「選択 / 非選択」両方について持つ。選択状態は Active の視覚処理（塗りつぶし）で恒常的に示す。
  - 取り消しモード: Trailing Icon（取り消し操作）側が独立して 5 state を持つ。本体側はモードの定義による。
  - 静的モード: **enabled / disabled の 2 状態のみ**（Foundations の 5 state 共通語彙からの逸脱）。フォーカス不可。

### Visual Semantics

- 視覚的重みは中庸〜控えめ。Button より弱く、Tag より操作可能性が強い。
- 状態ごとの視覚処理（Figma を正とする）:
  - **Enabled（非選択・既定）**: 最も淡い面（surface）＋細い前景色の輪郭＋前景色のラベル。控えめだが操作可能に見える。
  - **Hover**: 面にうっすらと層（surface container 相当）を重ねる。base fill は保つ。
  - **Focused**: 外周に強いフォーカスリング（ブランドのフォーカス色＝注意を引く赤系）を出す。塗り・ラベルは Enabled を保つ。
  - **Active（押下 / 選択）**: 最も強い**塗りつぶし**（最も濃い面）＋**反転ラベル**（面に対する前景）＋**ラベルを太字**にする。これが「押されている / 選ばれている」最強の強調。淡い tint では表さない。
  - **Disabled**: 面・ラベルとも減衰した色にし、操作不能を示す。
- 選択状態は「淡い背景 + 縁取り」ではなく、Active と同じ塗りつぶし＋反転＋太字で示す。
- カテゴリ別の色分けは原則導入しない（必要なら Open Question を立てる）。

### Variants And Options

- モードのバリアント:
  - 静的（属性ラベル表示）。
  - 選択（フィルタ / トグル）。
  - 取り消し（削除可能なタグ）。
- Leading Icon / Trailing Icon はオプション（両側に独立したスロット）。
- 単一選択 vs 複数選択は Chip 群側の運用ルールで決まるため、本コンポーネントは「選択 / 非選択」の 2 状態のみを持つ。
- 視覚的強調の差（強 / 弱）は Figma 上に存在しないため、本コンポーネントは視覚重みのバリアントを持たない。

### Open Questions

- Chip 群（ChipGroup）を別コンポーネントとして切り出すかどうか。
- 取り消しモードで本体押下に意味を持たせるか（例: 詳細表示）。
- Leading Icon にアバター等のリッチ表現を許容するか。
- 単独 Chip の最小タップ領域の扱い（不可視ヒット領域で拡張するか）。

### Acceptance Criteria

- AC-Chips-01: Container と Label を持ち、Leading Icon と Trailing Icon を任意で（両側独立に）配置できる。
- AC-Chips-02: 静的 / 選択 / 取り消し の 3 モードを意味として区別できる。
- AC-Chips-03: 選択モードは非選択 / 選択を視覚的に明確に区別し、**選択は塗りつぶし＋反転ラベル＋太字**（Active と同じ処理）で示す。淡い tint では示さない。（検証: Storybook）
- AC-Chips-04: Enabled は淡い面＋細い輪郭、Focused は強いフォーカスリング、Disabled は減衰色、と各状態が Figma の視覚処理に一致する。（検証: Storybook）
- AC-Chips-05: Size は Small / Medium / Large の 3 段階で、寸法・余白・アイコンサイズが密度ごとに一貫する。
- AC-Chips-06: 取り消しモードの Trailing Icon（取り消し操作）は本体と独立にフォーカス可能で、対象を含むアクセシブルネームを持つ。
- AC-Chips-07: 静的モードはフォーカス不可で、enabled / disabled の 2 状態のみを持つ。
- AC-Chips-08: 群として並べたとき、行折り返しに耐える。（検証: Storybook）
- AC-Chips-09: Foundations (`principles.md` / `accessibility.md`) の共通要件を、上記の逸脱（静的モードの状態数）を除いてすべて満たす。（検証: Foundations）
