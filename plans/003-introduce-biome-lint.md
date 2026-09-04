# Plan 003: Biome を導入し、実体のない lint タスクを本物にする

> **Executor instructions**: このプランをステップ順に実行すること。各ステップの
> 検証コマンドを実行し、期待結果を確認してから次に進む。「STOP conditions」の
> いずれかが発生したら、改善を試みずに停止して報告する。完了したら
> `plans/README.md` の該当行の Status を更新する。
>
> **Drift check (最初に実行)**: `git diff --stat 73dd926..HEAD -- package.json turbo.json .github/workflows/ci.yml`
> 差分がある場合は「Current state」の抜粋と現物を突合し、不一致なら STOP。

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW〜MED（初回の一括フォーマットで大きな diff が出る）
- **Depends on**: none（ただし進行中のコンポーネント PR とのコンフリクトを避けるため、大きな open PR のマージ直後に実行するのが望ましい — Maintenance notes 参照）
- **Category**: dx
- **Planned at**: commit `73dd926`, 2026-07-07

## Why this matters

このリポジトリには lint / formatter / pre-commit が一切存在しない（`.eslintrc*`,
`eslint.config.*`, prettier, biome, husky すべて無し）。それにもかかわらず
`package.json:12` に `"lint": "turbo run lint"`、`turbo.json:25` に `"lint": {}` が
定義されており、**どのパッケージも lint スクリプトを持たないため `pnpm lint` は
何も実行せず成功する**。「lint している」という誤った安心感が最も有害。未使用
import・floating promise・a11y 崩れの検出がレビュー時の目視頼みになっている。
Biome 1本で lint + format を実体化し、CI ゲートに載せる。

## Current state

- `package.json`（ルート、抜粋・確認済み）:
  ```json
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    ...
  },
  "devDependencies": { "turbo": "^2.3.3", "typescript": "^5.9.3" }
  ```
- `turbo.json` に `"lint": {}`（空タスク）。どの `packages/*/package.json` /
  `apps/*/package.json` にも `lint` スクリプトは無い（grep 済み）。
- `.github/workflows/ci.yml` の検証は
  `pnpm turbo run build typecheck test tokens:check` の1行のみ。
- **フォーマット対象外にすべき領域**（重要）:
  - `packages/token-pipeline/generated/` — Terrazzo 生成物。整形すると `tokens:check`
    （`git diff --exit-code generated/`）が壊れる。
  - `packages/token-pipeline/tokens/` — Figma プラグインが export した JSON。整形すると
    プラグイン出力との roundtrip 差分が出て同期が壊れる。
  - `packages/token-bridge-figma/.tmp-tests/`, `.tmp-tokens/`, `storybook-static/`,
    `node_modules/`, `pnpm-lock.yaml`, `.claude/`, `plans/`
- 言語構成: TypeScript + React 19（packages/react, apps/storybook）、
  Preact（packages/token-bridge-figma/src/ui — JSX runtime が異なる）、
  ESM `.mjs`（packages/token-pipeline/scripts, tests）。
- コメントは日本語がリポジトリ規約。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install -w -D @biomejs/biome` | exit 0 |
| Lint 実行 | `pnpm lint` | exit 0（導入完了後） |
| 自動修正 | `pnpm exec biome check --write .` | exit 0 |
| 全体検証 | `pnpm turbo run build typecheck test tokens:check` | 全タスク成功 |

## Scope

**In scope**:
- ルート `package.json`（biome devDependency 追加、`lint` / `format` スクリプト変更）
- `biome.json`（新規作成）
- `.editorconfig`（新規作成）
- `turbo.json`（空の `lint` タスクの削除）
- `.github/workflows/ci.yml`（lint ステップ追加）
- 一括フォーマット・自動修正によるソースファイルの整形 diff（`packages/*/src`, `apps/*/`, `packages/token-pipeline/scripts`, `tests`）

**Out of scope**:
- pre-commit hook（husky / lefthook）の導入 — 今回は CI ゲートまで。フォローアップ。
- lint エラーを黙らせるための挙動変更を伴うコード修正 — 自動修正で直らない指摘は
  ルール緩和 or `biome-ignore` コメント（理由付き）で対応し、ロジックは変えない。
- `packages/token-pipeline/generated/`, `packages/token-pipeline/tokens/` 配下（絶対に整形しない）。

## Git workflow

- ブランチ: `chore/introduce-biome`（main から分岐）
- **コミットを2つに分ける（Tidy First）**:
  1. `chore: add Biome config and wire lint scripts`（設定のみ）
  2. `style: apply Biome format and safe fixes`（機械的整形のみ、ロジック変更なし）
- push / PR 作成はオペレーターの指示があるまで行わない。

## Steps

### Step 1: Biome を導入し設定を書く

`pnpm install -w -D @biomejs/biome` 後、ルートに `biome.json` を作成:

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/latest/schema.json",
  "files": {
    "includes": [
      "**",
      "!**/node_modules",
      "!**/dist",
      "!**/.turbo",
      "!**/.tmp-tests",
      "!**/.tmp-tokens",
      "!**/storybook-static",
      "!packages/token-pipeline/generated",
      "!packages/token-pipeline/tokens",
      "!pnpm-lock.yaml",
      "!.claude",
      "!plans"
    ]
  },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "javascript": { "formatter": { "quoteStyle": "double" } }
}
```

