# Plan 005: token-bridge 同期の堅牢性4点を修正する（truncated / ブランチ名衝突 / config 正規化 / エラー文言）

> **Executor instructions**: このプランをステップ順に実行すること。各ステップの
> 検証コマンドを実行し、期待結果を確認してから次に進む。「STOP conditions」の
> いずれかが発生したら、改善を試みずに停止して報告する。完了したら
> `plans/README.md` の該当行の Status を更新する。
>
> **Drift check (最初に実行)**: `git diff --stat 73dd926..HEAD -- packages/token-bridge-figma/src/core/github.ts packages/token-bridge-figma/src/plugin/code.ts packages/token-bridge-figma/tests/github.test.ts`
> 差分があるファイルは「Current state」の抜粋と現物を突合し、不一致なら STOP。

## Status

- **Priority**: P2
- **Effort**: S×4（合計 M 弱）
- **Risk**: LOW
- **Depends on**: none（Plan 001/002 と同じファイルに触るため、実行順は 001 → 002 → 005 を推奨）
- **Category**: bug
- **Planned at**: commit `73dd926`, 2026-07-07

## Why this matters

token-bridge の同期経路に、単発では小さいが「黙って壊れる」系の穴が4つある:
(a) git tree API の `truncated` 未チェックで、大規模 repo でファイル一覧が黙って
欠落し「幻の削除/新規」diff を生む。(b) 同期ブランチ名が秒粒度のタイムスタンプのみで、
同一秒の連続実行が 422 で失敗する。(c) `save-config` 以外の6ハンドラが config を
正規化せずに使い、未トリムの `targetDir` がパス前置き比較を外して全ファイル欠落扱いに
なりうる。(d) GitHub API のエラー本文がそのまま UI に表示される。いずれも修正は小さく
リスクが低い。

## Current state

- (a) `packages/token-bridge-figma/src/core/github.ts:316-323` — `readRepoFiles`:
  ```ts
  const tree = await this.request<{ tree: Array<{ path: string; type: string; sha: string }> }>(
    `/repos/${this.owner}/${this.repo}/git/trees/${commit.tree.sha}?recursive=1`
  );
  ```
  GitHub はエントリ数上限超過時に `truncated: true` を返すが、レスポンス型にも
  チェックにも存在しない（`grep -n truncated` → 0件）。
- (b) `packages/token-bridge-figma/src/plugin/code.ts:51-54`:
  ```ts
  function createBranchName(): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
    return `sync/${timestamp.toLowerCase()}`;
  }
  ```
  `github.ts:159-165` の `createBranch` は `expected: [201]` のみで、既存 ref（422）は
  throw → 同期全体が失敗。
- (c) `packages/token-bridge-figma/src/plugin/code.ts` — `runtimeState.config = message.config`
  が 183 / 194 / 200 / 206 / 212 / 227 行の6ハンドラ（refresh-diff, load-repo,
  compute-diff, export-figma-to-github, import-repo-to-figma, apply-selected）にあり、
  いずれも正規化なし。正規化関数は `packages/token-bridge-figma/src/core/config.ts:3` の
  `normalizePluginConfig`（save-config だけが使用）。未トリム targetDir は
  `github.ts:324` の `normalizedTarget`（前後スラッシュのみ除去、空白は除去しない）と
  `entry.path.startsWith(\`${normalizedTarget}/\`)` の比較を外す。
- (d) `packages/token-bridge-figma/src/core/github.ts:142`:
  ```ts
  throw new Error(`GitHub API ${method} ${path} failed with ${response.status}: ${await response.text()}`);
  ```
  この message は `plugin/describe-error.ts` 経由で UI の警告にそのまま出る。
- テストの正本: `packages/token-bridge-figma/tests/github.test.ts` — `fetchImpl` を
  スタブして GitHubClient を検証するパターンが既にある（必ず読んで踏襲すること）。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| テスト | `pnpm --filter @orca/token-bridge-figma test` | 全 pass |
| Typecheck | `pnpm --filter @orca/token-bridge-figma typecheck` | exit 0 |
| 全体検証 | `pnpm turbo run build typecheck test tokens:check` | 全タスク成功 |

## Scope

**In scope**:
- `packages/token-bridge-figma/src/core/github.ts`
- `packages/token-bridge-figma/src/plugin/code.ts`
- `packages/token-bridge-figma/tests/github.test.ts`

**Out of scope**:
- PR ファイル削除の表現（CORRECT-02）・削除 include 漏れ（Plan 001 の領域）
- `core/config.ts` の正規化ロジック自体の変更（呼ぶ場所を増やすだけ）
- UI コンポーネント

## Git workflow

