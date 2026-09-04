# Figma Variable Sync 仕様メモ

## 目的

このドキュメントは、Figma Variable Sync における同期判定と推奨動作の基準を明文化するためのメモである。
特に、`managed`、`create/update/delete/conflict`、PR 作成と同期完了の違い、曖昧な境界条件を定義する。

## 用語

- Figma 側
  Figma の local variables / local styles / pluginData を指す。
- GitHub 側
  repo 上の token JSON と、その `$extensions.figmaSync` を指す。
- 同期対象
  本プラグインが読み書きする variable / collection / style。
- `updatedHash`
  現在の内容から計算されるハッシュ。
- `syncedHash`
  前回同期基準として記録されたハッシュ。
- `managed`
  過去にこのプラグインの管理下に入った既知の同期対象であることを示すフラグ。

## `managed` の定義

`managed=true` は「このエンティティは過去に同期対象として確立されていた」を意味する。

これは以下とは区別する。

- 単に Figma に存在する
- 単に repo に JSON が存在する
- 現在も両側で完全一致している

`managed=false` または未設定のエンティティは、未同期の新規候補として扱う。

## 差分種別

### `update`

同一エンティティが両側に存在し、三方向比較の結果、片側だけが更新されている場合。

- Figma 側のみ変更: 推奨方向は `figma-to-repo`
- GitHub 側のみ変更: 推奨方向は `repo-to-figma`

### `conflict`

同一エンティティが両側に存在し、両側が同期基準から変更されている、または同期基準が判定できない場合。

この場合は自動推奨を行わず、人間が選ぶ。

### `create`

片側にしか存在せず、かつそのエンティティが `managed=false` の場合。

- Figma のみにある: Figma で新規作成された候補
- GitHub のみにある: repo で新規作成された候補

### `delete`

片側にしか存在せず、かつそのエンティティが `managed=true` の場合。

これは「過去に同期されていた既知のエンティティが、片側から消えた」と解釈する。

## 初期選択の仕様

### 過渡期の方針（暫定）

Figma 側の variable 構造刷新に追従している間は、repo を Figma の完全な鏡にすることを優先し、
**`Resolution` の初期値を全件 `figma-to-repo` とする**（`src/ui/default-resolution.ts`）。
`figma-to-repo` は Figma を一切変更せず repo 側だけを Figma に合わせる方向のため、
過渡期に「Figma を正」とする運用と整合する。過渡期が終わったら下記の方向別ロジックに戻す。

### 通常時の仕様

差分一覧の `Resolution` の初期値は以下とする。

- `update`:
  `preferredDirection` をそのまま使う
- `create` かつ GitHub 側が欠落:
  `figma-to-repo`
- `create` かつ Figma 側が欠落:
  `repo-to-figma`
- `delete` かつ GitHub 側が欠落:
  `repo-to-figma`
- `delete` かつ Figma 側が欠落:
  `figma-to-repo`
- `conflict`:
  `skip`

補足:
`delete` の初期選択は「`managed=true` の既知要素が片側から消えたなら、その削除をもう片側にも反映する方向を初期値とする」という方針に基づく。

## Status 表示の仕様

`Status` は意味を伝えるための表示であり、内部差分種別と 1:1 の文言ではない。

- `create`:
  `Figma のみ` / `GitHub のみ`
- `delete`:
  `GitHub になし` / `Figma になし`
- `update`:
  `Figma 更新` / `GitHub 更新`
- `conflict`:
  `要確認`

`delete` を UI で中立文言にしているのは、「削除された」と断定するより「その側に現在存在しない」を示した方が誤読が少ないため。

## 三方向比較の仕様

判定の主基準は時刻ではなく `updatedHash` / `syncedHash` である。

理由:

- Figma 側には variable/style 単位の信頼できる最終更新時刻を前提にできない
- Git 側の commit 時刻も token 単位ではなく、1 ファイルに複数 token が入る

したがって、時刻は主判定には使わず、必要なら将来 UI 上の補助情報としてのみ使う。

## PR 作成と同期完了

PR 作成は同期完了ではない。

- `export-figma-to-github`:
  PR を作るだけ
- merge 完了:
  まだプラグインは自動では把握しない
- 同期収束確認:
  再度 scan / diff を実行して確認する

このため、Figma 側 pluginData の `syncedHash` は PR 作成時点では進めない。
一方で、repo に出力する JSON の `syncedHash` は出力内容に合わせて進める。

## 部分適用と PR 粒度

部分適用で `figma-to-repo` を選んでも、repo 上の保存単位は token 単位ではなくファイル単位である。

- variable は collection ごとの JSON
- style は style type ごとの JSON

そのため、1 token の変更でも関連ファイル全体が再生成される。
これは現在のファイルフォーマット上の制約である。

## Figma 反映の仕様

- `repo-to-figma` の create/update は Figma に create/update を行う
- `repo-to-figma` の delete は、明示選択された場合のみ Figma 実体を削除する
- import 全体では、ドキュメントに含まれない managed エンティティを自動削除しない

補足:
「全面 import では自動削除しない」と「delete を明示選択した場合は削除する」は両立する仕様である。

## 未対応・制約

### collection default mode

Figma Plugin API の制約上、repo から Figma の collection default mode を強制変更できない。
この場合は warning を返す。

### unsupported style / binding

一部 style や binding は読み取れても完全再現できない。
この場合は warning を返し、黙って成功扱いにはしない。

### invalid JSON

repo 内に壊れた JSON があっても、読めるファイルは継続して読み込む。
ただし warning を出す。

### Extended Collection の親が特定できない場合

scan 時に Extended Collection の parentCollectionId が API からも
前回 scan の pluginData からも解決できない場合、warning を出し、
そのコレクションを repo ファイル出力から除外する（独立コレクションとして
出力すると親コレクションの値を :root で上書きしてしまうため）。
repo 側の既存ファイルは保持され、削除対象にもならない。

### コレクションをリネーム / 削除した後に残る古いファイル

repo の variables ファイル名はコレクション名由来のため、リネームすると旧名のファイルがリポジトリに残り続ける。PR 作成時に base branch の現状ファイルと出力を突き合わせ、
出力に含まれない variables ファイルを削除パスとして PR に含める。

- 全面 export: リネームの旧パスと、Figma から削除されたコレクションのファイルを削除する
- 部分適用: 対象コレクションの古いファイルだけを削除し、対象外のファイルは触らない
- styles ファイルはパス固定のため対象外

## 運用上の前提

このプラグインは「常に真実を自動推定する」ものではなく、「同期候補を提示し、人間が最終判断する」設計である。

特に以下は人間の判断が必要である。

- 両側変更の conflict
- `managed=true` だが片側欠落している delete の妥当性
- warning を伴う同期の続行可否

## 今後の拡張候補

- Git 側 commit 時刻を補助情報として表示する
- sync session / export session の概念を導入する
- repo 空状態を初回同期として明示的に扱うモードを追加する
