---
name: Checkbox
status: ready
layer: component
description: indeterminate を含む選択状態を扱うチェックボックス（Base UI ベース）。
sources:
  figma:
    # Checkbox（COMPONENT_SET）: Size（Small/Medium/Large = 20/24/28px）× State（Enabled/Selected/Hover/Active/Focused/Disabled-Enabled/Disabled-Selected/Indeterminate）の2軸、全24 variant。
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=11019-3024
  implementations:
    - packages/react/src/ui/checkbox.tsx
  storybook: []
---

# Checkbox

## Guide

### Purpose

- 1 項目の値を「オン / オフ」の二値、または集合の一部だけが選ばれている「一部選択（indeterminate）」の三値で示し、切り替える操作要素。
- 単体のフォームコントロールとしても、複数項目（テーブルの行など）を束ねる親チェックボックス（全選択トグル。一部だけ選ばれているときは indeterminate で示す）としても使える。
- 値の永続化・送信ロジック、選択結果を使った後続処理（一括操作など）は責務外。呼び出し側が持つ。
- ラベル文言そのものは内包しない。ラベルとの結び付けは外側の要素の責務（Content Model 参照）。

### Usage

**Use when**

- 1 項目の真偽値を切り替えるとき（設定のオン/オフ、同意チェックなど）。
- 複数項目からの複数選択（0 件〜全件）を扱うとき。
- 「全選択」チェックボックスのように、配下の一部だけが選ばれている状態を indeterminate で示す必要があるとき。

**Do not use when**

- 選択肢の中から必ず 1 つだけを選ばせる相互排他の選択（他候補を自動的に外す UI が要る場合。Checkbox は複数同時オンを妨げない）。
- 即時に実行される単発のアクション（ボタン相当の操作）。
- 状態を持たない一時的な確認 UI（ダイアログの確認ボタンなど）。

### User Mental Model

- 「四角い箱にチェックが入っていればオン、空ならオフ」と読む。
- 箱の中に横棒（マイナス）が入っていれば、「配下の項目が一部だけ選ばれている」中間状態として読む（全選択チェックボックスの定番表現）。
- 箱のどこをクリックしてもオン/オフが切り替わると期待する（チェックマークそのものだけが当たり判定ではない）。
- ラベル文言はチェックボックスの外側にあり、ラベルをクリックしても切り替わると期待する（結び付けは外側要素の責務）。

### Anatomy

- **Container**（必須）— 正方形のヒットエリア。Small/Medium/Large でサイズが変わる（Layout And Density 参照）。Hover / Active の state layer と Focused の共有 focus リングはこの Container 全体に対して描画される。
- **Box**（必須）— Container 中央に配置される、実際に見える正方形の箱。角は共通の radius-xs。チェック状態（Unchecked / Selected / Indeterminate）を表す唯一の視覚要素。
- **Mark**（Selected / Indeterminate のときのみ）— Box の中央に表示される記号。Selected はチェックマーク、Indeterminate は水平バー（マイナス記号）。両者は排他で同時に出ない。

順序: Container → Box → Mark（該当時）。Focused の共有 focus リングは最前面。

禁止:

- Box 内に Selected のチェックマークと Indeterminate のマイナス記号を同時に表示しない。
- ラベル文言を Container / Box 内部に描画しない（Content Model 参照）。

### Content Model

- Checkbox 自体はテキストコンテンツを持たない。値は checked（true/false）または indeterminate（mixed）の状態のみ。
- ラベルは外側の要素（フォームフィールド、テーブルのヘッダーセルなど）が提供し、アクセシブルネームとして関連付ける（Accessibility Notes 参照）。
- 国際化: ラベル文言側の責務であり、Checkbox 自体に翻訳対象コンテンツは無い。

### Layout And Density

- 密度は **Small / Medium / Large**（Figma 実測: Container 20/24/28px、token: sizing/component/half/{sm,md,lg}）。Medium を既定とする。
- Box は Container 中央に配置し、実寸は Small=14px / Medium=16px / Large=18px（Container との差 6px を Container のセンタリングで吸収）。
- 角丸は全サイズ・全 state 共通で radius-xs（Figma 実測: 2px）。