- ブランチ: `fix/token-bridge-sync-hardening`
- 4修正は独立しているので**修正ごとに1コミット**（例:
  `fix(token-bridge-figma): fail loudly when git tree listing is truncated`）。
- push / PR 作成はオペレーターの指示があるまで行わない。

## Steps

### Step 1: (a) truncated チェック — テストから

`tests/github.test.ts` に「tree レスポンスが `truncated: true` のとき
`readRepoFiles` が明示的なエラー（メッセージに "truncated" と repo 規模の説明を含む
日本語）で reject する」テストを追加 → fail 確認 → `github.ts` の `readRepoFiles` で
レスポンス型に `truncated?: boolean` を追加してチェックを実装:
黙って続行せず throw する（欠落一覧で diff を計算すると誤削除 PR に繋がるため）。

**Verify**: `pnpm --filter @orca/token-bridge-figma test` → 全 pass

### Step 2: (b) ブランチ名の一意化

`createBranchName` にランダムサフィックスを追加:
```ts
return `sync/${timestamp.toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`;
```
この関数は `plugin/code.ts` 内の非 export 関数のため直接の単体テストは不要
（形式が変わることを report に明記するだけでよい）。

**Verify**: `pnpm --filter @orca/token-bridge-figma typecheck` → exit 0

### Step 3: (c) 全ハンドラで config を正規化

`plugin/code.ts` のメッセージハンドラ入口で一度だけ正規化する方針に統一する。
switch の前に:
```ts
const config = "config" in message ? normalizePluginConfig(message.config) : undefined;
```
を置き、6ハンドラの `runtimeState.config = message.config` と後続の
`message.config` 使用箇所を `config!`（または各 case 内での非 null 確認）に置換する。
`save-config` は Plan 002 適用後の形（`patStorageOptIn` を尊重）を壊さないこと —
Plan 002 未適用の場合は既存の save-config はそのまま残してよい。

**Verify**: `pnpm --filter @orca/token-bridge-figma typecheck && pnpm --filter @orca/token-bridge-figma test` → 全 pass。
加えて `grep -n "runtimeState.config = message.config" packages/token-bridge-figma/src/plugin/code.ts` → **0 件**

### Step 4: (d) エラー文言の要約

`github.ts` の throw を、UI 向け要約 + 詳細は console へ、に分離:
- 401/403 → 「GitHub の認証に失敗しました。トークンの権限と有効期限を確認してください。」
- 404 → 「リポジトリまたはパスが見つかりません。Owner / Repo / Base Branch の設定を確認してください。」
- その他 → `GitHub API ${method} ${path} failed with ${response.status}`（本文は含めない）
- いずれの場合も `console.error` に生の本文を出す（デバッグ経路は残す）。
`tests/github.test.ts` に「404 のとき error.message にレスポンス本文が**含まれない**」
テストを1件追加。

**Verify**: `pnpm --filter @orca/token-bridge-figma test` → 全 pass

### Step 5: 全体検証

**Verify**: `pnpm turbo run build typecheck test tokens:check` → 全タスク成功

## Test plan

- 新規テスト: (a) truncated → throw、(d) エラー本文の非露出。いずれも
  `tests/github.test.ts` の既存 fetchImpl スタブパターンを踏襲。
- (b)(c) は型検査と grep をゲートとする（テスト不能な非 export 関数 /配線の置換）。

## Done criteria

- [ ] `pnpm --filter @orca/token-bridge-figma test` exit 0（新規2テスト含む）
- [ ] `grep -n "truncated" packages/token-bridge-figma/src/core/github.ts` → 1件以上
- [ ] `grep -n "runtimeState.config = message.config" packages/token-bridge-figma/src/plugin/code.ts` → 0件
- [ ] `pnpm turbo run build typecheck test tokens:check` 全タスク成功
- [ ] 4修正が個別コミットに分かれている
- [ ] `plans/README.md` の Status 更新

## STOP conditions

- 「Current state」の行番号・抜粋が現物と一致しない（特に Plan 001/002 が先に
  マージされていると code.ts の行番号はずれる — 抜粋の**内容**で突合し、内容が
  見つからない場合のみ STOP）。
- Step 3 で `message` の型が判別ユニオンとして `"config" in message` を許さず、
  型の書き換えが messages.ts に波及する場合（messages.ts はスコープ外 — 停止して報告）。

## Maintenance notes

- (a) は「大規模 repo では同期不可」を明示化するだけ。ページング対応（tree の分割取得）
  は必要になった時点で別プラン。
- (d) の文言はユーザー向け。将来 i18n するならこの switch が起点。
- レビュー観点: (c) の置換で `message.config` の使用が本当に全箇所 `config` に
  切り替わったか（grep で機械的に確認可能）。
