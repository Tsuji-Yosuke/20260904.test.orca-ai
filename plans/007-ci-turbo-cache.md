# Plan 007: CI に Turborepo キャッシュを永続化して無変更パッケージの再ビルドを無くす

> **Executor instructions**: このプランをステップ順に実行すること。各ステップの
> 検証コマンドを実行し、期待結果を確認してから次に進む。「STOP conditions」の
> いずれかが発生したら、改善を試みずに停止して報告する。完了したら
> `plans/README.md` の該当行の Status を更新する。
>
> **Drift check (最初に実行)**: `git diff --stat 73dd926..HEAD -- .github/workflows/ci.yml turbo.json`
> 差分がある場合は「Current state」の抜粋と現物を突合し、不一致なら STOP。

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW（キャッシュ汚染疑い時は key を回すだけで戻せる）
- **Depends on**: none
- **Category**: perf / dx
- **Planned at**: commit `73dd926`, 2026-07-07

## Why this matters

CI は毎回 `pnpm turbo run build typecheck test tokens:check` をコールドで実行して
いる。`setup-node` の `cache: pnpm`（依存ストアのみ）はあるが、Turborepo のタスク
キャッシュ（`.turbo`）が永続化されていないため、無変更のパッケージも毎回ビルド・
テストされる。5 パッケージのモノレポでタスクグラフを活かせておらず、全 PR の
フィードバックが恒常的に遅い。

## Current state

`.github/workflows/ci.yml`（全文確認済み）:
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build typecheck test tokens:check
```

`turbo.json` にはタスク定義のみ（`remoteCache` 設定なし）。ローカルの turbo は
バージョン `^2.3.3`（ルート package.json）。

**注意**: `tokens:check` は「生成物を再生成して git diff が無いこと」を検証する
タスクで、`turbo.json` 上 outputs を持たない（`"tokens:check": {}`）。キャッシュが
効いても検証意味は保たれるが、Step 2 の検証で必ず確認すること。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| ローカルでのキャッシュ確認 | `pnpm turbo run build --cache-dir=.turbo-cache-test && pnpm turbo run build --cache-dir=.turbo-cache-test` | 2回目に `FULL TURBO`（全タスク cache hit） |
| 後片付け | `rm -rf .turbo-cache-test` | — |
| 全体検証 | `pnpm turbo run build typecheck test tokens:check` | 全タスク成功 |

## Scope

**In scope**:
- `.github/workflows/ci.yml`

**Out of scope**:
- Turbo Remote Cache（Vercel / 自前）の導入 — 効果は大きいが外部サービス契約の判断が
  要るため今回は actions/cache 方式に留める（Maintenance notes 参照）
- `turbo.json` のタスク定義変更
- 他のワークフローの新設（path フィルタ付き分割など）

## Git workflow

- ブランチ: `ci/turbo-cache`
- コミット例: `ci: persist Turborepo task cache across runs`
- push / PR 作成はオペレーターの指示があるまで行わない。

## Steps

### Step 1: ci.yml にキャッシュを追加

`pnpm install` ステップの前に追加し、turbo コマンドに `--cache-dir` を付ける:

```yaml
      - uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ runner.os }}-${{ github.sha }}
          restore-keys: |
            turbo-${{ runner.os }}-
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build typecheck test tokens:check --cache-dir=.turbo
```

ポイント:
- `key` に `github.sha` を含めることで各コミットで保存し、`restore-keys` の prefix
  フォールバックで直近のキャッシュを引き継ぐ（Turborepo 公式ドキュメントの
  GitHub Actions レシピと同じ構成）。
- `--cache-dir=.turbo` はローカルキャッシュの場所を明示し、actions/cache の `path` と
  一致させるために必須。

**Verify（ローカル）**: 「Commands you will need」の cache-dir 二連実行で 2回目が
全タスク cache hit（`FULL TURBO` 表示）になること。実行後 `rm -rf .turbo-cache-test`
で後片付けし、`git status` に生成物以外の差分が無いこと。

### Step 2: tokens:check の意味が保たれることを確認

ローカルで `pnpm turbo run tokens:check --cache-dir=.turbo-cache-test` を2回実行し、
2回目が cache hit でも exit 0 であること、また
`packages/token-pipeline/generated/` に差分が発生しないことを確認する
（`git status --short packages/token-pipeline/generated` → 空）。

**Verify**: 上記コマンド exit 0 / git status 空。終わったら `.turbo-cache-test` を削除。

### Step 3: 全体検証

**Verify**: `pnpm turbo run build typecheck test tokens:check` → 全タスク成功
（`--cache-dir` なし＝従来経路が壊れていないこと）

## Test plan

- CI 上の実効果（2回目以降の run で cache hit）はマージ後にしか観測できない。
  PR 説明に「マージ後、次の PR の verify ジョブで `cache hit` ログを確認すること」
  と明記する。

## Done criteria

- [ ] ci.yml に actions/cache ステップと `--cache-dir=.turbo` が入っている
- [ ] ローカルの二連実行で 2回目が FULL TURBO
- [ ] `pnpm turbo run build typecheck test tokens:check` 全タスク成功
- [ ] 変更ファイルが ci.yml のみ
- [ ] `plans/README.md` の Status 更新

## STOP conditions

- ローカルの二連実行で 2回目に cache hit しないタスクがある（タスクの outputs /
  inputs 定義に問題がある可能性 — turbo.json はスコープ外なので停止して報告）。
- `tokens:check` が cache hit で意味を失う挙動（例: 生成し直さず PASS するのに
  実際は差分がある）を確認した場合 — `tokens:check` を `--force` 対象にするか
  cache 対象から外す判断が必要なので停止して報告。

## Maintenance notes

- 将来の強化: Turbo Remote Cache（Vercel 無料枠 or 自前 S3）にすると PR 間・
  ブランチ間でもキャッシュ共有できる。actions/cache はブランチスコープの制約
  （デフォルトブランチ由来のキャッシュのみ全ブランチから参照可）がある。
- キャッシュ汚染を疑ったら key の prefix（`turbo-` → `turbo-v2-`）を変えれば全破棄できる。