### Accessibility Notes

- role は checkbox。checked/unchecked/indeterminate をそれぞれ支援技術の checked=true/false、mixed 相当で伝える。
- Web 実装では、フォーム送信に参加するための native `<input type="checkbox">` を（視覚的には隠れていても）DOM 上に保持し、フォーム文脈・支援技術の双方から一貫して機能する土台とする。
- ラベルとの関連付け（`aria-labelledby` またはラベル要素での包含）を必須とする。ラベル文言が無いまま単体で使わない。
- キーボード操作は Tab で到達、Space でトグル。矢印キーでの項目間移動は持たない（Foundations の一般則からの逸脱ではなく、単一トグルとしての標準挙動）。
- disabled のときは支援技術にも操作不能であることが伝わる（フォーカス不可、または disabled 状態の伝達）。
- indeterminate はプログラムから明示的に設定できる必要がある（親チェックボックスが配下の一部選択を示す用途）。

## Spec

### Interaction Model

- ポインタ操作: Container のヒットエリア内であれば Box の外側をクリックしても checked / indeterminate をトグルする（当たり判定は Box だけに限定しない）。
- キーボード操作: Tab / Shift+Tab でフォーカス移動。Space キーで checked をトグルする（矢印キーでの項目間移動は持たない。単一のトグルとして完結する）。
- indeterminate は主にプログラム的に設定される状態（配下項目の一部選択を表す）であり、ユーザー操作が indeterminate へ直接遷移させる契機を Figma 上に持たない。ユーザー操作（クリック / Space）は checked の true/false のみをトグルする。
- disabled のときはポインタ・キーボードいずれの操作も受け付けない。

### State Model

Figma の Checkbox は Size × State（8 値の単一軸）で定義される。State は「値（checked-ness）」と「対話（hover 等）」を 1 本の軸にまとめたものであり、以下のように 2 つの意味グループに整理できる。

**値グループ**（Box の塗り・Mark を決める、相互排他）:

- Enabled — Unchecked。Box は塗りなし、outline 色の境界線のみ。
- Selected — checked。Box は brand-primary で塗りつぶし、on-primary 色のチェックマーク。
- Indeterminate — mixed。Box は brand-primary で塗りつぶし、on-primary 色の水平バー。

**対話グループ**（Container に重なる強調、値グループと直交する想定）:

- Hover — Container に弱い state layer（暗化オーバーレイ）。
- Active — Hover より強い state layer。
- Focused — Container を囲む共有 focus リング。

**Disabled 修飾**（値グループの一部にのみ Figma 上で明示）:

- Disabled - Enabled — Unchecked を disabled 色に差し替え。
- Disabled - Selected — Selected を disabled 色に差し替え。

優先度: Disabled（Hover/Active/Focused を無効化する）> Focused > Active > Hover。値グループ（Unchecked/Selected/Indeterminate）はこれらと独立して常に Box に反映される。

Figma の variant は Hover/Active/Focused を Unchecked の Box に対してのみ図示しており、Selected/Indeterminate と組み合わさったときの見え方、および Disabled × Indeterminate の組み合わせは図示されていない（Open Questions）。

### Visual Semantics

- Unchecked（Enabled）の Box は塗りを持たず、1px の outline 色境界線のみ（Figma 実測: `#a6a6a6` 相当）で「空の箱」を示す。
- Selected / Indeterminate の Box は brand-primary（Figma 実測: 黒）で塗りつぶし、Mark は on-primary（Figma 実測: 白）で描く。色の強い塗りが「選択されている」ことを唯一の手がかりにせず、チェックマーク／マイナス記号の形状差でも Selected と Indeterminate を区別する。
- Hover / Active は Container 全体に黒の半透明オーバーレイを重ねる state layer（Figma 実測: Hover 7.8%、Active 16.1% の黒不透明度）。Box の境界線色自体は変えない。
- Focused は Container を囲む 2px の共有 focus リング（Figma 実測: outline-focus 色 `#eb0a1e` 相当、spread 2px・offset 0・blur 0 の box-shadow 相当。他コンポーネントの共有 focus リング token と同じ表現）。
- Disabled は Box の境界線色・塗り色を disabled 系トークン（Figma 実測: `#dbdbdb` 相当）に差し替え、対話グループ（Hover/Active/Focused）の強調は出さない。
- 色だけで状態を区別しない（Unchecked/Selected/Indeterminate は形状差、Disabled はコントラスト低下と操作不能という複合的な手がかりを持つ）。

