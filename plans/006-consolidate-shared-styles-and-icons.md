# Plan 006: focus リング定数と重複 SVG アイコンを共有内部モジュールに集約する

> **Executor instructions**: このプランをステップ順に実行すること。各ステップの
> 検証コマンドを実行し、期待結果を確認してから次に進む。「STOP conditions」の
> いずれかが発生したら、改善を試みずに停止して報告する。完了したら
> `plans/README.md` の該当行の Status を更新する。
>
> **Drift check (最初に実行)**: `git diff --stat 73dd926..HEAD -- packages/react/src`
> 差分があるファイルは「Current state」の抜粋と現物を突合し、不一致なら STOP。
> 特にこのリポジトリはコンポーネント再整合 PR が並行して動いているため、
> 対象6ファイルの該当行は**内容ベース**で確認すること。

## Status

- **Priority**: P2
- **Effort**: S〜M
- **Risk**: LOW（見た目・振る舞い完全不変のリファクタ。テストは className 非依存規約なので壊れない）
- **Depends on**: none（ただし open 中のコンポーネント PR とのコンフリクト回避のため実行タイミングはオペレーターと相談）
- **Category**: tech-debt
- **Planned at**: commit `73dd926`, 2026-07-07

## Why this matters

focus リングのクラス文字列 `"focus-visible:outline-none focus-visible:shadow-focus-outline"`
が 6 ファイル 7 箇所に個別リテラルとして散在しており、focus 表現の token を変える
とき全ファイルの lockstep 編集が必要になる。また Chip と Search が**同一の X（close）
グリフ SVG** をそれぞれ手書きしており、ストローク幅や a11y 属性がドリフトする素地が
ある。共有内部モジュールに集約して単一定義にする。

## Current state

- focus リング文字列の全出現（grep で確認済み・7箇所）:
  - `packages/react/src/Button/Button.tsx:18`（BASE_CLASS 内）
  - `packages/react/src/IconButton/IconButton.tsx:23`
  - `packages/react/src/Chip/Chip.tsx:75` — `const FOCUS_CLASS = "focus-visible:outline-none focus-visible:shadow-focus-outline";`（唯一定数化済み）
  - `packages/react/src/Pagination/Pagination.tsx:49,58`
  - `packages/react/src/Tabs/Tabs.tsx:155`
  - `packages/react/src/Search/Search.tsx:246`（Clear ボタン）※ Search.tsx にはコンテナ用の
    `focus-within:shadow-focus-outline`（:170 付近）もあるが、これは**別物**（focus-within）
    なので対象外。
- X グリフの重複（両方確認済み、`<line>` 2本が完全一致）:
  - `packages/react/src/Search/Search.tsx:96-110` — 名前付きコンポーネント `CloseGlyph`
    （svg: `viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"` + `aria-hidden="true"`、
    `<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />`）
  - `packages/react/src/Chip/Chip.tsx:190-203 付近` — trailing 除去ボタン内のインライン SVG
    （同じ2本の line）。
- Search.tsx にはほかに `SearchGlyph`（虫眼鏡、:68-80 付近）と `Spinner`（:82-94 付近）の
  名前付き SVG コンポーネントがある（現状 Search 専用）。
- **リポジトリ規約**:
  - コメントは日本語。
  - `packages/react/src/index.ts` は公開 API の export 一覧 — **内部モジュールを export
    しない**こと。
  - テストは className に依存しない（`packages/react/CLAUDE.md` 規約）ため、この
    リファクタでテスト変更は発生しないはず。発生したら何かが間違っている。
  - アイコンは「コンポーネント側の slot がサイズを担保し、渡された ReactNode に
    className を注入しない」方針（CLAUDE.md）。共有アイコンも `className` を
    受け取って `size-full` 等を呼び出し側が渡す現行スタイルを維持する。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| テスト | `pnpm --filter @orca/react test` | 全 pass（145+） |
| Typecheck | `pnpm --filter @orca/react typecheck` | exit 0 |
| Storybook build | `pnpm --filter @orca/storybook build` | exit 0 |
| 全体検証 | `pnpm turbo run build typecheck test tokens:check` | 全タスク成功 |

## Scope

**In scope**:
- `packages/react/src/internal/styles.ts`（新規 — 共有クラス定数）
- `packages/react/src/internal/icons.tsx`（新規 — CloseGlyph / SearchGlyph / Spinner）
- 上記 6 コンポーネントファイルの該当箇所の置換（Button / IconButton / Chip /
  Pagination / Tabs / Search）

