# Plan 004: token-bridge の未テスト純粋関数（selectors / document / ui/state）に単体テストを足す

> **Executor instructions**: このプランをステップ順に実行すること。各ステップの
> 検証コマンドを実行し、期待結果を確認してから次に進む。「STOP conditions」の
> いずれかが発生したら、改善を試みずに停止して報告する。完了したら
> `plans/README.md` の該当行の Status を更新する。
>
> **Drift check (最初に実行)**: `git diff --stat 73dd926..HEAD -- packages/token-bridge-figma/src/core/selectors.ts packages/token-bridge-figma/src/core/document.ts packages/token-bridge-figma/src/ui/state.ts packages/token-bridge-figma/tsconfig.test.json`
> 差分があるファイルは「Current state」の抜粋と現物を突合し、不一致なら STOP。

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW（テスト追加のみ、プロダクションコード変更なし）
- **Depends on**: none（Plan 001 と独立だが、001 が先にマージされると export.test.ts の衝突が無く楽）
- **Category**: tests
- **Planned at**: commit `73dd926`, 2026-07-07

## Why this matters

`packages/token-bridge-figma` の diff / apply / export はすべて
`core/selectors.ts`（ID ルックアップ）と `core/document.ts`（クローン・名前正規化・
参照変換）の純粋関数の上に建っているが、これらを直接検証するテストが 1 本も無い
（tests/ からの import 皆無を確認済み）。UI 側も `ui/state.ts` の `mergeState` が
差分リストと解決状態のマージという壊れやすいロジックを持つのに未テスト。いずれも
既存の `node --test` ハーネスでそのまま書ける、最も安価なカバレッジ空白。

## Current state

- テスト実行方式: `packages/token-bridge-figma/package.json` の
  `"test": "tsc -p tsconfig.test.json && node --test .tmp-tests/tests/*.test.js"`。
  `tsconfig.test.json` の include は `["src/core/**/*.ts", "src/plugin/**/*.ts", "tests/**/*.ts"]`
  だが、**tsc は include 外でも import 先を追跡してコンパイルする**ため、テストから
  `../src/ui/state.js` を import すれば `src/ui/` も include に足さずコンパイルされる
  想定（Step 3 で検証。ダメなら include に `"src/ui/**/*.ts"` を追加 — `.tsx` を含めない
  こと。JSX はこの tsconfig でコンパイルできない）。
- テストパターンの正本: `packages/token-bridge-figma/tests/describe-error.test.ts`
  （`import test from "node:test"; import assert from "node:assert/strict";` +
  `../src/<path>.js` の **.js 拡張子付き** import）。
- 対象1 `src/core/selectors.ts`（全文確認済み・3関数）:
  - `findCollectionById(document, collectionId)` — `document.variables` から
    `extensions.figmaSync.collectionId` 一致を検索。document が undefined なら null。
  - `findVariableById(document, variableId, collectionId?)` — collectionId 指定時は
    そのコレクションに絞り、`extensions.figmaSync.variableId` 一致のトークンを
    `{ collection, token }` で返す。無ければ null。
  - `findStyleById(document, styleId)` — 4つの styleType（paint/text/effect/grid）を
    横断して `extensions.figmaSync.styleId` 一致を検索。
- 対象2 `src/core/document.ts`（全文確認済み）: `createEmptySyncDocument`,
  `cloneValue`（structuredClone フォールバック）, `slugifyName`, `splitTokenPath`,
  `pathToReference` / `referenceToPath` / `isReferenceValue`（`{A.B}` 形式変換）,
  `styleTokenType`, `variableResolvedTypeToTokenType` / `tokenTypeToVariableResolvedType`。
- 対象3 `src/ui/state.ts` の `mergeState`（抜粋確認済み）: snapshot の部分更新で、
  `diffs` が来たときは resolutionId ごとに **既存の resolutions を優先し、新規 diff のみ
  `defaultResolution(entry)` を採用**する:
  ```ts
  next.resolutions = Object.fromEntries(
    snapshot.diffs.map((entry) => [
      entry.resolutionId,
      current.resolutions[entry.resolutionId] ?? defaultResolution(entry)
    ])
  );
  ```
  注意: `state` はモジュールレベルの signal なのでテスト間で状態が漏れる。各テストの
  冒頭で `state.value = { ...初期値 }` にリセットするか、1テスト内で完結させること。
- フィクスチャの作り方の参考: `tests/diff-apply.test.ts` や `tests/export.test.ts` に
  SyncDocument を組み立てるヘルパーが既にあるので、必要最小限のオブジェクトリテラルで
  同型のものを作る（コピーでよい。共有ヘルパー化はスコープ外）。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| テスト | `pnpm --filter @orca/token-bridge-figma test` | 全 pass（新規分含む） |
| Typecheck | `pnpm --filter @orca/token-bridge-figma typecheck` | exit 0 |
| 全体検証 | `pnpm turbo run build typecheck test tokens:check` | 全タスク成功 |

## Scope

