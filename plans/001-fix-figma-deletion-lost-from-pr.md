# Plan 001: figma-to-repo の削除が「コレクション唯一の変更」でも PR に反映されるようにする

> **Executor instructions**: このプランをステップ順に実行すること。各ステップの
> 検証コマンドを実行し、期待結果を確認してから次に進む。「STOP conditions」の
> いずれかが発生したら、改善を試みずに停止して報告する。完了したら
> `plans/README.md` の該当行の Status を更新する。
>
> **Drift check (最初に実行)**: `git diff --stat 73dd926..HEAD -- packages/token-bridge-figma/src/core/export.ts packages/token-bridge-figma/src/core/serialize.ts packages/token-bridge-figma/tests/export.test.ts`
> 差分があるファイルは「Current state」の抜粋と現物を突合し、不一致なら STOP。

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `73dd926`, 2026-07-07

## Why this matters

Figma で managed な variable / style を削除し、既定の解決方向 `figma-to-repo` で
「選択を適用」すると、**その削除が当該コレクション内で唯一の変更である場合、
生成される PR に削除が一切反映されない**。repo は削除済みトークンを保持し続け、
`packages/token-bridge-figma/docs/sync-spec.md` が規定する「repo は Figma の完全な鏡」
という不変条件が黙って破れる。同一コレクションに他の figma-to-repo 変更が併存する
場合のみ偶発的に正しく動くため、ユーザーからは非常に発覚しにくい。

## Current state

バグは3ファイルの連鎖で成立する（すべて現物確認済み）:

1. `packages/token-bridge-figma/src/core/apply.ts` — `applyDiffSelections()` は
   figma-to-repo の削除（Figma 側に実体が無い diff）で repoDocument のクローンから
   トークンを除去する:
   ```ts
   // apply.ts:160-162（variable の figma-to-repo 分岐）
   locateVariable(nextFigmaDocument, diff.figmaId, collectionId)
     ? upsertVariable(nextRepoDocument, nextFigmaDocument, diff.figmaId, collectionId)
     : removeVariable(nextRepoDocument, diff.figmaId, collectionId);  // ← splice で除去
   ```

2. `packages/token-bridge-figma/src/plugin/code.ts` — `apply-selected` ハンドラは
   除去後の文書を PR ファイル生成に渡す:
   ```ts
   // code.ts:258-263
   buildPullRequestFiles({
     document: applied.repoDocument,   // ← 削除が既に適用済み
     targetDir: message.config.targetDir,
     diffs,
     resolutions: message.resolutions
   }),
   ```

3. `packages/token-bridge-figma/src/core/export.ts` — `buildPullRequestFiles()` は
   「再生成するコレクション」を **除去後の文書に対する検索**で決めるため、削除済み
   variable は見つからず、コレクションが再生成対象に入らない:
   ```ts
   // export.ts:80-87
   if (diff.entityKind === "variable") {
     const collectionId = diff.details.collectionId as string | undefined;
     const match = findVariableById(nextDocument, diff.figmaId, collectionId);
     if (match) {                       // ← 削除済みなら null → include されない
       includeCollectionIds.add(match.collection.extensions.figmaSync.collectionId);
     }
     continue;
   }
   const style = findStyleById(nextDocument, diff.figmaId);
   if (style) {                          // ← style も同型の問題
     includeStyleTypes.add(style.styleType);
   }
   ```

4. `packages/token-bridge-figma/src/core/serialize.ts:337-340` —
   `serializeSyncDocumentToRepoFiles()` は `includeCollectionIds` に無いコレクションの
   ファイルを出力しない。つまり include 漏れ = 削除を反映したファイルが PR に入らない。

**修正の鍵となる事実**: delete 差分は削除対象のコレクション ID を既に持っている。
`packages/token-bridge-figma/src/core/diff.ts:198-201` :
```ts
details: {
  missingSide: figmaEntry ? "repo" : "figma",
  collectionId: onlyEntry.collectionId
}
```
つまり `findVariableById` の結果に頼らず `diff.details.collectionId` を直接
`includeCollectionIds` に加えれば variable の削除は解決する。

**style 側の未確認事項**: style の delete 差分が styleType（"paint" | "text" |
"effect" | "grid"）を details に持つかは未確認。Step 1 で `diff.ts` を読んで確認する
こと（持っていなければ diff 生成側に足す必要があり、影響範囲が広がる → その場合も
続行してよいが、`diff.ts` の変更は details への styleType 追加に限定する）。

**リポジトリ規約**: コメントは日本語。テストは `node:test` + `assert/strict`
（例: `packages/token-bridge-figma/tests/export.test.ts` — このファイルが既存の
buildPullRequestFiles テストの正本。パターンを踏襲する）。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| このパッケージのテスト | `pnpm --filter @orca/token-bridge-figma test` | 全テスト pass |
| Typecheck | `pnpm --filter @orca/token-bridge-figma typecheck` | exit 0 |
| 全体検証（CI 同等） | `pnpm turbo run build typecheck test tokens:check` | 全タスク成功 |

## Scope

