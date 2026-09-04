# Pagination implementation notes

`packages/design-language/components/Pagination/Pagination.md`（status: ready）を React へ写像するメモ。
仕様の正は design-language。実装が安定したら削除してよい。

## React への写像

- `count`（総ページ数）/ `page`（controlled）/ `defaultPage`（uncontrolled）/ `onPageChange(next)`。
  原典 Open Question の「制御/非制御の両モード」を実装。
- 省略ロジックは純粋関数 `getPaginationItems({page, count, siblingCount, boundaryCount})` に分離
  （`number | "ellipsis"` を返す）。原典 Open Question の「Page Item 集合計算のピュア関数化」を実装。
  既定 `siblingCount=1` / `boundaryCount=1`。隙間が1ページ分の側は ellipsis でなく番号を出す。
- `nav` ランドマーク + `label`（既定「ページネーション」）。roving tabindex は使わず、各コントロールは
  個別 button/link として Tab 到達（原典準拠）。
- Page Item は `disabled` を持たない。`current` は `aria-current="page"` の button で、押下は no-op
  （`goTo` が同一ページを弾く → 二重遷移しない）。
- Previous/Next は端で **描画しない**（aria-disabled を残さない）。First/Last は `showEndpoints` で opt-in、
  同様に端で対応方向を描画しない。
- `getHref` を渡すと Page Item / コントロールを `<a href>` で描画（原典の navigation form variant）。
  既定は `<button>`。
- 矢印は `rtl:rotate-180` で書字方向に反転（原典「書字方向に応じて反転」）。

## 実装判断

- `current` の確定ビジュアル（原典 Open Question）は **塗り強調**（bg-primary / on-primary / bold）を既定採用。
- コントロール/Item の寸法は単一サイズ（原典の density 逸脱）。`size-component-full-md`（32px）の正方形。

## 一時的な gap（要 Figma 照合）

- Pagination の Figma Doc ノード（1722-18964）はセルが空のテンプレートで、**実インスタンスの色・寸法・
  current の見た目が取得できなかった**。ただし軸ラベルから State Model は確認済み
  （Item: Enabled/Hover/Focused/Active、Disabled なし／Unit: first/middle/last page）。
  current の塗り色・正方形寸法・hover/active layer は semantic token で暫定実装。Figma 実インスタンス取得後に照合する。
- 大規模ページ数の省略境界（両端固定数・近傍表示数）は `siblingCount`/`boundaryCount` で調整可能とし、
  既定値のみ提供。Truncation Indicator は非クリッカブル（原典 Open Question の既定判断）。