**In scope**（すべて新規作成のみ）:
- `packages/token-bridge-figma/tests/selectors.test.ts`（新規）
- `packages/token-bridge-figma/tests/document.test.ts`（新規）
- `packages/token-bridge-figma/tests/ui-state.test.ts`（新規）
- `packages/token-bridge-figma/tsconfig.test.json`（ui の import がコンパイルされない場合のみ、include への `"src/ui/**/*.ts"` 追加に限定）

**Out of scope**:
- `src/` 配下のプロダクションコードの変更（一切禁止。テストしにくい構造を見つけたら
  報告に書くだけにする）
- Preact コンポーネント（.tsx）のテスト — JSX ハーネスが無いため対象外
- `plugin/figma.ts` / `plugin/code.ts` の特性テスト — 別の大きな仕事（監査 TEST-01/02）

## Git workflow

- ブランチ: `test/token-bridge-pure-core`
- コミット例: `test(token-bridge-figma): cover selectors, document helpers, and ui state merge`
- push / PR 作成はオペレーターの指示があるまで行わない。

## Steps

### Step 1: selectors.test.ts

最小の SyncDocument フィクスチャ（コレクション2つ・変数各1〜2・paint/text スタイル
各1）を作り、以下をカバー:
- `findCollectionById`: ヒット / ミス / document undefined → null
- `findVariableById`: collectionId 指定でヒット / **collectionId 指定が別コレクションの
  変数を除外する**（絞り込みの正しさ — diff/apply の同名 ID 衝突を防ぐ要）/ 未指定で
  全コレクション横断ヒット / ミス → null
- `findStyleById`: paint でヒット / text でヒット（styleType 横断）/ ミス → null

**Verify**: `pnpm --filter @orca/token-bridge-figma test` → 新規テスト含め全 pass

### Step 2: document.test.ts

- `slugifyName`: 日本語・空白・記号混じり（例: `"Color System"` → `"color-system"`、
  先頭末尾ハイフン除去、`/` の温存と連続 `/` の圧縮）
- `splitTokenPath`: `"UI/On Surface"` → `["UI", "On Surface"]`、空セグメント除去
- `pathToReference` ↔ `referenceToPath` の往復、`isReferenceValue` の真偽両方
- `cloneValue` / `cloneDocument`: 深いクローンで元が変わらないこと
- `styleTokenType` / `variableResolvedTypeToTokenType` / `tokenTypeToVariableResolvedType`
  の全分岐（default 分岐含む）

**Verify**: 同上

### Step 3: ui-state.test.ts

`import { state, mergeState, updateResolution } from "../src/ui/state.js";` で:
- 部分 snapshot（config のみ）が他フィールドを保持すること
- `diffs` 到着時: 新規 resolutionId に `defaultResolution` が入ること
- **再計算時に既存のユーザー選択が保持されること**（同じ resolutionId の diff が
  再度来ても、`updateResolution` で変更済みの値が defaultResolution に巻き戻らない —
  このロジックの存在意義そのもの）
- `diffs` から消えた resolutionId が resolutions から除去されること
- 各テスト冒頭で `state.value` を既知の初期値にリセットする

**Verify**: `pnpm --filter @orca/token-bridge-figma test` → 全 pass。
コンパイルエラー（state.ts が .tmp-tests に出力されない）の場合のみ
`tsconfig.test.json` の include に `"src/ui/**/*.ts"` を追加して再実行。

### Step 4: 全体検証

**Verify**: `pnpm turbo run build typecheck test tokens:check` → 全タスク成功

## Test plan

このプラン自体がテスト追加。ケース一覧は Steps に記載。パターンの正本:
`tests/describe-error.test.ts`（構成）と `tests/export.test.ts`（フィクスチャ）。

## Done criteria

- [ ] 新規3テストファイルが存在し、`pnpm --filter @orca/token-bridge-figma test` で
      実行・全 pass（テスト総数が増えていることを実行ログで確認）
- [ ] `src/` 配下に変更が無い（`git diff --stat` に tests/ と tsconfig.test.json 以外が出ない）
- [ ] `pnpm turbo run build typecheck test tokens:check` 全タスク成功
- [ ] `plans/README.md` の Status 更新

## STOP conditions

- テストを書く過程で selectors / document / mergeState に**実バグを発見した**場合:
  そのテストを fail のまま skip 状態（`test.skip` + 理由コメント）にして停止・報告
  （このプランはテスト追加であり、プロダクション修正は別プランで行う）。
- `@preact/signals` が node --test 環境で動かない（import エラー等）→ ui-state.test.ts
  のみ断念して報告、selectors / document は完了させる。

## Maintenance notes

- ここで作るフィクスチャは Plan 001（export.ts 修正）のテストでも使い回せる形。
  将来 `tests/helpers/` への共通化を検討してよい（今回はしない）。
- 次の一手は `plugin/figma.ts` の characterization テスト（監査 TEST-01）— この
  プランで純粋層が固まっていることが前提になる。
