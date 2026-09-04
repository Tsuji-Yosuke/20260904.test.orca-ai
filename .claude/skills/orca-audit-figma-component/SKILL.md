---
name: orca-audit-figma-component
description: Figma Component Set の全 variant を MCP で読み取り、Orca の design-language 設計書、React 実装、token、Storybook、test と照合して、差分・欠落・未解決事項を証拠付きで完全監査する。Figma が非バージョン管理で更新される環境で、特定 Component の実装前確認、再監査、デザイン変更検知、variant/state/size ごとの背景色・前景色・境界線・余白・typography・icon・focus/disabled の不整合列挙を依頼されたときに使う。subagent による並列比較と coverage の機械検証が必要な監査にも使う。
---

# Orca Figma Component Audit

Figma の現在値を一度だけ正規化して固定し、設計書と実装を別々に抽出してから、全 variant を並列比較する。監査完了は印象ではなく `scripts/validate_audit.py` の coverage 検証で判定する。

## 絶対ルール

1. 最初にリポジトリ直下と対象 package の `AGENTS.md` / `CLAUDE.md` を読む。Orca では design-language が意味・契約の SSOT、Figma が見た目の優先ソースである。
2. Figma、design-language、実装、Storybook が食い違っても勝手に正を決めない。差分、証拠、更新候補、判断が必要な点を報告する。
3. 監査は読み取り専用で行う。Figma、設計書、実装、token、Storybook、test を変更しない。変更はユーザーが別途明示したときだけ行う。
4. Figma URL は node を含むものを要求する。`fileKey` と `nodeId` を確定できない場合だけ質問する。
5. Component Set の子 Component を実在 inventory とし、全 node ID をちょうど1回 coverage する。代表 variant だけを見て完了としない。
6. raw class と hex を直接比較しない。token identity、alias、mode、解決値、state-layer の合成順を正規化して比較する。
7. 観測値、文書上の主張、推論を `observed` / `asserted` / `inferred` で区別する。推論だけでは確定差分にしない。
8. unresolved が1件でも残る場合は「監査完了」と言わない。差分が存在しても、全件を解決済みの証拠で検査できていれば監査自体は complete になり得る。

## 入力を確定する

次を解決する。明示されていないパスはリポジトリ規約と component 名から探す。

- node 付き Figma URL
- `packages/design-language/components/<Name>/<Name>.md`
- 実装ファイル。Orca React の既定は `packages/react/src/ui/`
- 関連 token/CSS、Storybook story、test、Code Connect mapping
- 監査対象。既定は全 variant × 必須 check。ユーザーが狭めない限り省略しない

設計書や実装が存在しないこと自体も結果である。存在しないソースを推測で補わない。

## ワークフロー

### 1. Figma inventory を固定する

`references/figma-snapshot.md` を読み、まず Component Set 全体を1回の compact read で取得する。`use_figma` がある場合は、利用可能な `figma-use` Skill を先に読み、`skillNames: "figma-use"` を渡す。transport上限で末尾sentinelが失われた場合は、その出力を捨て、同じinventoryをnode ID順の決定的な小batchへ分ける。

取得項目:

- component set / component の fileKey、nodeId、name、default variant
- variant axis、options、全 Component の variant properties と nodeId
- root の layout、min/max、padding、gap、radius、fill、stroke、effect、opacity
- label の font family/style/size/line-height/letter-spacing/fill
- leading/trailing icon の visible、size、foreground paint
- boolean/text/instance-swap component properties
- 利用 variable の ID、name、collection、mode、alias、解決値

`getCSSAsync()` には依存しない。現在の Figma MCP runtime では Plugin API 型に存在しても未対応になり得る。固定 width は default label と icon を含む HUG の観測値か確認し、CSS の固定幅として扱わない。

正規化結果を `references/audit-schema.md` の `inventory.json` にする。inventory返却とsnapshot返却は、MCPが返したparse可能なJSON文字列を一字も変えず `rawPayload` に保存し、その文字列からSHA-256を計算する。raw envelopeにはtimezone付き取得時刻、fileKey、Component Set nodeIdを含める。snapshotはcontainer、label、icons、componentPropertiesの必須visual fieldを省略せず、存在しない値はnullまたは空配列で表す。各返却の末尾に `FIGMA_AUDIT_COMPLETE:<partId>:<count>` が実在し、validatorがraw payloadを再parse・再hashして、全partのvariant keyをexactly-onceで照合できた場合だけ `capture.complete=true`、`capture.truncated=false` とする。自己申告だけでcompleteにしない。`requireCartesianProduct` は仕様上すべての軸の直積が必須と確認できた場合だけ `true` にする。

### 2. ソース契約を並列抽出する

subagent が利用可能なら `references/subagent-workflow.md` の Wave 1 を実行する。

- Design agent: purpose、anatomy、state、variant の意味、AC、未決事項を抽出
- Implementation agent: props、class、token、pseudo state、DOM/a11y、Storybook、test を抽出
- Root agent: Figma inventory を所有し、Code Connect とソース位置を確認

各結果には必ず locator を付ける。ローカルは `path:line`、Figma は `fileKey#nodeId` とする。

### 3. 比較契約を作る

最低限、次の check を `requiredChecks` に置く。対象外は削除せず `not-applicable` として各 variant を coverage する。

