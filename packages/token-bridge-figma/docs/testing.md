# テストと検証

## 目的

このプロジェクトでは、同期ロジックの境界条件を壊しやすい。
そのため、変更前に失敗テストを書き、変更後に既存テストも含めて回す。

## 基本方針

- TDD を前提にする
- 仕様変更なら、まず失敗テストを 1 本追加する
- 表示変更でも、純粋関数に切り出せるならテストを書く
- Figma 実機確認が必要な変更でも、可能な限り pure function / mock で先に固定する

## テストコマンド

```bash
pnpm --filter @orca/token-bridge-figma test
pnpm --filter @orca/token-bridge-figma typecheck
pnpm --filter @orca/token-bridge-figma build
```

役割:

- `test`
  Node test runner によるユニットテスト
- `typecheck`
  TypeScript の型検証
- `build`
  Figma が読む `dist/` を更新

## テストファイルと守備範囲

- [tests/diff-apply.test.ts](../tests/diff-apply.test.ts)
  差分種別、三方向比較、選択適用
- [tests/default-resolution.test.ts](../tests/default-resolution.test.ts)
  初期選択
- [tests/diff-status.test.ts](../tests/diff-status.test.ts)
  Status 文言
- [tests/figma-apply.test.ts](../tests/figma-apply.test.ts)
  Figma 読み取り・反映・削除・mode・warning
- [tests/export.test.ts](../tests/export.test.ts)
  PR 対象ファイルと `syncedHash`
- [tests/github.test.ts](../tests/github.test.ts)
  GitHub API クライアント
- [tests/parse.test.ts](../tests/parse.test.ts)
  repo JSON 読み取り
- [tests/serialize.test.ts](../tests/serialize.test.ts)
  Figma snapshot からの直列化
- [tests/request-queue.test.ts](../tests/request-queue.test.ts)
  UI リクエストの逐次実行

## 変更前に考えること

- これは仕様変更か、不具合修正か、表示調整か
- 既存の差分種別の意味を変えるか
- `managed` / `syncedHash` / `updatedHash` に影響するか
- Figma 実機確認が必要か

## 実機確認が必要なケース

- `src/ui/*` を変更した
- `src/plugin/code.ts` のメッセージ連携を変えた
- `src/plugin/figma.ts` で Figma API 呼び出し順や create/update/delete 条件を変えた

その場合:

1. `pnpm --filter @orca/token-bridge-figma build`
2. Figma で plugin を再読み込み
3. 実際に差分を表示して確認

## 境界条件テストの観点

- `managed=true` と `managed=false` の違い
- 片側欠落の `create` / `delete`
- `update` と `conflict`
- alias cycle
- mode ID の source/actual 変換
- warning を返す未対応ケース
- 空の repo / 壊れた JSON / 部分読込失敗

## ドキュメント更新ルール

次に該当する変更では、テストだけでなくドキュメントも更新する。

- 差分種別の意味が変わる
- 初期選択の方針が変わる
- PR 作成と同期完了の扱いが変わる
- warning / 未対応条件が変わる

更新先:

- [sync-spec.md](./sync-spec.md)
- 必要に応じて [change-playbook.md](./change-playbook.md)
