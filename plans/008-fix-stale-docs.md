# Plan 008: 実態と食い違う3つのドキュメント記述を是正する

> **Executor instructions**: このプランをステップ順に実行すること。各ステップの
> 検証コマンドを実行し、期待結果を確認してから次に進む。「STOP conditions」の
> いずれかが発生したら、改善を試みずに停止して報告する。完了したら
> `plans/README.md` の該当行の Status を更新する。
>
> **Drift check (最初に実行)**: `git diff --stat 73dd926..HEAD -- README.md packages/token-pipeline/docs/terrazzo-integration.md packages/token-pipeline/CLAUDE.md`
> 差分がある場合は「Current state」の抜粋と現物を突合し、不一致なら STOP。

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `73dd926`, 2026-07-07

## Why this matters

3箇所のドキュメントが実態と食い違っており、いずれも「読んだ人（人間・エージェント）
が誤った前提で行動する」実害がある: (1) 存在しない CI ワークフローへの参照、
(2) リポジトリ入口の README に実装パッケージと Storybook が無い、(3) 解決済みの
可能性が高い「絶対パス問題」の警告が残り、不要な回避策を誘発する。stale doc は
無いより悪い。

## Current state

- (1) `packages/token-pipeline/docs/terrazzo-integration.md:324`（確認済み）:
  > orca の `.github/workflows/tokens.yml` を参照。`packages/token-pipeline/**` への変更をトリガーに `tokens:check` を走らせる。

  実在するのは `.github/workflows/ci.yml` のみで、path フィルタは無く、全 PR /
  main への push で `pnpm turbo run build typecheck test tokens:check` を一括実行する。
  ルート `CLAUDE.md` は正しく ci.yml と記載している。

- (2) `README.md`（全文確認済み）: Packages 節に `@orca/design-language` /
  `@orca/token-pipeline` / `@orca/token-bridge-figma` の3つのみ。
  `@orca/react`（Button/IconButton/Chip/Pagination/Tabs/Search を公開する実装
  パッケージ）と `apps/storybook` の記載が無い。開発コマンド節にも
  `pnpm storybook` / `pnpm tokens` が無い。正本はルート `CLAUDE.md`（4パッケージ +
  アプリ + 全コマンドを記載）— これと同期させる。

- (3) `packages/token-pipeline/CLAUDE.md` 末尾「忘れがちな点」（確認済み）:
  > 現在の `terrazzo.config.mjs` は `tailwind-tokens.css` のヘッダにテンプレートの絶対パスを書き出すため、別のマシンや別のチェックアウトで `tokens:check` が差分を検出することがある（未対応）。

  しかし実際の生成物 `packages/token-pipeline/generated/tailwind-tokens.css:3` の
  ヘッダは `* template: ../tailwind.template.css` と**相対パス**であり（確認済み）、
  terrazzo.config.mjs が `resolve(__dirname, ...)` で絶対パスを渡しても Terrazzo が
  outDir 相対に正規化している。記述が実態より悪い。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| (3)の検証 | `pnpm --filter @orca/token-pipeline tokens:check` | exit 0・差分なし |
| ヘッダ確認 | `head -4 packages/token-pipeline/generated/tailwind-tokens.css` | `template: ../tailwind.template.css`（相対） |
| 全体検証 | `pnpm turbo run build typecheck test tokens:check` | 全タスク成功 |

## Scope

**In scope**:
- `packages/token-pipeline/docs/terrazzo-integration.md`（:324 の1段落のみ）
- `README.md`
- `packages/token-pipeline/CLAUDE.md`（「忘れがちな点」の該当項目のみ）

**Out of scope**:
- CI ワークフロー自体の変更（path フィルタ付き tokens.yml を「作る」方向の解決はしない
  — ドキュメントを実態に合わせる）
- ルート CLAUDE.md（既に正しい）
- 他パッケージの README / docs

## Git workflow

- ブランチ: `docs/fix-stale-references`
- コミット例: `docs: reconcile stale CI/README/token-pipeline notes with reality`
  （1コミットでよい）
- push / PR 作成はオペレーターの指示があるまで行わない。

## Steps

### Step 1: terrazzo-integration.md:324 を修正

該当文を以下の趣旨に書き換える（文体は周辺の「である調」に合わせる）:
「orca の `.github/workflows/ci.yml` が全 PR と `main` への push で
`pnpm turbo run build typecheck test tokens:check` を一括実行する。
token-pipeline 専用の path フィルタ付きワークフローは存在しない。」

**Verify**: `grep -n "tokens.yml" packages/token-pipeline/docs/terrazzo-integration.md` → 0件

### Step 2: README.md を CLAUDE.md と同期

- Packages 節に追記:
  - `@orca/react` — React コンポーネント実装（Tailwind v4 + token CSS 前提）
  - `apps/storybook` — コンポーネント確認用 Storybook（`pnpm storybook` で localhost:6006）
- 開発コマンドに `pnpm storybook` / `pnpm tokens` / `pnpm tokens:check` を追加。
- 記述の粒度・文体はルート `CLAUDE.md` の該当行に合わせる（丸写しでよい）。

**Verify**: `grep -n "@orca/react" README.md` → 1件以上、`grep -n "storybook" README.md` → 1件以上

### Step 3: token-pipeline CLAUDE.md の「絶対パス問題」を検証してから更新

1. まず現マシンで `pnpm --filter @orca/token-pipeline tokens:check` → exit 0 を確認。
2. `head -4 packages/token-pipeline/generated/tailwind-tokens.css` でヘッダが
   相対パス（`../tailwind.template.css`）であることを確認。
3. 両方確認できたら、CLAUDE.md の該当項目を以下の趣旨に書き換える:
   「かつて tailwind-tokens.css ヘッダにテンプレートの絶対パスが出力され別マシンで
   tokens:check が差分を出す問題があったが、現行の Terrazzo（2.2 系）では outDir
   相対パスに正規化されるため解消している。ヘッダが絶対パスに戻っていたら Terrazzo の
   バージョン差分を疑うこと。」
   （警告を**消す**のではなく「解消済み + 再発時の見分け方」に変える — 履歴的文脈を保持）

**Verify**: Step 3-1, 3-2 のコマンド結果が期待どおり

### Step 4: 全体検証

**Verify**: `pnpm turbo run build typecheck test tokens:check` → 全タスク成功

## Test plan

- ドキュメントのみの変更のためテスト追加なし。grep による記述の存在/不在チェックが
  機械的ゲート。

## Done criteria

- [ ] `grep -rn "tokens.yml" packages/ README.md` → 0件
- [ ] README.md に @orca/react と storybook の記載がある
- [ ] token-pipeline CLAUDE.md の絶対パス警告が「解消済み」記述に更新されている
- [ ] `pnpm turbo run build typecheck test tokens:check` 全タスク成功
- [ ] `plans/README.md` の Status 更新

## STOP conditions

- Step 3 で `tokens:check` が fail する、またはヘッダが絶対パスになっている
  （警告が実は正しい — その場合はドキュメントを直さず、実挙動の再現条件を報告）。

## Maintenance notes

- README と CLAUDE.md の二重管理はドリフトの温床。将来パッケージを増やす際は
  ルート CLAUDE.md を正本とし README は要約に留める、という一文を README 冒頭に
  足すことも検討（今回はスコープ外）。
