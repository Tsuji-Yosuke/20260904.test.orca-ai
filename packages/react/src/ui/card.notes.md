# Card implementation notes

実装・原典とこのメモが食い違う場合は、実装・原典を正とし、このメモを直ちに修正または削除する。

`packages/design-language/components/Card/Card.md`（status: ready、Figma node 9481:8874 実測）を
React へ写像するメモ。仕様の正は design-language。実装が安定したら削除してよい。

## React への写像

- `Card`（Root、常に `<div>`）+ `Card.Media` / `Card.Header` / `Card.Title` / `Card.Description` /
  `Card.Body` / `Card.Footer`。Context・状態は持たない（density variant が無いため）。
- Header Slot（40px、hasContextMenu 相当）は `Card.Header` の `action` prop で受け取る。既存コードベースの
  `leadingIcon` / `trailingIcon` / `trailingHint` と同じ「prop ベースの単一スロット」流儀に合わせた
  （子要素合成ではなく `Card.HeaderAction` のような追加コンポーネントは設けない）。
- `Card.Title` は `<h3>` 固定（原典 Open Question のまま。呼び出し側で別レベルが必要なら上書き可能）。
- Root は `overflow-hidden rounded-xl` で Media の角を clip。

## 実装判断

- ユーザー裁定により、旧実装にあった emphasis（outlined/elevated/filled）・size（sm/md/lg）・
  インタラクティブ化（href/onClick で a/button 化、hover/active ステートレイヤー、focus リング）を
  **3点とも削除**。Figma に定義が無いため。
- Header 内 gap（Text ブロック内 4px、Text ブロックと Header Slot 間 8px）は `gap-margin-*` ではなく
  `gap-padding-2xs` / `gap-padding-xs` を使用（ユーザー指示。Figma の spacing/padding/* に対応する
  既存トークンを使う）。
- Body（Content）/ Footer は Figma 上「自由スロット」としか規定されないため、flex レイアウトや gap を
  自前で追加しない（旧実装にあった `flex items-center gap-margin-sm flex-wrap` は発明のため削除）。
  padding 構造のみ提供する。

## Figma 差分の裁定（2026-08-07）

- 角丸: `sizing/radius/lg`（= 12px）で確定。実装は `rounded-lg`。旧 Figma の
  `border-radius/rounded-xl` = 14px はスケール外の孤立値だったため、Figma 側を
  `sizing/radius/lg` バインドに修正済み（ユーザー実施）。
- 背景: Figma 側を `base/card` から `UI/Surface` に修正済み（ユーザー実施）。実装は `bg-surface` のまま。
- Header の Text ブロック: Figma に合わせて fill（`flex-1 min-w-0`）。Title・Description は
  Text ブロック幅で折り返す。Figma の Title ノードの `whitespace-nowrap` は auto-width の
  産物であり、1 行固定にはしない（ユーザー裁定）。
- Figma テキストスタイルの `font-feature-settings: "palt"` は typography utility 全体の欠落
  であり Card のスコープ外。リポジトリ issue として記録。
