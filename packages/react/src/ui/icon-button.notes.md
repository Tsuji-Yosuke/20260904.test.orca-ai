# IconButton implementation notes

この文書は `packages/design-language/components/IconButton/IconButton.md`（status: ready）を
React 実装へ写像するためのメモであり、意味仕様そのものではない。仕様の正は design-language 側に置く。
実装が安定したら削除してよい。

## React への写像

- `variant="primary" | "secondary" | "ghost"` … 視覚的重み3段階（強調 / 副次 / 補助）。
  Figma の `Filled` / `Outlined` / `Ghost` に対応。Button と同じ色トークンを使う。
- `shape="rounded" | "circle"` … 形状2種。`rounded`（角丸矩形、既定）は組み込み型、
  `circle` はフローティング型。`rounded-md` / `rounded-full` に写像。
- `size="sm" | "md" | "lg"` … 密度3段階。
- `label`（必須 string）… 可視ラベルが無いため accessible name を型で強制する。
  `aria-label` に写像。`aria-label` は props から除外し、`label` 経由のみ受ける。
- `icon`（必須 ReactNode）… 単一アイコン。`aria-hidden` の wrapper に入れ、
  `size-icon-*` でサイズを担保。渡された node には className を注入しない。
- トグル/選択状態は持たない（`aria-pressed` を出さない）。disabled は native `disabled`。

## 実装判断

- variant ごとの色・hover/active layer・focus outline・disabled は Button の確立パターンを踏襲。
- 正方形コンテナは固定 `height` ではなく `icon size + 対称 padding` で構成する。

## 寸法（Figma 照合済み）

- Figma の IconButton（Common UI Kit Web, node-id=10996-24982）はコンテナが**固定正方**:
  Small **40** / Medium **48** / Large **56**（角丸・円形 Circle とも同寸）。アイコンは 16 / 20 / 24。
- 実装は `size-[var(--sizing-5xl|6xl|7xl)]`（= 40/48/56）で固定正方として再現。padding 積み上げでは
  Medium=48 を作る 14px トークンが無いため、IconButton では固定正方が忠実かつ正しい（icon-only の意図寸法）。

## 一時的な gap

- 円形バリアントの推奨密度・最小タップ間隔は CSS の責務外（利用側レイアウトで担保）。原典の
  「隣接最小間隔」は単体コンポーネントでは強制しない。
