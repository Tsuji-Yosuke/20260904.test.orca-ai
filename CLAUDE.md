# CLAUDE.md

## パッケージ

- **`@orca/design-language`** — デザインシステムの原典と contracts（SSOT）。コンポーネント原典は `components/` 配下、AC 契約と命名規則の正本は `packages/design-language/README.md`。
- **`@orca/figma-linter-plugin`** — Figma Variables の操作とデザイン整合性チェックを行う Figma Plugin。
- **`@orca/figma-linter-core`** — 検知ルール (SSoT = `docs/detection-rules.md`) と Figma 非依存の検査ロジック。figma-linter-plugin と figma-linter-ci が共有する。
- **`@orca/figma-linter-ci`** — Common UI Kit を Figma REST API で定期 lint する CI ランナー (read-only)。差分を Slack 通知する。
- **`@orca/token-bridge-figma`** — Figma の variables / styles と token JSON を双方向に同期する Figma Plugin。
- **`@orca/token-pipeline`** — W3C DTCG 形式のトークンを Terrazzo でビルドし、CSS と Tailwind 向けの出力を生成する。
- **`@orca/react`** — React コンポーネント実装（Button ほか）。Tailwind v4 + `@orca/token-pipeline` のトークン CSS を前提とする。

## アプリ

- **`apps/storybook`** — `@orca/react` のコンポーネントを動作確認する Storybook。テーマ切替は `data-theme` グローバル。

パッケージ固有の作業ガイドは各パッケージ直下の `CLAUDE.md` と `docs/` を参照。

## コンポーネント作成フロー

新規コンポーネントや大きな改修では、実装より先に
`packages/design-language/components/<Name>/<Name>.md` の骨格ドキュメントを整備する。
この文書は React props や Tailwind クラスではなく、コンポーネントの役割、意味、構造、
状態、アクセシビリティ、受け入れ条件を記述する SSOT とする。

見た目は Figma を優先する。Figma、design-language、既存実装、Storybook の間に齟齬がある場合は、
勝手に判断せず、何を正とし、どこを更新するべきかをユーザーに確認する。
この裁定ルールの正本はここ（ルート CLAUDE.md）とし、各文書・skill からは参照する。

Claude Code では必要に応じて以下の project skill を使う。

- `/orca-component-design-doc` — design-language のコンポーネント原典を作る/改善する。
- `/orca-react-component` — ready な原典をもとに React 実装を TDD で作る/直す。

同じ手順の詳細は `.claude/skills/orca-component-design-doc/SKILL.md` と
`.claude/skills/orca-react-component/SKILL.md` を参照。Codex など
Claude Code 以外のエージェントも、同じ `SKILL.md` を手順書として読む。

## ルートから叩くコマンド

以下は Turborepo 経由で全パッケージを横断する。

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm storybook      # React と Figma Plugin の Storybook を起動（localhost:6006 / 6007）
pnpm tokens         # token-pipeline のトークンを再生成
pnpm tokens:check   # 再生成して差分が無いことを確認
```

## Git worktree

worktree を使うときの置き場とポート:

```bash
git worktree add ../orca-worktrees/<slug> -b <branch> origin/main
cd ../orca-worktrees/<slug>
pnpm install          # worktree ごとに必要（pnpm store 共有なので速い）
```

- worktree 側の Storybook は別ポートで起動する（例: `--port 6106`）。
- マージ後は `git worktree remove ../orca-worktrees/<slug>` で片付ける。

## CI

`.github/workflows/ci.yml` が PR と `main` への push で全 package の build / typecheck / test と、
token・registry の整合チェック、Figma Plugin の Storybook build を回す。

`.github/workflows/figma-linter.yml` が毎週火曜 10:00 (JST) に Common UI Kit を REST API で lint し、
前回レポートとの差分を Slack へ通知する (運用手順は `packages/figma-linter-ci/README.md`)。
