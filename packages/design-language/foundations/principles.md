# Principles — orca Design Language

orca DS の設計原則。すべての component doc はこのファイルを暗黙の前提とし、
ここに書かれた一般原則は各 doc で繰り返さない。逸脱や追加判断のみ component doc に書く。

## 1. 意味で語る

- バリアント、state、サイズ、密度は**意味（役割）**で語り、見た目（色名・塗り方・形状名）で語らない。
- 例: ボタンの第一階層は「主アクション / 副アクション / 補助操作」と呼ぶ。
  `Filled` / `Outlined` / `Ghost` は実装上の識別子としては許容するが、
  ドキュメント・レビュー・議論では意味語で扱う。
- 見た目が同じでも意味が異なるなら別バリアントとする。意味が同じなら見た目が違っても同じバリアントとする。
- Figma の variant 名・レイヤー名をそのまま正としない。意味に翻訳してから doc に入れる。
  意味が説明できない variant や state は仕様にせず、`Open Questions` に残す。

## 2. token 経由のみ

- 色・寸法・角丸・タイポ・影・モーションはすべて `@orca/token-pipeline` 経由で参照する。
  生の HEX、px、ms、cubic-bezier をコンポーネント側にハードコードしない。
- `data-theme`（`light` / `dark`）と `data-color-system`（`default` / `corporate` など Color System の
  拡張）を独立に切り替えても破綻しないことを実装側で保証する。両軸の分岐は token 解決に閉じ込め、
  コンポーネント実装に持ち込まない。
- token に存在しない値が必要になった時点で、コンポーネントに足すのではなく
  token を追加する。

## 3. 語彙の安定性

- 同じ概念には同じ語を使う。語彙は orca DS 全体で共有する。
  - アクション階層: 主 / 副 / 補助
  - state: enabled / hover / active / focused / disabled
  - 密度: Small / Medium / Large（Medium がデフォルト）
- 新しい概念に名前を付ける時は、既存語彙と意味が重ならないかを先に確認する。

## 4. 逸脱は明示する

- 一般原則 (この principles.md と `accessibility.md`) から外れる扱いをするコンポーネントは、
  その doc に **逸脱として明記**する。暗黙の例外を作らない。
- 例: Pagination の Page Item は `disabled` 状態を持たない（5 state 共通語彙からの逸脱）。

## 5. プラットフォーム詳細は doc に書かない

- props、React 型、native DOM 属性、Tailwind クラス、`forwardRef`、`ReactNode`、`className` を
  component doc に書かない。component doc はプラットフォームに先行する意味仕様である。
- React 固有の判断は `packages/react/src/<Name>/<Name>.notes.md` に置く。
- Figma 上の実装事情、Storybook の暫定対応もここには書かない。

## 6. 標準パターン

- component doc は WAI-ARIA APG と HTML 標準が定義する振る舞いを前提とする。
- 標準パターンが提供する一般的な振る舞いは component doc に書かない。具体的には:
  - WAI-ARIA パターン実装 (ARIA 属性付与、role、状態の announce)
  - キーボード操作 (Tab / Enter / Space / 矢印 / Home / End / Escape の標準挙動)
  - フォーカス管理 (focus trap、focus restoration、roving tabindex)
  - Popover / Dialog の配置・スタッキング・Click outside・scroll lock
  - Transition の hooks 提供 (アニメーション本体はトークンと CSS で実装)
- doc には orca 固有の判断のみを書く:
  - 標準パターンからの **逸脱** (例: Esc の優先度を独自に定義する場合)
  - 採用する実装プリミティブの選択 (これは `notes.md` に置く)
  - 標準パターンではカバーされない **追加ケア**

## 7. SSOT は design-language

- `packages/design-language/components/<Name>/<Name>.md` がそのコンポーネントの SSOT。
- React 実装・Storybook story・Figma component は SSOT に従う。逆方向の依存を作らない。
- SSOT と実装が食い違った場合、原則として SSOT を正とする。
  実装側に正当な根拠があれば、SSOT を更新してから実装を直す。
