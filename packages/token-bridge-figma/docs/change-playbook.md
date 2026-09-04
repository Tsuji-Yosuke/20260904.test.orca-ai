# 変更プレイブック

## 目的

このドキュメントは、「ある変更をしたいときに、どこを触り、どのテストを追加するか」をすぐ判断できるようにするためのメモである。

## 基本方針

- 先に仕様変更か表示変更かを分ける
- 仕様変更なら [sync-spec.md](./sync-spec.md) を更新する
- テストを先に足す
- UI を触ったら最後に `pnpm --filter @orca/token-bridge-figma build`

## よくある変更と触る場所

### 差分の意味を変えたい

例:

- `managed=true` の扱いを変えたい
- `delete` と `create` の境界を変えたい
- 三方向比較の基準を変えたい

触る場所:

- [src/core/diff.ts](../src/core/diff.ts)
- [sync-spec.md](./sync-spec.md)
- [tests/diff-apply.test.ts](../tests/diff-apply.test.ts)

### 初期選択のおすすめを変えたい

例:

- `delete` の初期選択を反転したい
- `update` の推奨方向を調整したい

触る場所:

- [src/ui/default-resolution.ts](../src/ui/default-resolution.ts)
- [tests/default-resolution.test.ts](../tests/default-resolution.test.ts)
- 必要なら [sync-spec.md](./sync-spec.md)

### Status 文言を変えたい

触る場所:

- [src/ui/diff-status.ts](../src/ui/diff-status.ts)
- [tests/diff-status.test.ts](../tests/diff-status.test.ts)
- `pnpm --filter @orca/token-bridge-figma build`

### Figma 読み取り仕様を変えたい

例:

- mode ID 正規化
- pluginData の解釈
- style の bound variable 読み取り

触る場所:

- [src/plugin/figma.ts](../src/plugin/figma.ts)
- [src/core/serialize.ts](../src/core/serialize.ts)
- [tests/figma-apply.test.ts](../tests/figma-apply.test.ts)
- [tests/serialize.test.ts](../tests/serialize.test.ts)

### Figma 反映仕様を変えたい

例:

- 明示 delete の削除条件
- style の create/update 挙動
- warning の出し方

触る場所:

- [src/plugin/figma.ts](../src/plugin/figma.ts)
- [tests/figma-apply.test.ts](../tests/figma-apply.test.ts)

### Repo JSON 仕様を変えたい

例:

- `$extensions.figmaSync` の項目を増やす
- collection metadata の保存形式を変える
- DTCG 互換形式（`$value` / `$extensions.mode`）の出力ルールを変える

触る場所:

- [src/core/parse.ts](../src/core/parse.ts)
- [src/core/serialize.ts](../src/core/serialize.ts)
- [tests/parse.test.ts](../tests/parse.test.ts)
- [tests/serialize.test.ts](../tests/serialize.test.ts)

### 選択適用の挙動を変えたい

例:

- `apply-selected` の merge ルール
- collection 単位の扱い

触る場所:

- [src/core/apply.ts](../src/core/apply.ts)
- [src/plugin/code.ts](../src/plugin/code.ts)
- [tests/diff-apply.test.ts](../tests/diff-apply.test.ts)

### GitHub への出力粒度を変えたい

例:

- PR 対象ファイルの絞り込み
- `syncedHash` の進め方

触る場所:

- [src/core/export.ts](../src/core/export.ts)
- [src/core/github.ts](../src/core/github.ts)
- [tests/export.test.ts](../tests/export.test.ts)
- [tests/github.test.ts](../tests/github.test.ts)

### UI を触りたい

例:

- 差分表の表示
- 文言
- 設定フォーム

触る場所:

- 画面構成の変更: [src/ui/components/App.tsx](../src/ui/components/App.tsx)
- メイン画面: [src/ui/components/MainScreen.tsx](../src/ui/components/MainScreen.tsx)
- 設定画面: [src/ui/components/ConfigScreen.tsx](../src/ui/components/ConfigScreen.tsx)
- 差分テーブル: [src/ui/components/DiffTable.tsx](../src/ui/components/DiffTable.tsx) / [DiffRow.tsx](../src/ui/components/DiffRow.tsx)
- ステータス表示: [src/ui/components/StatusBar.tsx](../src/ui/components/StatusBar.tsx)
- 警告一覧: [src/ui/components/WarningList.tsx](../src/ui/components/WarningList.tsx)
- ステート管理: [src/ui/state.ts](../src/ui/state.ts)（signal ベース）
- CSS: [src/ui/index.html](../src/ui/index.html)（`<style>` 内）
- 必要に応じて [src/ui/default-resolution.ts](../src/ui/default-resolution.ts)
- 必ず `pnpm --filter @orca/token-bridge-figma build`

## 変更ごとの確認項目

### 差分変更

- `create/update/delete/conflict` のどれが変わるか
- UI の `Status` と `Resolution` の意味がズレていないか
- `apply-selected` の実際の動作と矛盾しないか

### Figma 反映変更

- create/update/delete の各方向でどうなるか
- warning にする条件が silent failure になっていないか
- mode ID / alias / sourceId が壊れていないか

### UI 変更

- `src/` だけでなく `dist/` も更新したか
- Figma で実際に再読み込みしたか

## 手元で迷ったときの最小確認

```bash
pnpm --filter @orca/token-bridge-figma test
pnpm --filter @orca/token-bridge-figma build
```

その上で、Figma 側で plugin を再読み込みする。
