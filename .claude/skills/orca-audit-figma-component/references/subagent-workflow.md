# Subagent workflow

目的は速度と完全性を両立すること。Figma MCP を全 agent が重複して叩くのではなく、root が固定した1つの snapshot を共有する。

## Wave 1: source extraction

利用可能な並列枠に応じて最大3役に分ける。

### Design contract agent

```text
対象 component の design-language 文書と foundations を読み、意味、anatomy、variant、state、
accessibility、acceptance criteria、open question を抽出する。実装や Figma を正と裁定しない。
すべてに path:line と evidence kind を付け、構造化して返す。ファイルは編集しない。
```

### Implementation contract agent

```text
対象実装、token/CSS、Storybook、test、Code Connect を読み、variant/size/state mapping、
container/label/icon 値、pseudo state、focus、disabled、DOM/a11y を抽出する。
utility は token の解決先まで追う。すべてに path:line を付ける。ファイルは編集しない。
```

### Figma evidence owner

通常は root が担当する。別 agent に任せる場合も MCP call は1役だけとし、全 inventory、snapshot、variable alias、nodeId を返させる。

Wave 1 の完了条件は、variant axis mapping と required checks を root が固定できること。mapping が未確定なら unresolved にする。

## Wave 2: variant batches

1. canonical variant key を昇順にする。
2. 利用可能な worker 数を `N` とし、連続した均等範囲へ分割する。各 key は必ず1 worker にだけ割り当てる。
3. root は `assignments` を先に作り、各 worker prompt に exact key/nodeId を列挙する。
4. worker は担当 key の全 required checks を返す。共通 finding は複数 `variantKeys` を持てる。

Variant worker prompt:

```text
固定済み inventory、Figma snapshot、design contract、implementation contract を比較する。
担当 variantKeys 以外は評価しない。各 variant について requiredChecks をすべて
3つの requiredComparisons ごとに match/mismatch/not-asserted/source-absent/
not-representable/unresolved/not-applicable のいずれかにする。
非match・非not-applicableセルには audit-schema 準拠の finding と evidence を付ける。
推論は inferred とし、確定できなければ unresolved。共有ファイルは編集せずJSONを返す。
```

## Merge rules

- root だけが `audit.json` を書く。
- assignment ごとに worker が受け取った `inventoryFingerprint` を保持する。
- finding の重複判定キーは、sorted variantKeys + check + property + status + normalized evidence。
- 同じ差分が size/state 全体に共通なら1 finding に統合するが、各 variant の coverage status は維持する。
- agent 間で値が違う場合、どちらかを選ばず、source locator を再確認する。確定しなければ unresolved。
- `validate_audit.py` が示す missing/duplicate/unknown key は root が解消する。
- subagent の「問題なし」という文章は coverage の代わりにならない。
- merge 後にrootが同じfull raw Figma captureを再実行して`postflight-inventory.json`へ保存し、state fingerprint、raw capture fingerprint、取得時刻をvalidatorで照合する。

## Parallelism and rate limits

- Figma snapshot と design/implementation extraction は並列化できる。
- 同じ Figma file への複数の大規模 read は並列化しない。
- transport truncation時の小batch再取得もrootの単一queueで行い、各partのsentinelと件数を検査する。
- variant 比較は snapshot 固定後に並列化する。
- 小さな Component Set では agent 起動コストが勝るため、Wave 1 のみ並列にし、Wave 2 は root が行ってよい。ただし assignments と coverage は同じ schema で作る。
- subagent 数は実行環境の上限を超えない。上限が不明なら2 workerから始める。

## Failure handling

- agent timeout: その assignment を別 agent または root に再割当し、最終 assignments を更新する。
- MCP rate limit: retry-after に従う。snapshot を得る前に部分値で比較を始めない。
- token resolution failure: raw variable ID を evidence に残し、該当 color check を unresolved。
- missing implementation/spec: その source role を明記し、missing/undocumented status で全該当 variant を coverage する。
