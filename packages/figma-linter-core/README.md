# @orca/figma-linter-core

Orca DS の検知ルール (SSoT) と、Figma 非依存の検査ロジック。

Figma プラグイン (`@orca/figma-linter-plugin` の「チェックデザイン」「横断チェック」) と、
CI の定期 lint (`@orca/figma-linter-ci`) が **同じ判定コアを共有**するためのパッケージです。
ルールや判定を変えるときは必ずここを変更し、消費者ごとにロジックを複製しないでください。

## 構成

```
docs/detection-rules.md   検知ルール仕様 + エラー文 = SSoT (唯一の正)。人間向け
src/
  rules.ts                ルールカタログ (コード側の SSoT。docs に従属)
  rules.test.ts           docs のルール表 ↔ rules.ts の整合を強制するテスト
  error-messages.ts       エラー文カタログ (docs の「エラー文」表に従属)
  error-messages.test.ts  docs のエラー文表 ↔ カタログの整合を強制するテスト
  check-types.ts          検査結果の共有型 (CheckRow / FixDiff / ConsistencyReport 等)
  adapter.ts              LintNode / LintVariable / LintAdapter (Figma アクセスの抽象)
  inspect/                機能4 (単体検査) の判定ロジック
  consistency.ts          機能5 (バリアント比較) のレポート組み立て
  consistency-core.ts     機能5 の純推論 (軸推論・多数決)
```

## アダプタ境界

検査ロジックは `figma` グローバルにも REST API にも依存せず、`src/adapter.ts` の
インターフェースだけを見ます。実装は 2 つ:

| 消費者 | アダプタ | 書き込み (自動修正) |
| --- | --- | --- |
| `@orca/figma-linter-plugin` | Plugin API (`src/main/adapter.ts`) | あり (binder 提供) |
| `@orca/figma-linter-ci` | REST API (`src/rest-adapter.ts`) | なし (read-only) |

アダプタが応答すべきフィールド名の契約は `src/adapter.ts` の冒頭コメントを参照。

## ルールの追加・変更手順

1. `docs/detection-rules.md` のルール表と詳細節を更新する (**まず文書**)。
2. `src/rules.ts` のカタログを同じ内容に更新する。
3. 必要なら `src/inspect/` の判定ロジックを実装する。
4. エラー文が必要なら docs の「エラー文」表と `src/error-messages.ts` を更新する。
5. `pnpm --filter @orca/figma-linter-core test` — `rules.test.ts` と `error-messages.test.ts` が
   文書とカタログの整合を検査する (ズレていれば落ちる)。
5. 消費者側の確認: `pnpm --filter @orca/figma-linter-plugin test typecheck` /
   `pnpm --filter @orca/figma-linter-ci test typecheck`。

## コマンド

```bash
pnpm --filter @orca/figma-linter-core test        # vitest (ルール整合 / 純推論)
pnpm --filter @orca/figma-linter-core typecheck
```
