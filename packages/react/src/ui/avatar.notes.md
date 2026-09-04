# Avatar implementation notes

`packages/design-language/components/Avatar/Avatar.md`（status: ready）を React へ写像するメモ。
仕様の正は design-language。実装が安定したら削除してよい。

## 採用した実装プリミティブ

- **Base UI Avatar**（`@base-ui-components/react/avatar`）の Root / Image / Fallback。
  画像の読み込み状態（loading / loaded / error）に応じた Image↔Fallback の切替を委譲。[[project_base_ui_allowed]]

## React への写像

- `src` / `name` / `size`（sm/md/lg）/ `fallback` / `decorative`。**`shape` は無い**（2026-07-14 ユーザー裁定により円形のみ。経緯は下記）。
- アクセシブルネーム: Root に `role="img"` + `aria-label={name}` を付与し、画像成否によらず name を
  支援技術へ届ける。`decorative` のときは `role` を外し `aria-hidden`（隣接ラベルとの重複読み上げ回避）。
- Fallback は `fallback` 指定があればそれ、無ければ `name` から `initialsFromName` でイニシャル導出
  （空白複数→各先頭、単一トークン→先頭2文字、CJK 単一トークンは先頭2文字）。
- Image は `object-cover` で 1:1 の枠を満たす。Image / Fallback とも `aria-hidden`（name は Root が担う）。
- 非インタラクティブ。操作可能化は外側要素に委ねる（原典どおり）。

## サイズ・色・タイポの token 対応

Figma（node 7566:464、`get_variable_defs` で実測）と `tailwind-tokens.css` を突合した対応:

| 用途 | Figma variable | token utility |
| --- | --- | --- |
| 寸法 sm/md/lg | Sizing/Component/Full/{sm,md,lg} = 40/48/56px | `size-component-full-{sm,md,lg}` |
| 形状 | Sizing/Radius/full（全 variant 共通） | `rounded-full` |
| ボーダー太さ | Sizing/Border/md = 2px | `border-md` |
| ボーダー色 | Brand/White | `border-white` |
| Fallback 背景 | UI/SurfaceDim（実測 #dbdbdb。ピクセル計測で確認、`bg-surface-container` ではない） | `bg-surface-dim` |
| イニシャル色 | Brand/Primary | `text-primary` |
| イニシャルのタイポ | Standard/Title/{Small,Medium,Large}（`lineHeight: 1.6` = 160%、`typography-standard-title-*` と一致。`typography-tight-title-*` ではない） | `typography-standard-title-{small,medium,large}` |

Fallback 背景の token（`bg-surface-dim`）は、実装当初の `Avatar.md` Visual Semantics の文言
「Brand/Primary 系の面色」とは一致しなかった（実測は中立グレー）。Step2 実装時点では
`get_design_context` / `get_variable_defs` によるピクセル計測を優先し、確認を経ずに原典の当該記述を
不正確と判断してしまった。これはルート CLAUDE.md の裁定ルール（Figma・design-language・実装・
Storybook 間の齟齬はユーザーに確認する）違反であり、コードレビューで指摘を受けて是正した。
`Avatar.md` Visual Semantics は実測に合わせて訂正済みだが、正式なデザイナー確認はまだ得ていない
旨を `Avatar.md` Open Questions に明記してある。次回のデザインレビューでの確認待ち。

## 修正した既知バグ（このコミットで解消）

- サイズ指定が Tailwind 生数値スケール `size-32/40/48`（128/160/192px に解決）になっており、
  token 未使用だった。`size-component-full-{sm,md,lg}` に修正。
- `shape`（circle/rounded）prop と `rounded-md` 分岐が存在したが、Figma に角丸矩形 variant は無い
  （円形のみ）。2026-07-14 ユーザー裁定により `shape` prop を削除。要望が出れば Figma へ逆提案。
- 常設の 2px 白ボーダーが無かった。`border-md border-white` を追加。
- イニシャル色が `text-on-surface-dim`（中立トーン）になっていたが、Figma 実測は `Brand/Primary`。
  `text-primary` に変更。タイポも `typography-tight-body-*`（暫定）から `typography-standard-title-*`
  （Figma 実測と一致）に変更。

## AvatarUnit

- 複数の Avatar を横一列に負マージンで重ねる正式なグループ表示コンポーネント（Figma node 9005:9563）。
- 重なり量: `--spacing-margin-xl` = `--sizing-md` = 12px（Figma 実測: 40px Avatar 同士で -12px）。
  実装は `children` を clone せず、コンテナに `[&>*:not(:first-child)]:-ml-margin-xl` という
  子孫セレクタの Tailwind arbitrary variant を当てる（`Search.tsx` の `[&:hover:...]` と同じ手法）。
  こうすることで children の中身が Avatar かどうかを問わず、先頭以外全てに -12px の負マージンが乗る。
- Figma の実データは各 Avatar（最後を除く）に `margin-right: -12px` を付けているが、通常の DOM 順
  ペイント（後続要素が先行要素より手前に描画される）の下では `margin-left` を後続に付けても同じ
  視覚結果になるため、Tailwind の慣用に合わせて `-ml-margin-xl` を採用した。
- 各 Avatar 自身の常設白ボーダーが重なりの境界を作るため、AvatarUnit 側に専用の区切り線は無い。
- レイヤー順序（先頭が最前面か最背面か）は Figma のレイヤー順（先頭が最背面、後続が前面）に合わせた。
  グループ全体のアクセシブルネームや +N 残数表示は原典 Open Questions のまま未サポート
  （呼び出し側が `role`/`aria-label` を渡せるようにするに留めた）。

## 一時的な gap（要 Figma 照合）

- プレゼンス/ステータスバッジ、AvatarUnit の +N 残数表示は原典 Open Questions のまま。
- jsdom では画像 load イベントが発火しないため、画像成功表示は単体テストせず Base UI に委ねる。
- vite の lib build で `@base-ui-components/react` は external 化。
