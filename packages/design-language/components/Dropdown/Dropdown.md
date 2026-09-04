---
name: Dropdown
status: ready
layer: component
description: トリガーとメニュー項目からなるドロップダウンメニュー（Base UI Menu ベース）。
sources:
  figma:
    # _Dropdown/Menu（トリガー）。COMPONENT_SET: Size Small/Medium/Large × State
    # Enabled/Hover/Active/Focused/Expanded。
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=10088-9565
    # _Dropdown/Menu/MenuUnit（Menu Surface）。Number 1〜8 の縦積みのみのバリエーション。
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=10284-30563
    # _Dropdown/Menu/MenuItem。Show Leading Icon / Show Trailing Icon boolean ×
    # State Enabled/Hover/Active/Focused/Disabled。
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=7574-1729
  implementations: []
  storybook: []
---

# Dropdown

## Guide

### Purpose

- 単一のトリガーから、列挙可能なコマンド（操作）の一覧を一時的に開き、1 つを選ばせる複合コンポーネント。
- トリガーは size / label / leading icon / trailing icon で構成される決まった形のボタンであり、任意の要素を差し込めるものではない。
- 開いた一覧（Menu Surface）は、単一種類のコマンド項目（Menu Item）を縦に並べるだけの面である。
- フォームの値選択・保持は責務外（Select）。自由入力は責務外（Search）。常設ナビゲーション（Sidebar / Tabs）の代替ではない。

### Usage

**Use when**

- 1 つのトリガーに、関連する複数のコマンド（編集 / 複製 / 削除 など）をまとめたいとき。
- ツールバーやテーブル行の操作メニュー。

**Do not use when**

- フォーム項目の値選択（Select を使う）。
- 自由入力 + 候補（Search を使う）。
- 常設の主要ナビゲーション（Sidebar / Tabs）。
- 単一の操作（Button を直接置く）。
- 選択状態の保持やトグルが必要なとき。Menu Item は実行専用のコマンドで、選択を保持しない。

### User Mental Model

- 「トリガーを押すとコマンドの一覧が下に開き、選ぶとその操作が実行されてメニューは閉じる」と認識する。
- Menu Item はすべて同じ種類の「実行すると閉じるコマンド」であり、選んでも状態を保持したり、他の項目と排他になったりしない。
- 閉じている間はトリガーの Label だけが見え、現在の選択値を表示する場所ではない（Select との違い）。

### Anatomy

- **Trigger**（Figma: `_Dropdown/Menu`）— 固定構成。任意の Leading Icon + 必須の Label（flex-1）+ 任意の Trailing Icon。size と開閉状態を持つ。
- **Icon Trigger** — [IconButton](../IconButton/IconButton.md) をそのままメニューの開閉ボタンとして使う、
  もう 1 つのトリガー。一覧のカードや行に置く「…」メニューのように、文字ラベルを置く場所が
  無いところで使う。見た目・大きさ・アクセシブルネーム必須の決まりは IconButton の仕様に従い、
  開閉の振る舞い（Menu Button Pattern）は Trigger と同じ。
  Figma にも専用の部品は無く、デザイナーも IconButton とメニューの組み合わせで画面を
  作っている（issue #47 で確認）。
- Dropdown は Trigger か Icon Trigger のどちらかを必ず 1 つ持つ。
- **Menu Surface**（open 時のみ存在、Figma: `MenuUnit`）— Menu Item を縦に並べるだけの面。見出し・区切り線・空表示・フッターは持たない。
- **Menu Item**（1 つ以上、Figma: `MenuItem`）— 任意の Leading Icon + 必須の Label + 任意の Trailing Icon。disabled になりうる。実行すると操作が発火しメニューを閉じる、単一種類の項目。

順序: Trigger 押下で Menu Surface を直下に開く。Menu Surface 内は Menu Item を縦に並べる。

禁止:

- Menu Item にトグル（チェックボックス的）や排他選択（ラジオ的）の種類を作らない。単一種類のみ。
- Menu Surface に見出し（Group Label）・区切り線（Separator）・入れ子メニュー（サブメニュー）を持たない。
- Menu Item に破壊的操作専用の意味色バリアントを持たせない。危険性の強調が必要な場合は呼び出し側が Label / Icon の内容で表現する。
- Trigger に任意の要素を差し込めるようにしない。Leading Icon / Label / Trailing Icon の決まった形に従う。
  Icon Trigger も IconButton を使う場合に限る。任意の要素をトリガーにできるようにするものではない。

### Content Model

- Trigger の Label は必須。コマンド一覧を代表する短い語句（例:「アクション」「その他」）。
- Trigger の Leading / Trailing Icon は装飾または意味の補助であり、単独では意味を持たない（Label が必須のため）。
- Menu Item の Label は操作を表す短い動詞句（「複製」「削除」）。1 行表示で長い場合は省略（truncate）する。
- Menu Item に説明文・メタ情報・ショートカット表示のスロットは持たない。
- 国際化: Trigger Label、Menu Item Label、両者のアクセシブルネームは翻訳対象。

### Layout And Density

Popover / Menu の標準的な配置・スタッキング・スクロールに準拠する。orca 固有の追加判断のみ記述する。

#### Trigger

- 高さは size 3 段階で固定（Small 40 / Medium 48 / Large 56）。1 行固定。
- Leading / Trailing Icon のサイズは size に連動する（16 / 20 / 24）。
- 横幅はコンテンツ・呼び出し側に従う流動幅。Dropdown 側で固定幅を強制しない。

#### Menu Surface

- Trigger 直下に一定の gap を空けて開く。幅は Trigger の描画幅を下限として内容幅に追従する
  （Icon Trigger のような幅の狭いトリガーでも Menu Item が潰れない）。
- 内側に padding を持たない。Menu Item 自体が padding を持つ。
- 項目が多い場合は視口に応じてスクロールする。

#### Menu Item

- 高さは 40px 固定。Trigger の size に連動しない（Trigger が Large でも Menu Item は常に同じ高さ）。

### Accessibility Notes

- **WAI-ARIA Menu Button Pattern** に準拠（Trigger の `aria-haspopup` / `aria-expanded`、Menu Surface の `role="menu"`、Menu Item の `role="menuitem"`）。Figma 上に視覚的な裏付けがなくても、この意味付けとキーボード操作（矢印 / Home End / type-ahead / Esc / Enter Space / フォーカス復帰）は実装で維持する。
- Trigger のアクセシブルネームは Label が担う。Leading / Trailing Icon は装飾として扱う。
- Disabled な Menu Item は支援技術にも操作不可として伝える。

## Spec

### Interaction Model

WAI-ARIA Menu Button Pattern の標準挙動（トリガーの開閉、矢印キーでの項目移動、Home/End、type-ahead、Esc で閉じる、Enter/Space で実行、選択後にフォーカスをトリガーへ戻す）に準拠する。Figma にこれらの挙動の視覚的裏付けがなくても、意味付けとキーボード操作は標準パターン通り維持する。orca 固有の追加判断のみ記述する。

- Menu Item を実行すると常にメニューが閉じる。トグルや排他選択の項目種別を持たないため、閉じない実行は存在しない。
- Disabled な Menu Item は実行できず、type-ahead / 矢印移動でも活性対象から除外される（標準パターン）。

### State Model

#### Trigger

- 状態: Enabled / Hover / Active（押下中） / Focused / Expanded（Menu Surface が開いている間）。
- 5 state 共通語彙（enabled/hover/active/focused/disabled）のうち disabled は持たない（5 state 共通語彙からの逸脱）。Trigger を無効化する必要が生じた場合は Open Questions で扱う。
- Expanded は共通語彙に無い Trigger 固有の状態で、開いている間は他の見た目より優先して描画する。Figma の State 軸は単一選択のため、Expanded と Hover/Active/Focused を同時に描き分けない。

#### Menu Item

- 5 state 共通語彙（enabled/hover/active/focused/disabled）にそのまま従う。優先度は共通語彙の既定（disabled > active > focused > hover > enabled）。
- Active は Select の Item のような永続的な選択済み表現ではなく、実行瞬間の一時的な押下フィードバックである。Menu Item は値を保持しないコマンドのため。
- Disabled は背景を変えず、Label とアイコンの文字色のみ弱める。

