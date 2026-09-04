# Accessibility — orca Design Language

orca DS のアクセシビリティ共通要件。すべての component doc はこのファイルを暗黙の前提とし、
ここに書かれた一般要件は各 doc で繰り返さない。**逸脱・追加ケアのみ** component doc の
`Accessibility Notes` に書く。

## 1. 標準準拠の一括宣言

- orca DS は **WAI-ARIA Authoring Practices (APG)** と **HTML 標準のセマンティクス** に準拠する。
- React 実装で採用するプリミティブ（Base UI 等）は implementation notes で選ぶ。採用ライブラリにかかわらず、
  ARIA 属性付与・キーボード操作・フォーカス順序・状態の announce は標準パターンに従う。
- 各 component doc では準拠する WAI-ARIA パターン名のみを明示する
  （例: 「WAI-ARIA Tabs Pattern に準拠」「Combobox Pattern (List Autocomplete with Manual Selection) に準拠」）。
  パターン本文の引き写しは doc に書かない。
- 採用する実装プリミティブ (`Tabs`, `Select`, `Popover` 等) は `notes.md` に置く。
- 逸脱・追加ケアがある場合のみ component doc の `Accessibility Notes` に明示する。

## 2. 共通要件 (Universal)

以下はすべてのインタラクティブ要素で満たす。

### フォーカス
- `:focus-visible` はキーボード由来のフォーカスでのみ表示する。マウスクリックで
  フォーカスリングを出さない。
- フォーカスインジケータはコンポーネントの形状を辿らず、十分な視認性を持つ
  （周囲 2px 以上、コントラスト 3:1 以上）。

### コントラスト
- テキスト 4.5:1、アイコン・境界 3:1 を、すべてのテーマ × すべての state で担保する。
- token 設計でこれを保証し、各コンポーネントは token を経由する限り自動的に満たす。

### 色のみで状態を伝えない
- enabled / hover / active / focused / disabled、選択 / 非選択、正常 / エラーなどの区別を
  色だけで表現しない。形・位置・テキスト・アイコンを併用する。

### disabled
- disabled は支援技術にも「操作不可」として伝わる
  （`disabled` 属性または `aria-disabled="true"`、状況に応じて使い分ける）。
- disabled を色の薄さだけで示さない（コントラスト維持 + 形/テキストで補強）。

### モーション
- `prefers-reduced-motion: reduce` を尊重する。
  装飾的アニメーションは無効化、機能的トランジションは即時化または短縮する。

## 3. インタラクションの共通語彙

### キーボード
- 通常のフォーカス可能要素は **Tab で到達**、**Enter / Space で活性化** する。
- 矢印キー・Home / End・roving tabindex を使うパターン (Tabs、Pagination、Select、Sidebar など) は
  各 component doc で WAI-ARIA パターン名を指定する。パターン本文の引き写しは不要。
- Escape はモーダル・ポップオーバー・サジェストを閉じる。

### ポインタ
- 最小タップ領域 44px × 44px を Medium 以上で確保する。
  Small はマウス前提面 (テーブル・ツールバー等) に限定するか、不可視ヒット領域で 44px を補う。

## 4. 状態語彙とその ARIA 対応

### 5 state 共通語彙
- enabled / hover / active / focused / disabled
- 優先度: **disabled > active > focused > hover > enabled**
  （複数の state が同時に成立する場合、高い優先度のものを視覚的・意味的に正とする）

### ARIA 属性との対応
- `aria-disabled`、`aria-current`、`aria-selected`、`aria-expanded`、`aria-pressed`、
  `aria-checked` などの使い分けは各 WAI-ARIA パターンに従う。
- 逸脱（例: Pagination の Page Item は disabled を持たない）は component doc に明記する。

## 5. 密度語彙

- **Small / Medium / Large** の 3 段階を共通語彙とする。**Medium がデフォルト**。
- 各サイズの最小高さ・パディング・タイポは token で定義する。
- Small はマウス前提面に限定するか、ヒット領域を 44px に拡張する。

## 6. 名前付け (Accessible Name)

- すべてのインタラクティブ要素はアクセシブルネームを持つ。
- アイコン単独で意味を担う要素（IconButton 等）は、視覚ラベルがなくても
  支援技術が認識できる名前を持つ（`aria-label` / `aria-labelledby` / 視覚的に隠したテキスト）。
- アクセシブルネームの提供方法は実装側 (`<Name>.notes.md`) で扱う。doc 側ではネームの**必須性**のみ書く。

## 7. ライブリージョン

- 結果件数の動的変化、エラーの非同期表示、トーストなど、視覚的に出現する情報は
  支援技術にも伝える（`aria-live` / `role="status"` / `role="alert"`）。
- 個別の使い方は該当 component doc に書く。
