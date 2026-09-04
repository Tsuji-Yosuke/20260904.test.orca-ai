# CLAUDE.md — @orca/token-bridge-figma

Figma の local variables / styles と GitHub 上の token JSON を双方向に同期する Figma Plugin。

## 作業前に読むもの

- **`docs/sync-spec.md`** — 同期仕様の正本。`managed` / `create` / `delete` の差分種別と「PR 作成 ≠ 同期完了」を定義している。同期ロジックを触る前に必ず読む。
- `docs/architecture.md` — モジュール構成と主要フロー。どこに責務があるかを最短で把握したいときに。
- `docs/change-playbook.md` — 「この変更がどのファイルとテストに波及するか」の対応表。
- `docs/figma-concepts.md` — Figma の Variable / Style / Mode / Extended Collection の予備知識。
- `docs/testing.md` — TDD の進め方と境界条件テストの観点。

## コマンド

```bash
pnpm --filter @orca/token-bridge-figma test
pnpm --filter @orca/token-bridge-figma typecheck
pnpm --filter @orca/token-bridge-figma build
```

## 忘れがちな点

`manifest.json` が読むのは `dist/code.js` と `dist/ui.html` なので、`src/` を編集したら必ず `build` を走らせ、Figma 側でプラグインを再読み込みする。UI の文言を変えただけでも build が要る。