### Visual Semantics

#### Trigger

- Enabled は枠線のない面。
- Hover / Active は黒の半透明レイヤーの重畳で押しやすさを示す。重畳の濃さで Hover と Active を区別する。
- Focused は共有 focus リング（focus-visible のみ）。
- Expanded は Menu Surface と視覚的に連続する面として描画する。具体の差分は Open Questions 参照。

#### Menu Surface

- 1px の輪郭線と角丸を持つ面で、影は持たない。Trigger との視覚的連続性を優先し、浮遊感の強い影は使わない。

#### Menu Item

- Enabled は面と同化する背景。
- Hover / Active は黒の半透明レイヤーの重畳で区別する。
- Focused は共有 focus リング。
- Disabled は背景を変えず、文字とアイコンのみ弱色にする。色のみに頼らない原則は、disabled がクリック不能という機能面でも判別できることで満たす。

### Variants And Options

- **size**: Small / Medium / Large。Trigger の高さ（40/48/56）とアイコンサイズ（16/20/24）に連動する密度差で、機能差は持たない。
- **leading icon / trailing icon**: Trigger と Menu Item はそれぞれ独立に任意で持てる。
- **disabled**: Menu Item のみが持つ。Trigger は持たない。

### Open Questions

- Trigger の disabled 状態: Figma component set に無い。必要になった場合、5 state 共通語彙からの逸脱として追加するかをデザイナーと合意する。
- Trigger の Expanded 状態の具体的な視覚差（Enabled や Active とどう違うか）は実測範囲外。実装着手前に Figma で個別確認する。
- Trigger の横幅の既定値（コンテンツ追従 / 呼び出し側指定の使い分け基準）。
- Menu Surface の最大表示件数・スクロールのしきい値。
- 実装着手時に `packages/react/src/ui/dropdown.notes.md` へ移送: 採用する実装プリミティブ（Base UI Menu）、Portal/Positioner 構成、controlled/uncontrolled、既存実装（CheckboxItem/RadioGroup/RadioItem/Group/Label/Separator/destructive/submenu）の削除方針。

### Acceptance Criteria

- AC-Dropdown-01: Trigger で開閉でき、open 時のみ Menu Surface が存在する。
- AC-Dropdown-02: Menu Item は leading icon（任意）+ label（必須）+ trailing icon（任意）+ disabled（任意）のみを持つ単一種類で、チェックボックス / ラジオ / グループ見出し / 区切り線 / サブメニューを持たない。（検証: Storybook）
- AC-Dropdown-03: Menu Item を実行すると対応する操作が発火し、メニューが閉じてフォーカスが Trigger へ戻る（標準パターン）。
- AC-Dropdown-04: Disabled な Menu Item は実行できない。
- AC-Dropdown-05: 矢印キー / Home/End / type-ahead / Esc が標準パターン通り働く。
- AC-Dropdown-06: Trigger の size（sm/md/lg）は高さ 40/48/56 の 3 段階として区別できる。（検証: Storybook）
- AC-Dropdown-07: Trigger は leading icon（任意）+ label（必須、flex-1）+ trailing icon（任意）の構成を持つ。（検証: Storybook）
- AC-Dropdown-08: Menu Item は高さ 40px 固定で、Trigger の size に連動しない。（検証: Storybook）
- AC-Dropdown-09: Menu Item の 5 状態（enabled/hover/active/focused/disabled）が視覚的に区別できる。（検証: Storybook）
- AC-Dropdown-10: Menu Surface は Trigger 直下に gap を空けて開き、Trigger の描画幅を下限として内容幅に追従し、1px の輪郭線・角丸を持ち影を持たない（Icon Trigger のような幅の狭いトリガーでも Menu Item が潰れない）。（検証: Storybook）
- AC-Dropdown-11: Trigger のアクセシブルネームは label により提供される。
- AC-Dropdown-12: 色・寸法・角丸・影は token 経由で、全テーマで破綻しない。（検証: Storybook）
- AC-Dropdown-13: Icon Trigger は IconButton の見た目・寸法のまま Menu を開閉でき、開閉状態が支援技術に通知され、アクセシブルネームを必須とする。
