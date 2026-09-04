# Component implementation feedback workflow

Figma から React へ写像した実装に対する Storybook FB を、再利用可能なケースへ変換する。
FB だけでは正しい修正を特定できないため、修正前、表示条件、FB、承認された修正を一組で扱う。

## 保存先

- チームで判断する未承認 FB: `packages/react/evals/component-feedback/inbox/<id>.json`
- inbox 契約: `packages/react/evals/component-feedback/inbox-schema.json`
- 承認済みケース: `packages/react/evals/component-feedback/cases/<id>.json`
- ケース契約: `packages/react/evals/component-feedback/schema.json`
- 大容量 artifact: `.artifacts/component-feedback/<run-id>/` またはチームの共有ストレージ
- 自動収集: `pnpm --filter @orca/react feedback:capture -- ...`
- 検証: `pnpm --filter @orca/react feedback:check`
- 一覧: `pnpm --filter @orca/react feedback:list`

inbox は Git 管理し、1件の FB を1ファイルにして複数人の投稿を集約する。`submittedBy`、`triage.owner`、
`status`、`discussionUrl` により担当と判断過程を追跡する。スクリーンショットや全 computed style は Git に
複製せず、判断を再現するために必要な locator、値、短い観測、共有 artifact の URL だけを inbox に残す。

## FBを自動収集する

ユーザーからコンポーネント実装へのFBを受け取った時点で、エージェントが次のコマンドを実行する。
ユーザーへ保存の可否を確認せず、修正や追加質問より先に収集する。

```bash
pnpm --filter @orca/react feedback:capture -- \
  --component Button \
  --feedback '<ユーザーのFB原文>' \
  --target 'Button root' \
  --story-id 'components-button--primary' \
  --story-args '{"size":"md"}' \
  --viewport '1280x720'
```

`--component` と `--feedback` だけを必須とする。コマンドは以下を自動補完する。

- Git設定の投稿者（`ORCA_FEEDBACK_SUBMITTED_BY` で上書きできる）
- 現在のrevisionと、`main`との差分およびworking treeの変更ファイル
- design-language原典のパス
- 原典frontmatterにあるFigma file keyとnode ID
- `orca-react-component` skillのcontent hash
- 生成時刻、重複判定key、一意なID

Storybookのstory、args、globals、viewport、Figma variant、artifact URLなど、現在の会話や確認環境から
確定できる情報はoptionで渡す。確定できない情報は推測しない。`null`または空配列で保存し、収集後の
triageで補う。同じcomponent、revision、FB原文、target、Figma context、Storybook表示条件の組み合わせは
重複保存しない。

`--feedback` には要約ではなく、ユーザーが入力した原文をそのまま渡す。JSONの`feedback.verbatim`と
`feedback.summary`の両方へ保存する。後から要約を整える場合も`verbatim`は変更しない。

収集したJSONは同じ実装PRへ含める。コマンド自身はGit commitやpushを行わないため、実装完了前の
`git status`でinbox JSONが変更対象に含まれていることを確認する。

## FB を処理する

1. FBを受け取ったら`feedback:capture`を実行し、`status=new`でinboxへ自動収集する。
2. 対象storyの`storyId`、args、globals、viewportの不足分を確認する。
3. 対象要素と修正前のコードlocatorを特定する。
4. `feedback:list` で未判断の FB を確認し、担当者を `triage.owner` に設定する。
5. category、scope、議論先を確認して `status=triaged` にする。
6. 実装を修正し、関連する test、typecheck、build、Storybook を検証する。
7. 修正が承認されたらケースを `cases/` に追加し、inbox を `status=accepted` として `triage.caseId` から結ぶ。
8. 対応しない場合は `status=rejected` とし、`triage.decision` と `decidedAt` に理由と時刻を残す。
9. `feedback:check` を実行する。
10. ケースの `promotionTargets` に昇格候補を記録する。候補先の変更は別にレビューする。

## Status

- `new`: 投稿直後。担当と判断は未確定。
- `triaged`: category、scope、担当者を確認済み。対応方針を判断中。
- `accepted`: 修正を承認し、承認済みケースへ接続済み。
- `rejected`: 対応しないと判断し、理由を記録済み。

inbox のファイルは accepted または rejected になっても削除しない。Git 履歴と合わせて、採用されなかった
FBを含む判断母集団として残す。重複や前提の変化は削除ではなく `triage.decision` へ記録する。

## Category

- `wrong-token`: 値ではなく意味の異なる token を使った。
- `raw-value`: token で表現できる値を px、hex、Tailwind 数値 scale、任意値で書いた。
- `missing-token`: Figma の値または意味に対応する token が無い。
- `wrong-composition`: padding、line-height、border、icon、gap などの積み上げが違う。
- `wrong-state-layer`: hover、active、focus、disabled の layer 合成が違う。
- `variant-gap`: variant、size、state、density の一部が欠けている。
- `storybook-context`: theme、density、font、viewport、story args が確認条件と違う。
- `behavior-gap`: native behavior、keyboard、focus、disabled、a11y の実装が違う。
- `api-gap`: React props、slot、公開 API の写像が違う。
- `design-gap`: React ではなく Figma または design-language に判断が必要である。
- `other`: 既存 category に入らない。繰り返す場合は taxonomy の追加を提案する。

`wrong-token`、`raw-value`、`missing-token`、`wrong-composition`、`wrong-state-layer` では、
`before.tokenUsage` と `after.tokenUsage` を必須とする。見つからない段階を推測で補わず `null` にする。

## 昇格先を決める

- 意味仕様、受け入れ条件: `packages/design-language`
- 横断的な React 実装原則: `packages/react/CLAUDE.md`
- skill 固有の手順、検索方法: `SKILL.md` または `references/`
- 決定的に検出できる問題: lint または contract test
- token の不足、生成上の問題: `packages/token-pipeline`
- 反復性が未確認の判断: `case-only`

ユーザーが全 component へ適用すると明示した判断は、1件でも横断ルールの候補にできる。
実装上のヒューリスティックは、独立した複数ケースで再現してから昇格を提案する。
昇格後も元ケースは回帰評価の根拠として残す。

## 実装前に過去ケースを探す

対象 component 名、category、使用予定 token または class で `cases/` を検索する。
一致したファイルだけを読み、現在の Figma fingerprint、design-language、実装条件と整合するか確認する。
過去ケースが現在の原典と競合する場合は、過去ケースを根拠に実装せず `superseded` 候補として報告する。

## チームでトリアージする

`feedback:list` は new、triaged、accepted、rejected の件数と、component、category、担当者、要約を表示する。
定例または実装開始前に new と triaged を確認する。判断の議論を Git の外で行う場合は、PR、issue、Slack、
Figma comment などの共有 URL を `discussionUrl` に記録し、結論は inbox へ戻す。
