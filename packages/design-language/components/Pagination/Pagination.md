---
name: Pagination
status: ready
layer: component
description: 省略記号を含むページ番号ナビゲーションと、その項目計算のピュア関数。
sources:
  figma:
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=1487-6999&m=dev
  implementations: []
  storybook: []
---

# Pagination

## Guide

### Purpose

- ページ分割された一覧の中で、ユーザーが任意のページへ移動できることを保証するナビゲーション。
- 現在地（いま何ページ目か）と全体規模（何ページあるか）を把握できることを併せて担保する。
- 並び替えやフィルタ、ページサイズ変更そのものは責務外。隣接 UI と連携する。

### Usage

**Use when**

- 結果集合が静的に分割されていて、件数または総ページ数を事前に確定できる一覧。
- ユーザーが特定ページに直接ジャンプしたい、または現在の進捗を把握したいケース。
- テーブルやリストで全件読み込みが現実的でない規模のとき。

**Do not use when**

- 連続スクロールが体験上自然なフィード／タイムライン系。Infinite Scroll を使う。
- 総件数を事前に把握できない / 重い場合。Load More パターンを検討する。
- 全件が一画面に収まる規模。ページャは出さない。
- 順序関係のあるステップ移動。Stepper を使う。

### User Mental Model

- 「いまのページ番号」と前後ページの関係から自分の位置を把握する。
- 隣接ページへの前進／後退と、任意ページ番号への直接ジャンプは別の意図として認識する。
- 端（最初 / 最後）にいる場合は、進めない方向の表示が消えるか弱まることで「これ以上行けない」と認知する。

### Anatomy

- **Pager Unit**（必須）— Pagination 全体のコンテナ。現在ページが先頭・中間・末尾のどこにあるかで内部構成が変化する。
- **Page Item**（必須、1 つ以上）— ページ番号を表す選択肢。現在ページは強調表示される。コンパクトなテキスト幅（最小幅を確保）の単一ユニットで、背景塗りや囲み枠は持たない。
- **Previous Control / Next Control**（必須）— 1 ページ後退 / 前進するアクション。常に表示し、Pager Unit が先頭 / 末尾のときは対応する方向のコントロールを **disabled（無効・淡色表示）** にする（非表示にはしない）。
- **Truncation Indicator**（任意）— ページ数が多いとき、省略された範囲を示す（例: …）。装飾でなく省略の意味を持つ。
- **First / Last Control**（任意）— 端ページへ一気にジャンプするアクション。総ページ数が大きいときに併設する。
- Status Text（「X / Y ページ」「N 件中 a–b 件」など）、ページサイズ切替、総件数表示は同居させない。隣接コンポーネントの責務とする。

### Content Model

- Page Item の中身はページ番号（1 始まりの自然数）。文字列ラベルにしない。
- Truncation Indicator は単一の意味を持つ記号（例: …）で、複数連結しない。
- Previous / Next / First / Last 等のアクションは方向アイコンを中心とした単一ユニットで表現する。テキストラベルは持たない前提（必要なら支援技術向けの不可視ラベル）。
- 0 件 / 1 ページしかないときは Pagination 全体を非表示にする（Disabled で残さない）。

### Layout And Density

- 水平方向に Previous → Page Items → Next の順で並ぶ。First / Last はその外側に置く。
- 各 Page Item はコンパクトなテキスト幅（最小幅を確保し、上下に小さな余白）。囲み枠は持たず、現在ページのみ下線で示す。Previous / Next / First / Last は方形のアイコンヒット領域。
- **逸脱**: サイズはプロダクト全体で 1 段階（regular 相当）のみ。S / M / L の独立 variant は持たない。
- ページ数が多い場合は両端と現在ページ近傍を残し、中間を Truncation で省略する（例: 1 … 7 8 9 … 42）。
- 横幅が不足するときは Page Items を間引く。
- 端での Previous / Next 非表示時は、レイアウトを保つために空白で詰めず、Page Item 列の左右余白で吸収する。

### Accessibility Notes

- 全体は **`nav` ランドマーク**として実装し、アクセシブルネーム（例: 「ページネーション」）を付与する。
- **roving tabindex は使わない**（Interaction Model 参照）。各コントロールは個別に Tab で到達する。
- 端の Previous / Next / First / Last は native `disabled`（リンク描画時は到達不可・非操作）として残す。フォーカス順からは外れるが要素は表示し続ける。
- **逸脱**: Page Item は `disabled` を持たないため、`aria-disabled` も使わない（State Model 参照）。
- ページ遷移はライブリージョンで伝えず、ページ自体の見出しや本文更新で伝える（過剰アナウンスを避ける）。

