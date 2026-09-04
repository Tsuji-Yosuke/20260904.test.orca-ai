---
name: Button
status: ready
layer: component
description: primary / secondary / ghost と 3 サイズ、前後アイコンを備えたボタン。
sources:
  figma:
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=1188-1293&m=dev
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=1186-1331&m=dev
  implementations: []
  storybook: []
---

# Button

## Guide

### Purpose

- ユーザーが明示的な操作を起こすためのトリガー要素。
- 押下によって状態変化・送信・確定などの「行為」を文脈内で実行することに責務を持つ。
- ページ遷移（URL 移動）そのものは解決しない。リンク的振る舞いは TextLink / anchor 系コンポーネントに委ねる。

### Usage

**Use when**

- ユーザーがその場で実行する操作（保存、送信、開始、確定、キャンセル、戻る等）の主な入口。
- ダイアログやフォームの確定／取り消しなど、結果が文脈内で完結するアクション。
- 1 画面内で行為の優先順位（主アクション / 副アクション / 補助的な選択肢）を視覚的に示したい場面。

**Do not use when**

- URL 遷移が主目的のとき（TextLink / anchor を使う）。
- 単一アイコンだけで意味が通じる密度の高い UI（IconButton を使う）。
- 選択肢の中から状態を選ばせる用途（Chips / RadioGroup などを使う）。
- 文章中のインライン操作（TextLink を使う）。

### User Mental Model

- 「ここを押すと、いま見ている文脈の中で何かが起きる」と即座に理解できる対象。
- 視覚的重みの差から、推奨される選択肢（主アクション）と並置される副次的な選択肢を直感的に判断できる。
- 押下に対し即時の視覚フィードバックがあり、押せる / 押せないが視覚で区別できる。

### Anatomy

- 必須: Container と Label。
- 任意: Leading Icon、Trailing Icon。
- 順序: Leading Icon → Label → Trailing Icon を水平方向に並べる。
- Label は 1 行で表現することを基本とする（折り返しを意味的に許容しない）。
- アイコンのみで Label を持たない構成は禁止（その用途は IconButton）。

### Content Model

- Label は短い命令形の動詞句、または操作対象を示す名詞句。
- 句読点（「。」「、」）を付けない。
- アイコンは Label の意味を補強する目的のみ。アイコンが Label と矛盾する意味を持ってはいけない。
- ローカライズで Label が伸びても 1 行を維持する想定。極端に長い文言はそもそも Button に乗せない（操作名を見直す）。
- 動的な値（カウント等）を Label に含める場合も、構造としては単一の Label とみなす。

### Layout And Density

- 横幅は Label とアイコンに応じた intrinsic を基本とする。コンテナ幅に揃える用途は呼び出し側で決める。
- Medium / Large は通常のポインタ操作とタッチ操作の入口として使える密度とする。
- Small は高密度なマウス前提面（テーブル、ツールバー、管理画面内の反復操作など）に限定する。Small をタッチ中心の主要操作として使わない。
- Small の視覚サイズを保ったままタッチ操作を成立させたい場合は、Button 自身の不可視ヒット領域ではなく、配置側の余白や行高で操作領域を確保する。

### Accessibility Notes

- WAI-ARIA Button Pattern に準拠。
- リンク的用途には使わない。アクセシブルネームは可視 Label をそのまま使う。
- HTML 実装では native `<button>` を基本とする。無効化には native `disabled` を使い、同じ意味の `aria-disabled` を重複して付与しない。
- Leading / Trailing アイコンは Label の補助であり、アクセシブルネームに混ぜない。

## Spec

### Interaction Model

- Pointer と keyboard の両方で操作でき、押下に対して即時の視覚フィードバックを返す。
- Focused は独立した状態として扱う。hover や active と同時に成立しても、キーボードフォーカスの視覚信号が失われてはいけない。
- 無効状態では pointer / keyboard のどちらでも activate されない。
- Foundations の共通要件に準拠する。

### State Model

- loading 状態は本コンポーネントの責務に含めない（必要であれば呼び出し側で表現する）。
- 必須状態は Enabled、Hover、Active、Focused、Disabled。
- Disabled は単純な opacity だけで表現せず、無効状態として読める専用の色・輪郭・前景表現を使う。

### Visual Semantics

- 視覚的重みは 3 段階あり、アクションの重要度に応じて使い分ける。
  - 最も強い視覚重みのバリアントは主アクション用。背景塗りで強いコントラストを持つ。
  - 中間の視覚重みのバリアントは副アクション用。背景塗りを持たず輪郭で示し、主アクションと並置できる。
  - 最も弱い視覚重みのバリアントは補助操作用。背景も輪郭も持たず、密度の高い面や反復出現する操作に使う。
- 主アクションは 1 画面 1 件を推奨する。
- 危険を伴う操作（destructive）の視覚表現は本ドキュメント時点では未定義（Open Question）。

### Variants And Options

- 視覚的重みのバリアントは 3 段階で、意味で語る:
  - 主アクション用（最も強い視覚重み、1 画面 1 件を推奨）。
  - 副アクション用（輪郭ベース、主アクションと並置可能、視覚重みは明確に下）。
  - 補助操作用（背景・輪郭を持たず密度の高い面で使う）。
- Leading / Trailing アイコンの有無は variant ではなくオプションとして扱う。
- Figma の `Filled` / `Outlined` / `Ghost` は塗り方の表現であり、意味としては上記 3 段階に対応する。実装 identifier として採用しても良いが、ドキュメント・レビューでは必ず「主 / 副 / 補助」の意味で議論する。

### Open Questions

- 危険操作（destructive）用のバリアントを Button が担うか、別コンポーネント化するか（Figma 上にも未定義）。
- Figma の Small / Medium variant が持つ min-width（32 / 38px）の意味づけは未定義。Label 必須・icon-only 禁止の本仕様では実質発動しない制約とみなし、実装には写していない（ユーザー裁定 2026-08-07）。

### Acceptance Criteria

- AC-Button-01: Container と Label を持ち、Leading / Trailing アイコンを任意で配置できる。
- AC-Button-02: 主 / 副 / 補助 の 3 バリアントを意味として区別でき、視覚的重みが 3 段階で逓減する。
- AC-Button-03: Hover / Active / Focused / Disabled の各状態を持ち、Focused は他の pointer 状態と重なっても識別できる。（検証: Storybook）
- AC-Button-04: Disabled は pointer / keyboard のどちらでも activate されず、HTML 実装では native `disabled` として観測できる。
- AC-Button-05: Leading / Trailing アイコンがあっても、アクセシブルネームは可視 Label から解決される。
- AC-Button-06: loading は Button の責務外である。（検証: 対象外）
- AC-Button-07: Foundations (`principles.md` / `accessibility.md`) の共通要件をすべて満たす。（検証: Foundations）