注意: インストールされた Biome のメジャーバージョンで `files.includes`（2.x）か
`files.ignore`（1.x）かが異なる。`pnpm exec biome --version` を確認し、そのバージョンの
スキーマに合わせること（上記は 2.x 形式）。quoteStyle はリポジトリの現状（ダブル
クォート優勢 — `packages/react/src/Button/Button.tsx` 等で確認）に合わせる。

**Verify**: `pnpm exec biome check . 2>&1 | tail -5` → エラーがあっても実行自体が
成功し、対象ファイル数が表示される（generated/ や tokens/ が対象に**含まれない**こと
を出力で確認）

### Step 2: スクリプトを実体化する

- ルート `package.json`: `"lint": "biome check ."`, `"format": "biome check --write ."` に変更。
- `turbo.json`: 空の `"lint": {}` タスクを削除（turbo 経由をやめ、ルート直接実行に
  一本化。パッケージごとの lint スクリプトは追加しない）。

**Verify**: `pnpm lint` が biome を実行する（no-op でないことを出力で確認）

### Step 3: 自動修正と一括整形（コミット2つ目）

1. まず Step 1〜2 の設定だけをコミット。
2. `pnpm exec biome check --write .` を実行し、フォーマットと safe fix を適用。
3. 残る lint エラーを確認する。**ロジック変更が必要な指摘は直さない**:
   - 明白な未使用 import 削除・型 import 化などの機械的修正 → 適用してよい。
   - 挙動に影響しうる指摘（例: useExhaustiveDependencies、floating promise）→
     `biome.json` でそのルールを `"warn"` に下げるか、行単位の
     `// biome-ignore lint/<rule>: <理由>` で明示的に残す。どちらにしたかを報告に列挙。
4. `git diff --stat` で `packages/token-pipeline/generated/` と
   `packages/token-pipeline/tokens/` に**差分が無い**ことを確認（あれば即 revert して
   biome.json の除外設定を直す）。

**Verify**: `pnpm lint` → exit 0

### Step 4: CI にゲートを追加

`.github/workflows/ci.yml` の `pnpm turbo run build typecheck test tokens:check` の
**前**に `- run: pnpm lint` ステップを追加（lint は速いので先に fail-fast させる）。

**Verify**: yml の構文確認として `node -e "console.log('ok')"` 相当は不要 —
`git diff .github/workflows/ci.yml` を目視し、ステップが1つ増えただけであること。

### Step 5: .editorconfig を追加

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
```

### Step 6: 全体検証

**Verify**: `pnpm turbo run build typecheck test tokens:check && pnpm lint` → すべて成功。
特に `tokens:check` が通ること（生成物を整形していない証明）。

## Test plan

- 既存テストがすべて通ること自体が「整形がロジックを変えていない」ことの検証。
  新規テストは書かない。

## Done criteria

- [ ] `pnpm lint` が Biome を実際に実行し exit 0
- [ ] `pnpm turbo run build typecheck test tokens:check` 全タスク成功（tokens:check 含む）
- [ ] `git log --oneline -2` で設定コミットと整形コミットが分離している
- [ ] `git diff 73dd926..HEAD -- packages/token-pipeline/generated packages/token-pipeline/tokens` が空
- [ ] ci.yml に lint ステップが存在する
- [ ] `plans/README.md` の Status 更新

## STOP conditions

- 自動修正後にテストが fail し、原因の切り分けに2回失敗した（整形が挙動を変えた疑い）。
- lint エラーが 100 件を超え、ルール緩和リストが膨らみすぎる（recommended の採用可否
  自体を再検討すべき — 停止してエラー内訳を報告）。
- `tokens:check` が fail する（生成物・トークン JSON の除外漏れ。設定を直しても解消
  しない場合は停止）。

## Maintenance notes

- **実行タイミング**: 一括整形は全ファイルに触るため、open 中の PR（#14〜#20 の
  コンポーネント再整合 PR 群）と激しく衝突する。オペレーターと相談し、直近マージの
  谷間で実行すること。open PR 側は rebase 時に `pnpm format` を一度かければ揃う。
- フォローアップ候補: lefthook による pre-commit（変更ファイルのみ `biome check`）、
  `useExhaustiveDependencies` 等を warn→error に昇格。
- レビュー観点: コミット2つ目に機械的整形以外の変更が混ざっていないか。