## Spec

### Interaction Model

- Page Item クリック / タップで該当ページへ即時遷移。確定操作は伴わない。
- Previous / Next は現在ページ ±1。端では disabled（無効）にして表示し続ける。
- First / Last は最初 / 最後のページへジャンプ。同様に端では disabled にして表示し続ける。
- 各コントロールは個別ボタン群として Tab で順に到達する（**roving tabindex は使わない**）。Tabs と異なり、ユーザーは任意のページ番号を直接選びにいくため、フォーカス順から個々の Page Item を隠さない。
- 連打時の通信競合はコンポーネント外（データ層）の責務。ただし押下中の二重発火を抑止する。
- ジャンプ入力（直接ページ番号を打ち込む）は本コンポーネントの責務外。

### State Model

- **逸脱**: Page Item は `disabled` 状態を持たない（5 state 共通語彙からの逸脱）。押せない Item は描画しない、または `current` で代用する。
- Page Item に追加される状態として `current` を持つ。`current` は同時に 1 つだけ存在し、押下不可（自ページへの遷移は起きない）。
- `current` は `hover` / `focused` と重畳しうるが、`current` の優先度が最も高い。
- Previous / Next / First / Last コントロールは `disabled` 状態を持つ。先頭では Previous / First が、末尾では Next / Last が disabled になる（**非表示にはせず**、淡色で表示し続ける）。
- Pager Unit の状態は `first-page` / `middle-page` / `last-page` の 3 つで、現在ページの位置に応じて自動的に切り替わる。
- 読み込み中など外部理由による全体無効化は、Pager Unit 全体の interactivity を一時的に抑止することで表す。Item 単位の Disabled は使わない。

### Visual Semantics

- `current` の Page Item は **下線＋太字の前景色テキスト**で示す（背景塗りやアウトライン箱では示さない）。非現在の Page Item は弱い前景色（淡色）で、階層差を付ける。
- 矢印アイコンは方向の意味を持つ。書字方向（LTR / RTL）に従って反転する。有効時は前景の濃色、disabled 時は淡色。
- 端での前進・後退コントロールは**淡色の disabled 表示**にして空間を保つ（非表示にはしない）。
- 危険・成功などの意味色は Pagination には載せない。

### Variants And Options

- **endpoints**: First / Last コントロールの有無。総ページ数が大きいほど推奨。
- **navigation form**: Page Item を「リンク（URL 遷移）」として描画するか「ボタン（状態遷移のみ）」として描画するかを選択できる。意味としては同一の「ページ移動」。
- Pager Unit の `first-page` / `middle-page` / `last-page` は variant ではなく現在ページから派生する状態として扱う。
- density / shape / size の独立 variant は持たない。

### Open Questions

- Truncation Indicator がクリッカブルか（押下で省略範囲を展開するか）。
- 大規模ページ数（数百ページ超）での省略アルゴリズムの境界値仕様（両端固定数、現在ページ前後の表示数）。
- First / Last コントロールを既定で出すか、`endpoints` オプトインとするか。
- 実装着手時に `packages/react/src/ui/pagination.notes.md` へ移送: 制御/非制御の両モード、URL クエリ連動、Page Item 集合計算（省略ロジック）のピュア関数化。

### Acceptance Criteria

- AC-Pagination-01: ページ数が 2 以上のとき、現在ページが常に正確に 1 つ強調表示される。
- AC-Pagination-02: 1 ページ以下のとき Pagination はレンダリングされない。
- AC-Pagination-03: 現在ページが先頭のとき Previous（および First）が disabled になり、末尾のとき Next（および Last）が disabled になる（非表示にはしない）。これが視覚と支援技術の双方に伝わる。
- AC-Pagination-04: 現在ページは下線＋太字の前景色テキストで示し、背景塗りで示さない。非現在ページは淡色で表示する。（検証: Storybook）
- AC-Pagination-05: 任意の Page Item を選んだとき、ページ遷移が一意に発生し、二重押下で複数遷移が走らない。
- AC-Pagination-06: キーボードのみで全ての操作（前後 / 端 / 直接ジャンプ）が完結する。
- AC-Pagination-07: 書字方向に応じて矢印の意味が正しく反転する。（検証: Storybook）
- AC-Pagination-08: 総件数 0 件のとき、Pagination は何も描画しない。