- `container.background`
- `container.border`
- `container.radius`
- `container.size`
- `container.spacing`
- `label.typography`
- `label.foreground`
- `icon.size`
- `icon.foreground`
- `interaction.hover-active`
- `interaction.focus`
- `interaction.disabled`
- `interaction.state-distinction`
- `interaction.motion`
- `component.options`
- `accessibility.contrast`
- `accessibility.semantics`

対象 Component 固有の契約があれば check を追加する。contrast は resolved foreground/background から比率を計算し、設計書の最低値と照合する。state-distinction は各 variant を孤立して見るだけでなく、同じ Type/Size の state 間で実際に識別できるかを比較する。

各 check を次の source pair ごとに評価する。設計書が視覚値を主張していなくても、Figma と実装の一致判定を失わないためである。

- `figma_vs_design`
- `figma_vs_implementation`
- `design_vs_implementation`

### 4. variant 比較を並列化する

Figma inventory の canonical key を昇順に並べ、利用可能な subagent 数へ重複のない連続範囲で分割する。各 agent に次だけを渡す。

- 担当する正確な variant key と nodeId の一覧
- 固定済み Figma snapshot
- design contract と implementation contract
- required checks と audit schema

agent は担当外を評価せず、共有ファイルを編集せず、構造化結果を root に返す。state や size の共通差分は複数 variant をまとめた finding にできるが、coverage 行は variant ごとに必要である。

### 5. 値を意味どおりに比較する

- Figma `Primary / Secondary / Ghost` と実装 `primary / secondary / ghost` のような axis mapping を明示する。名前の類似だけで対応を確定しない。
- `Small / Medium / Large` と `sm / md / lg` を同様に mapping する。
- Figma の複数 fill と実装の state-layer utility は、base paint と overlay paint の順序・alpha で比較する。合成後の色だけで一致判定しない。
- transparent paint と paint 無しは、描画結果だけでなく interaction/transition の必要性も分けて記録する。
- focus ring は色、太さ、offset/spread、`focus-visible` 条件を分ける。
- disabled は background、border、label、icon、native behavior を分ける。
- Figma で表現できない native `<button>` や accessible name は「Figma に無い余分な仕様」ではなく、Figma を含む source pair では `not-representable` とする。
- Figma の boolean/text/instance-swap property と実装の prop/default を `component.options` で比較し、variant 軸へ混ぜない。
- contrast は transparent paint の背面を確定できる場合だけ数値化する。背面が不明なら unresolved とし、白背景などを黙って仮定しない。
- reduced motion、keyboard、native disabled などFigmaで表現できない契約は design 対 implementation で検査する。
- design-language が視覚値を規定していない場合、Figma 対 design は `not-asserted`、finding kind は `undocumented-in-spec` とする。Figma 対実装は独立に評価し、ただちに実装不一致とはしない。

### 6. merge と完全性検証を行う

root が subagent 結果を `audit.json` に統合し、次を実行する。

```bash
python3 .agents/skills/orca-audit-figma-component/scripts/validate_audit.py \
  inventory.json audit.json \
  --postflight-inventory postflight-inventory.json --pretty
```

比較後にStep 1と同じfull raw captureを必ず再実行し、`postflight-inventory.json`へ保存する。preflightをコピーしてはならない。validatorはpostflightのraw payloadも再検証し、postflight開始時刻がpreflight完了より後、raw capture fingerprintは別、Figma state fingerprintは同一であることを確認する。途中でFigmaが更新されstate fingerprintが変わったら、異なる時点の値を混ぜずsnapshot取得からやり直す。

validator が失敗したら、missing/duplicate/unknown coverage、fingerprint 不一致、証拠不足、unresolved を修正して再実行する。validator を通していない結果を「全差分」と呼ばない。

### 7. 報告する

`references/report-template.md` の順で、先に監査の完全性、その後に差分を示す。

- Figma fingerprint、取得時刻、component node
- Figma variant 数、期待組み合わせ数、coverage 数
- 差分件数を status / severity 別に集計
- 各差分の対象 variant、property、Figma/設計書/実装値、locator、confidence
- missing source と unresolved
- ユーザー判断が必要な項目と、更新候補のファイルまたは Figma node

「差分なし」は validator の `complete=true`、`conformant=true`、`unresolvedCount=0` がすべて成立した場合だけ述べる。

## Comparison status と finding kind

source pair の status:

- `match`: 比較可能な主張が一致
- `mismatch`: 同じ契約対象の値が不一致
- `not-asserted`: 一方のソースがその値を規定していない
- `source-absent`: 一方のソース自体が存在しない
- `not-representable`: native semantics など、一方では表現対象外
- `unresolved`: 取得不能、mapping 未確定、token alias 未解決など
- `not-applicable`: その variant/check/source pair では対象外

finding の `kind` で `value-mismatch`、`missing-in-implementation`、`extra-in-implementation`、`undocumented-in-spec`、`missing-in-figma`、`not-representable`、`unresolved` を区別する。

## Resources

- `references/figma-snapshot.md`: Figma MCP の read-only 取得と正規化
- `references/audit-schema.md`: inventory / audit JSON 契約
- `references/subagent-workflow.md`: 高速な並列分割、prompt、merge 規則
- `references/report-template.md`: 最終レポートの構造
- `scripts/validate_audit.py`: fingerprint、直積、assignment、coverage、finding evidence の決定的検証

local SHA-256はtruncationや転記事故を検出する整合性checkであり、artifact一式の敵対的改ざんを防ぐ署名ではない。rootがMCP raw resultを直接保存することをtrust boundaryとする。
