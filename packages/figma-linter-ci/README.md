# @orca/figma-linter-ci

Common UI Kit (Figma) を REST API で読み取り、`@orca/figma-linter-core` の検知ルールで
定期 lint する CI ランナー。検査は read-only で、Figma ファイルには一切書き込みません。

- **機能4 (単体検査)**: 全ページのマスターコンポーネント (Component Set の各バリアント +
  スタンドアロンの Component) が正しい System トークンを使っているか。
- **機能5 (バリアント比較)**: Component Set 内で「単体では正しいのに仲間と揃っていない」
  トークンが無いか (機能4 と重複するセル・多数決が同数のグループは通知しない)。
- 名前が `_` / `.` で始まる**ページとコンポーネントは除外** (WIP / 非公開の命名規則)。
- Component Set の「枠」自体は機能4 の対象にしない (デザイン成果物ではないため。
  プラグインで Set を直接選択した場合とはこの 1 点だけ挙動が異なる)。

## 仕組み

```
cron (毎週火曜 JST 10:00) / 手動
  → GET /v1/files/:key + /v1/files/:key/variables/local
  → 検知コア (プラグインと同一) で lint
  → reports/common-ui-kit.json (前回分) と差分
  → 新規違反 + 解消件数を Slack へ通知 (Webhook 未設定なら Actions Summary のみ)
  → 今回レポートを main へ bot commit (次回の差分基準)
```

Workflow: [`.github/workflows/figma-linter.yml`](../../.github/workflows/figma-linter.yml)

## セットアップ (リポジトリ設定)

| 種別 | 名前 | 内容 |
| --- | --- | --- |
| Secret | `FIGMA_TOKEN` | Figma トークン。PAT / **Plan Access Token** どちらも可 (`X-Figma-Token` にそのまま使う)。スコープに file 読取 + `file_variables:read` が必要 (Variables は Enterprise 限定 API) |
| Secret | `SLACK_WEBHOOK_URL` | 通知先の Incoming Webhook。未設定の間は Summary のみで動く |
| Variable | `FIGMA_TOKEN_EXPIRES` | トークン失効日 (YYYY-MM-DD)。残り 14 日を切ると通知に警告が載る |

### トークンのローテーション

1. クライアント管理者に新しいトークンの発行を依頼する (PAT は最長 90 日 /
   Plan Access Token は最長 365 日なので、可能になり次第 Plan Access Token へ移行する)。
2. `FIGMA_TOKEN` Secret と `FIGMA_TOKEN_EXPIRES` Variable を更新する。コード変更は不要。

## ローカル実行

```bash
FIGMA_TOKEN=... pnpm --filter @orca/figma-linter-ci lint:figma -- --dry-run  # レポートを書かずに実行
FIGMA_TOKEN=... pnpm --filter @orca/figma-linter-ci lint:figma               # reports/ を更新
FIGMA_TOKEN=... pnpm --filter @orca/figma-linter-ci spike                    # REST 疎通スパイク (下記)
pnpm --filter @orca/figma-linter-ci test                                     # fixture による統合テスト
```

環境変数: `FIGMA_FILE_KEY` (既定: Common UI Kit) / `REPORT_PATH` / `SLACK_WEBHOOK_URL` /
`FIGMA_TOKEN_EXPIRES`。フラグ: `--dry-run` / `--fail-on-violations`。

### スパイク (初回運用前に 1 度実行すること)

REST アダプタは Figma REST API の仕様に基づいて実装しているが、実ファイルでの疎通は
トークンが用意でき次第 `spike` で確認する。出力は**構造情報のみ** (フィールドの出現数・
boundVariables のキー一覧・コレクション名) で、デザインの実値は含まない・保存しない。
確認ポイント:

- `boundVariables` のキーが adapter の契約 (height / padding* / itemSpacing / radius 四隅) と
  一致しているか (radius の配列表現 `rectangleCornerRadii` は対応済み)
- `COMPONENT_SET` が `componentPropertyDefinitions` を持つか (無ければバリアント名から
  軸をフォールバック導出する)
- Variables のコレクション名 (Dimension System / Color System) が名前解決ヒントに合うか

## レポートと差分通知

- `reports/common-ui-kit.json` が正本。違反は**名前ベースの安定キー** (ページ /
  コンポーネント / ノードパス / ルール ID) で識別し、node-id はキーに使わない。
- 通知の内容は**前回との差分** (新規違反 + 解消件数)。差分ゼロでも毎回 Slack へ送る
  (「変化なし」も lint が動いている signal。通知が来ない = ジョブ停止と切り分ける)。
- 機能5 のキーは期待トークンを含まない (多数決の入れ替わりで同じ箇所を再通知しない)。
- 取得失敗・検査失敗・トークン失効間近は warnings としてレポートと通知に必ず載せる
  (不完全な実行が「クリーン」に見えないようにする)。
- main がブランチ保護で bot push を弾く構成に変わった場合は、workflow の commit 先を
  レポート専用ブランチ (例: `figma-linter-reports`) に変え、checkout でそのブランチの
  レポートを重ねる方式にフォールバックする。

## 既知の制限

- **バリアント値にカンマを含む場合**、REST ではバリアント名 ("K=v, K2=v2") のパースが崩れ、
  機能5 のグルーピングや State 判定がプラグインとズレることがある (Figma の名前エンコードが
  曖昧なため復元不能)。バリアント値にカンマを使わない運用を推奨。
- **プラグインで Component Set を丸ごと選択**した場合、選択展開の規則によりバリアント内部の
  ネストフレームまでは検査されない (バリアント単体を選択すれば CI と同一の対象になる)。
  CI は常に各バリアントを起点に展開する。

## 通知の閾値・調整 (今後)

通知ノイズの実測を見てから調整する (計画時の合意)。候補: ルール別のミュート、
コンポーネント単位の集約閾値、機能5 の票数条件の強化など。調整は `lint-runner.ts` の
フィルタと `notify.ts` の整形に閉じる。
