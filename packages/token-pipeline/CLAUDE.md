# CLAUDE.md — @orca/token-pipeline

W3C DTCG 形式のトークン JSON を Terrazzo でビルドし、`generated/` に CSS と Tailwind 向けの出力を生成する。

## 作業前に読むもの

- **`docs/terrazzo-integration.md`** — Terrazzo 統合に関する設計判断。Extended Collection の前処理、`$type: "other"` の扱い、モード名一致の制約など。

## コマンド

```bash
pnpm --filter @orca/token-pipeline tokens        # 再生成
pnpm --filter @orca/token-pipeline tokens:check  # 再生成して差分が無いことを確認
```

## 忘れがちな点

- `tokens:check` は `tz build` の後に `git diff --exit-code generated/` で差分を検出する。トークン JSON を編集したら、再生成された CSS も合わせてコミットすること。`generated/` は gitignore しない。
- 現在の `terrazzo.config.mjs` は `tailwind-tokens.css` のヘッダにテンプレートの絶対パスを書き出すため、別のマシンや別のチェックアウトで `tokens:check` が差分を検出することがある（未対応）。
