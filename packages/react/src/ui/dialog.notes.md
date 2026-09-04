# Dialog implementation notes

`packages/design-language/components/Dialog/Dialog.md`（status: ready、Figma node 9874:10911 で再構築済み）を
React へ写像するメモ。仕様の正は design-language。実装が安定したら削除してよい。

## 採用した実装プリミティブ

- **Base UI Dialog**（`@base-ui-components/react/dialog`）。focus trap / open・close 時のフォーカス移動と復帰 /
  Esc / 背景クリック / scroll lock / role=dialog・role=alertdialog を委譲。[[project_base_ui_allowed]]

## React への写像

- `Dialog`（Root）/ `Dialog.Trigger` / `Dialog.Content` / `Dialog.Title` / `Dialog.Body` / `Dialog.Footer` /
  `Dialog.Close`。**`Dialog.Description` は削除**（Figma に説明テキスト要素なし。ユーザー裁定）。
- 原典 Anatomy の「Header（Title + 右上 Close）」は専用コンポーネントを持たず、`Dialog.Title` 自身が
  Header の内側余白（pt-lg/pl-lg/pb-xs/pr-48相当）を持つ。Close は absolute で flow から外れるため、
  flow に残るのは実質 Title だけ、という判断（Header 専用スロットを増やす発明を避けた）。
- `Dialog.Content` が size・severity・closeLabel を受け取り、Portal > Backdrop > Viewport > Popup を内包。
  Popup 直下に Close（IconButton を `BaseDialog.Close` の `render` でラップ、常設・省略不可）と、
  size / Footer 有無を配下へ配る context を置く。
- `hasButton`（Figma 変量）は専用 prop を発明せず、`children` に `Dialog.Footer` が含まれるかを
  `Children.toArray` + 型参照で検出し、`Dialog.Body` の下端 padding（xs/lg）に反映する。
- Close Affordance は `IconButton`（ghost・circle）を再利用。small→`size="sm"`（40px・icon 16px）、
  large→`size="lg"`（56px・icon 24px、Figma は small のみ実測。IconButton の既存 lg icon サイズに委ねた）。
  アクセシブルネームは既定「閉じる」、`closeLabel` prop で上書き可能（国際化対応）。

## 実装判断

- Header 右 padding 48px に一致する `padding-*` token が無い（`padding-2xl`=40px, `padding-3xl`=64px）。
  実在する sizing primitive `--sizing-6xl`（48px）を `pr-[var(--sizing-6xl)]` で直接参照した
  （IconButton の `size-[var(--sizing-5xl)]` と同じ書き方。任意値の新規発明ではなく、既存 generated token
  の直接参照）。
- Close の絶対配置オフセット（右4px・上4px）も同様に `right-[var(--sizing-xs)]` / `top-[var(--sizing-xs)]`
  （`--sizing-xs`=4px）。
- Footer の gap 8px は `gap-margin-lg`（`--spacing-margin-lg` = `--sizing-sm` = 8px）。Tabs/旧 Dialog Footer が
  要素間ギャップに margin 系トークンを使う慣習に合わせた。
- Footer 内のボタン構成（small: 横並び / large: 縦積み・filled 上/outlined 下）は Dialog 側では強制せず、
  レイアウト（flex-row/flex-col・寄せ）のみ提供し、children の順序は呼び出し側に委ねる
  （原典 Open Questions で裁定済み）。

## 一時的な gap

- Container 幅上限（small=345px / large=1010px）はトークン未整備の Figma 実測値。`max-w-[345px]` /
  `max-w-[1010px]` のみユーザー裁定済みの任意値例外として使用。
- large Footer のボタン等幅は Figma 実測 592px（内容幅 962px の 61.5%）の1サンプルのみで固定/割合を
  判別できず、割合 60%（`[&>*]:w-[60%]` + `min-w-fit`）に丸めて暫定対応（ユーザー裁定 2026-07-15）。
  固定か割合かはデザイナー確認待ち（原典 Open Questions 参照）。
- vite の lib build で `@base-ui-components/react` は external 化。
