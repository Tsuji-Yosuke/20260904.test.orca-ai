# 更新チェック用 Worker (orca-plugin-version)

プラグインが起動時に読む `version.json` を配信する Cloudflare Worker。
`worker/public/version.json` は CI (`.github/workflows/figma-linter-plugin-release.yml`) が `main` ビルドごとに生成し、
この Worker が CORS ヘッダを付けて配信する。プラグインはこれと自分の `__BUILD_NUMBER__`
(= CI が採番するリリース buildNumber) を比べ、新しい配布があれば更新バナーを出す。

- **公開 URL**: https://orca-plugin-version.orca-ds.workers.dev/version.json
- **デプロイ先**: Cloudflare `orca-ds` アカウント (`account_id` は `wrangler.toml` 記載済み)

## 仕組み

```
main push → CI が build → worker/public/version.json 生成 → wrangler deploy
                                                              │
プラグイン起動 (UI iframe) → fetch(/version.json) → buildNumber 比較 → バナー / 強制更新ブロック
```

`version.json` の中身:

| key            | 説明 |
| -------------- | ---- |
| `buildNumber`  | CI が採番するリリース番号。更新判定の比較キー (単調増加) |
| `version`      | `package.json` の version。表示用 |
| `minBuildNumber` | これを下回る版は強制更新 (UI ブロック)。`release.config.json` 由来 |
| `downloadUrl`  | GitHub Release ページ (最新)。バナーの「ダウンロード」先 |
| `sha` / `publishedAt` | ビルド元 commit / 公開時刻 (デバッグ用) |

CORS / Cache-Control は `worker/public/_headers` で付与する (Figma の UI は origin=null の iframe
なので CORS が無いと fetch 結果を読めない)。assets-only Worker でスクリプトは持たない。
> 当初は Worker スクリプト + `run_worker_first` で CORS を足していたが、`wrangler-action` が使う
> wrangler のバージョンでは `run_worker_first` が効かず asset 直配信に戻り CORS が外れた。バージョン
> 非依存な `_headers` 方式へ変更した経緯がある。`_headers` は git 管理し、`version.json` は CI が生成する。

## 残りの設定 (CI の自動デプロイを有効化する)

初回デプロイ済みなので、あとは CI からの自動デプロイ用に **API トークンだけ**登録すればよい
(`account_id` は `wrangler.toml` にあるので `CLOUDFLARE_ACCOUNT_ID` は不要)。

GitHub リポジトリの Settings → Secrets and variables → Actions に登録:

- `CLOUDFLARE_API_TOKEN` — Workers の編集権限を持つ API トークン (orca-ds アカウント)

これで `main` への push ごとに CI が `version.json` を再生成して自動デプロイする。
secret 未設定のうちは deploy ステップが自動スキップされ、Release 自体は通常どおり成功する。

## 手動でデプロイ / 再セットアップするとき

```sh
cd worker
# version.json が無ければ仮で用意 (CI が無い手元デプロイ用)
mkdir -p public && echo '{"buildNumber":0,"version":"0.0.0","minBuildNumber":0,"downloadUrl":"https://github.com/orca-ds/orca/releases"}' > public/version.json
npx wrangler deploy
```

別の Cloudflare アカウント / Worker 名に変える場合は、確定した URL を **2 箇所**に反映する
(両方が同じオリジンを指す必要がある):

- `src/ui/lib/updateCheck.ts` の `VERSION_JSON_URL` → `…/version.json`
- `manifest.json` の `networkAccess.allowedDomains` → `["https://<新ホスト>"]`

## 強制更新を出したいとき

後方互換を壊す変更を入れたら `release.config.json` の `minBuildNumber` を、その時点の
リリースの buildNumber 以上に引き上げてコミットする。これを下回る古い版は起動時に UI 全体が
ブロックされ、最新版の手動 import を促される。