**Out of scope**:
- `packages/react/src/index.ts` — 内部モジュールは公開しない（変更禁止）
- `packages/react/src/Pagination/Pagination.tsx` の chevron / ellipsis SVG —
  Pagination 専用でありドリフト先が無い。移動しない（フォローアップ候補として
  Maintenance notes に記載）
- disabled 系クラスの共通化 — コンポーネントごとに値が異なる（`data-[disabled]:` と
  `disabled:` の違い等、意図的）ため今回は対象外
- 見た目・DOM 構造・aria 属性のいかなる変更

## Git workflow

- ブランチ: `refactor/react-shared-styles-icons`
- Tidy First: これは純粋な構造変更なので**1〜2コミット**（styles と icons を分けてよい）。
  例: `refactor(react): extract shared focus-ring constant and icon glyphs`
- push / PR 作成はオペレーターの指示があるまで行わない。

## Steps

### Step 1: 共有定数モジュールを作る

`packages/react/src/internal/styles.ts`:
```ts
// 全コンポーネント共通の focus リング。token（--shadow-focus-outline）を変える
// ときはここ 1 箇所を直せば全コンポーネントに効く。
export const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:shadow-focus-outline";
```

**Verify**: `pnpm --filter @orca/react typecheck` → exit 0

### Step 2: 7箇所を置換する

6ファイルで文字列リテラルを `FOCUS_RING_CLASS` の参照に置換（import 追加）。
Chip の `FOCUS_CLASS` 定数は削除し、参照箇所を差し替える（定数の削除はこの
置換の一部であり、コメント削除ではない）。clsx / join の使われ方はファイルごとに
異なるので、**文字列の内容だけを定数参照に変え、結合方法は変えない**こと。

**Verify**: `pnpm --filter @orca/react test && pnpm --filter @orca/react typecheck` → 全 pass。
`grep -rn '"focus-visible:outline-none focus-visible:shadow-focus-outline"' packages/react/src --include="*.tsx"` → **0 件**（定義元の styles.ts のみ残る）

### Step 3: アイコンを集約する

1. Chip と Search の X グリフ SVG を diff し、**属性まで完全一致**であることを確認
   （一致しなければ STOP — 見た目差があるなら統一は意図的な視覚変更になるため）。
2. `packages/react/src/internal/icons.tsx` を新規作成し、Search.tsx から
   `CloseGlyph` / `SearchGlyph` / `Spinner` を**そのまま移動**（実装を変えない。
   既存の日本語コメントがあれば一緒に移動する）。
3. Search.tsx は import に切り替え。Chip.tsx のインライン SVG を `CloseGlyph` の
   使用に置き換える（svg に渡していた className / aria 属性の最終的な出力が
   完全に同一になるように）。

**Verify**: `pnpm --filter @orca/react test && pnpm --filter @orca/storybook build` → 全 pass

### Step 4: 視覚回帰の確認

Storybook をビルドし、Chip（trailing 除去ボタンあり）と Search（Clear 表示状態）の
story が描画されることを確認する。可能なら `pnpm storybook` でブラウザ確認し、
X アイコンの見た目が変わっていないことを目視（環境が無ければ build 成功 +
DOM スナップショットの不変で代替し、その旨を報告）。

**Verify**: `pnpm turbo run build typecheck test tokens:check` → 全タスク成功

## Test plan

- 新規テストは書かない（振る舞い不変のリファクタ。既存テストが全緑であることが検証）。
- 既存テストに変更が必要になったら、それは振る舞いが変わったシグナル → STOP。

## Done criteria

- [ ] `grep -rn '"focus-visible:outline-none focus-visible:shadow-focus-outline"' packages/react/src --include="*.tsx" | grep -v internal/styles` → 0件
- [ ] Chip.tsx に X グリフのインライン `<line x1="18"` が無い
- [ ] `packages/react/src/index.ts` が無変更
- [ ] `pnpm turbo run build typecheck test tokens:check` 全タスク成功
- [ ] `plans/README.md` の Status 更新

## STOP conditions

- Chip と Search の X グリフ SVG の属性が一致しない（統一が視覚変更になる）。
- 置換の過程で既存テストが fail する（リファクタが振る舞いを変えている）。
- 対象ファイルの現物が「Current state」の出現一覧と大きく食い違う
  （並行 PR による drift — 停止して現状を報告）。

## Maintenance notes

- フォローアップ候補: Pagination の chevron/ellipsis も icons.tsx に移す /
  disabled 表現の共通化（値の差異を design-language と突合してから）/
  size 命名の統一（`sm|md|lg` vs `small|medium|large` — 監査 DEBT-04、破壊的変更
  なので別途ユーザー判断）。
- レビュー観点: 「移動」であって「書き換え」でないこと。icons.tsx の中身が
  Search.tsx にあった実装と一致しているか。