### Variants And Options

- **size**: Small / Medium / Large。密度のみの違い。
- **checked value**: Unchecked（false）/ Selected（true）/ Indeterminate（mixed）。相互排他の値状態。
- **disabled**: 値状態と直交する opt-in 修飾。操作不能化と視覚の弱色化を伴う。

### Open Questions

- Disabled × Indeterminate の視覚が Figma に無い。実装は Disabled-Selected の配色（disabled 塗り + on-primary 相当の Mark）に準じる暫定とし、正式確認が必要。
- Hover / Active / Focused が Selected / Indeterminate の塗りつぶし済み Box に重なったときの見え方（state layer をそのまま重ねてよいか）が Figma に無く、正式確認が必要。
- 単体利用時と、複数項目を束ねる「親（グループ全体を代表する indeterminate 対応チェックボックス）」として使われるときの意味上の違い（親子関係の伝達、グループ全体のアクセシブルネームなど）をどこまで design-language で規定するか。
- Checkbox とラベルの標準的な組み合わせ方（レイアウト、クリック領域の拡張）はフォームフィールド側のパターンに委ね、本文書の範囲外とする。
- 実装着手時に `packages/react/src/ui/checkbox.notes.md` へ移送: 採用プリミティブ（Base UI Checkbox root/indicator）、hidden input の扱い、indeterminate の伝播方法、Table の CheckBox セルとの統合方法。

### Acceptance Criteria

- AC-Checkbox-01: Container は Small / Medium / Large の 3 段階の密度を持つ。（検証: Storybook）
- AC-Checkbox-02: Box は Container 中央に配置され、サイズごとの実寸差を保つ。（検証: Storybook）
- AC-Checkbox-03: Unchecked（Enabled）の Box は塗りを持たず、境界線のみで表示される。（検証: Storybook）
- AC-Checkbox-04: Selected の Box は塗りつぶされ、チェックマークの Mark を表示する。（検証: Storybook）
- AC-Checkbox-05: Indeterminate の Box は塗りつぶされ、水平バーの Mark を表示し、Selected のチェックマークとは異なる形状で区別できる。（検証: Storybook）
- AC-Checkbox-06: Hover は Container に state layer（オーバーレイ）が加わる。（検証: Storybook）
- AC-Checkbox-07: Active は Hover よりも強い state layer が加わる。（検証: Storybook）
- AC-Checkbox-08: Focused は Container を囲む共有 focus リングを表示する。（検証: Storybook）
- AC-Checkbox-09: Disabled は境界線色・塗り色を disabled 系の弱色に差し替え、Hover / Active / Focused の強調を出さない。（検証: Storybook）
- AC-Checkbox-10: Disabled のとき、ポインタ操作・キーボード操作のいずれでも checked / indeterminate が変化しない。
- AC-Checkbox-11: Container のヒットエリア内であれば Box の外側をクリックしても checked がトグルする。
- AC-Checkbox-12: Tab でフォーカス移動でき、Space キーで checked をトグルできる。
- AC-Checkbox-13: 支援技術に checkbox role と checked / unchecked / indeterminate（mixed）の状態が伝わる。
- AC-Checkbox-14: ラベルは外部要素との関連付け（`aria-labelledby` 等）で提供され、Checkbox 自体はラベル文言を内包しない。
- AC-Checkbox-15: indeterminate はプログラムから明示的に設定でき、Selected とは排他の見た目で表示される。
- AC-Checkbox-16: 色・寸法・境界は token 経由で表現され、全テーマで破綻しない。（検証: Storybook）