**In scope**（変更してよいファイル）:
- `packages/token-bridge-figma/src/core/export.ts`
- `packages/token-bridge-figma/src/core/diff.ts`（style の delete 差分に styleType が無い場合のみ、details への追加に限定）
- `packages/token-bridge-figma/tests/export.test.ts`
- `packages/token-bridge-figma/tests/diff-status.test.ts`（diff.ts を変えた場合の期待値追従のみ）

**Out of scope**（触らない）:
- `packages/token-bridge-figma/src/core/github.ts` — 「コレクションファイル自体の削除を PR で表現できない」問題（CORRECT-02）は別件。このプランでは扱わない。
- `packages/token-bridge-figma/src/core/apply.ts` — 除去ロジック自体は正しい。
- `packages/token-bridge-figma/src/plugin/code.ts`

## Git workflow

- ブランチ: `fix/token-bridge-deletion-lost-from-pr`（main から分岐）
- コミットは conventional commits。例: `fix(token-bridge-figma): include collections of deleted tokens in PR regeneration`
- push / PR 作成はオペレーターの指示があるまで行わない。

## Steps

### Step 1: style の delete 差分の details 構造を確認する

`packages/token-bridge-figma/src/core/diff.ts` を読み、entityKind === "style" の
delete 差分（`missingSide: "figma"`）の `details` に styleType 相当の情報が
含まれるか確認する。含まれなければ、diff 生成箇所で `details.styleType` を追加する
（追加のみ。既存フィールドは変更しない）。

**Verify**: `pnpm --filter @orca/token-bridge-figma test` → 既存テスト全 pass
（diff-status.test.ts の期待値に details 追加の影響が出た場合は期待値を追従）

### Step 2: 失敗するテストを先に書く（TDD）

`packages/token-bridge-figma/tests/export.test.ts` に追加:

1. **variable 削除の再現テスト**: 2つのコレクション A / B を持つ SyncDocument を作る。
   A の変数1件が Figma 側で削除された状態を表す delete 差分（`entityKind: "variable"`,
   `details: { missingSide: "figma", collectionId: <AのID> }`）と、resolution
   `figma-to-repo` を渡す。**削除適用後の文書**（= A から当該変数を除去したもの）を
   `document` として `buildPullRequestFiles` を呼び、返却ファイルに **A のコレクション
   ファイルが含まれる**ことを assert する（現状は含まれず fail するはず）。
2. **style 削除の再現テスト**: 同様に paint style 1件の delete 差分で、返却ファイルに
   styles/paint.json が含まれることを assert。

既存テストのフィクスチャ生成ヘルパー（export.test.ts 内にあるはず）を再利用する。

**Verify**: `pnpm --filter @orca/token-bridge-figma test` → 新規2テストが **fail**、
既存テストは pass（red の確認）

### Step 3: export.ts を修正する

`buildPullRequestFiles` のループを修正:
- `entityKind === "variable"`: `findVariableById` の結果に関わらず、
  `diff.details.collectionId` が存在すればそれを `includeCollectionIds` に追加する
  （見つかった場合の従来経路も残してよいが、削除済みでも include されることが必須）。
- `entityKind === "style"`（else 分岐）: `findStyleById` が null の場合、Step 1 で
  確認した details の styleType を `includeStyleTypes` に追加する。
- なぜ除去後の文書では検索できないか（削除済みトークンは findVariableById で
  見つからない）を1〜2行の日本語コメントで残す。

**Verify**: `pnpm --filter @orca/token-bridge-figma test` → 全テスト pass（green）

### Step 4: 全体検証

**Verify**: `pnpm turbo run build typecheck test tokens:check` → 全タスク成功

## Test plan

- 新規テスト（Step 2 の2件）: variable 削除 / style 削除がそれぞれ include を発火し、
  再生成ファイルに削除反映済みコレクション/スタイルファイルが含まれる。
- パターンの正本: `packages/token-bridge-figma/tests/export.test.ts` の既存テスト。

## Done criteria

- [ ] `pnpm --filter @orca/token-bridge-figma test` exit 0（新規2テスト含む）
- [ ] `pnpm --filter @orca/token-bridge-figma typecheck` exit 0
- [ ] `pnpm turbo run build typecheck test tokens:check` 全タスク成功
- [ ] In scope 外のファイルに変更が無い（`git status` で確認）
- [ ] `plans/README.md` の Status 更新

## STOP conditions

以下の場合は停止して報告（改善を試みない）:

- 「Current state」の抜粋が現物と一致しない（コードがドリフトしている）。
- style の delete 差分に styleType を追加するために `diff.ts` の details 以外
  （resolutionId 生成、changeKind 判定など）を変更する必要が生じた。
- Step 2 の再現テストが**最初から pass する**（バグが既に直っているか、再現条件の
  理解が違う — どちらでも報告）。
- 検証が2回連続で失敗し、原因が特定できない。

## Maintenance notes

- 関連する未解決問題: コレクション**丸ごと**の削除は PR ファイル生成がファイル削除を
  表現できないため依然反映されない（監査 finding CORRECT-02、今回スコープ外）。
  レビュー時に「変数単位の削除は直ったが、コレクション単位は未対応」と明記すること。
- `diff.details` は `Record<string, unknown>` 的に緩く型付けされている。将来
  entityKind ごとの details を判別可能なユニオン型にすると、この種の取りこぼしが
  型で防げる（今回はスコープ外）。
