# Plan 009 (spike): ダークモード点灯に必要な最小トークン集合を確定する

> **Executor instructions**: これは **design/spike プラン** — 成果物は調査メモで
> あり、プロダクションコードの変更は行わない。各ステップの検証を確認しながら進め、
> 「STOP conditions」発生時は停止して報告。完了したら `plans/README.md` の Status を
> 更新する。
>
> **Drift check (最初に実行)**: `git diff --stat 73dd926..HEAD -- packages/token-pipeline/terrazzo.config.mjs packages/token-pipeline/tokens/variables apps/storybook/.storybook/preview.css`
> 差分がある場合は「Current state」の記述と現物を突合し、不一致なら STOP。

## Status

- **Priority**: P3
- **Effort**: M（spike として。本実装の Figma 作業は含まない）
- **Risk**: LOW（読み取り + メモ執筆 + 使い捨て実験のみ）
- **Depends on**: none
- **Category**: direction (design/spike)
- **Planned at**: commit `73dd926`, 2026-07-07

## Why this matters

ダークモードは「新機能の提案」ではなく**配線済みの未完成機能**である。
token-pipeline は `[data-theme="dark"]` セレクタへの変換を既に実装しているが、
Figma 側の Color System コレクションが Light 単一モードのため出力が空で、
Storybook はハードコードの stopgap で暗い背景を偽装している。Figma に Dark モードを
足せば下流はほぼ自動で点灯するが、「どのトークンに Dark 値が必要か」の最小集合が
未定義のため、デザイナーが着手できない。この spike はその発注書を作る。

## Current state

- `packages/token-pipeline/terrazzo.config.mjs:85-89` — `modeSelectors` に
  `{ mode: "Dark", selectors: ['[data-theme="dark"]'] }` が配線済み（確認済み）。
- `packages/token-pipeline/scripts/preprocess-tokens.mjs` — Extended Collection の
  Dark モード（例 Corporate×Dark）を `[data-color-system="corporate"][data-theme="dark"]`
  複合セレクタに変換するロジックも実装済み。
- `packages/token-pipeline/tokens/variables/color-system.json` — セマンティック色
  コレクション（Brand / UI / StateLayers グループ）。**モードは Light のみ**。
- `packages/token-pipeline/generated/tokens.css` — `[data-theme="dark"]` ブロックは
  1件も出力されていない（パイプラインは通っているが入力が無い）。
- `apps/storybook/.storybook/preview.css`（確認済み・現行）:
  ```css
  [data-theme="dark"] {
    color-scheme: dark;
    --preview-surface: #0a0a0a;   /* stopgap */
  }
  [data-theme="dark"] {
    --text-primary: #000000;      /* token が揃ったらこのブロックごと消す、と明記 */
  }
  ```
- トークンの供給経路の正: **token-bridge-figma プラグインで Figma から scan →
  export → 同期 PR**。手書きで tokens/variables/*.json を編集するのは非推奨
  （リポジトリ運用の決定事項）。ゆえに本 spike の成果物は「Figma に作る Dark 値の
  仕様書」であり、JSON の手書きではない。
- 消費側の実態: `packages/react/src` の全コンポーネントは
  `bg-surface` / `text-on-surface` / `border-outline` 等のセマンティック utility
  経由で色を参照しており、`generated/tailwind-tokens.css` の `--color-*` は
  セマンティック変数への `var()` 参照になっている（2026-07 の修正で保証済み）。
  つまり Dark 値がセマンティック層に入れば全コンポーネントに自動で効く。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| トークン再生成（実験時） | `pnpm --filter @orca/token-pipeline tokens` | exit 0 |
| 実験の後片付け確認 | `git status --short` | 作業終了時に tokens/ generated/ の差分ゼロ |
| Storybook | `pnpm storybook` | localhost:6006 起動 |

## Scope

**In scope**（作成してよいもの）:
- `plans/spike-notes/009-dark-mode-findings.md`（新規 — 成果物）
- 使い捨ての実験変更（Step 3）— **最終的に必ず revert し、コミットしない**

**Out of scope**:
- `packages/token-pipeline/tokens/variables/*.json` への恒久変更（供給経路は Figma 同期）
- `apps/storybook/.storybook/preview.css` の変更（stopgap 削除は Dark トークンが
  実際に届いた後の本実装で行う）
- Figma ファイルの編集（デザイナー/オペレーターの作業）
- React コンポーネントの変更

## Git workflow

- ブランチ: `spike/dark-mode-tokens`
- コミットは成果物メモのみ: `docs(plans): dark mode readiness spike findings`
- 実験変更はコミットに含めない（`git status` で確認）。

## Steps

### Step 1: セマンティック色トークンの全数調査

`packages/token-pipeline/tokens/variables/color-system.json` を読み、Brand / UI /
StateLayers の全トークンを列挙する。並行して
`grep -rn "bg-\|text-\|border-\|shadow-" packages/react/src --include="*.tsx" -o | ...`
等で **React 実装が実際に消費しているセマンティック utility** を洗い出し、
「実際に使われているトークン」に印を付ける。

**Verify**: 成果物メモに全トークンの表（名前 / Light 値 / 消費箇所の有無）がある

### Step 2: Dark 値が必須の最小集合を決める

Step 1 の表から、Storybook の既知の破綻点（preview.css の stopgap が偽装している
`surface` 相当と `text-primary` 相当）+ 実際に消費されているトークンを核に、
「これだけ Dark 値があれば全コンポーネントが破綻なく暗色表示になる」最小集合を
提案する。各トークンに Dark 値の提案（暫定でよい。例: surface = Gray/1000 系）を
付ける。**色の最終決定はデザイナー** — 提案はプレースホルダである旨を明記。

**Verify**: メモに「必須集合」「あれば良い集合」「Dark 不要（不変）集合」の3分類がある

### Step 3: パイプラインの通し実験（使い捨て）

`color-system.json` のコピーに `$extensions.mode` で Dark 値を数個だけ足す一時変更を
行い、`pnpm --filter @orca/token-pipeline tokens` を実行して:
1. `generated/tokens.css` に `[data-theme="dark"]` ブロックが出力されること
2. Storybook のツールバーで theme=dark に切り替えると Button / Tabs / Search の
   色が実際に変わること（ブラウザ目視）
を確認し、スクリーンショットまたは確認結果をメモに記録する。
**終わったら全変更を revert**（`git checkout -- packages/token-pipeline` 等）し、
`git status` で tokens/ と generated/ の差分ゼロを確認する。

**Verify**: メモに実験結果の記録がある。`git status --short packages/token-pipeline` → 空

### Step 4: 成果物メモを完成させる

`plans/spike-notes/009-dark-mode-findings.md` に以下を含める:
1. トークン全数表と3分類（Step 1-2）
2. Figma 作業の発注書: Color System コレクションに Dark モードを追加し、必須集合に
   値を入れる手順（token-bridge プラグインでの export → PR までの流れ）
3. 併せて必要な運用注意: 拡張コレクション（Corporate 等）にも Dark を同時に揃える
   必要がある理由（`packages/token-pipeline/docs/terrazzo-integration.md` の
   「切替軸の対応表」節に記載済みの specificity 運用 — 引用すること）
4. 本実装時の残作業リスト: preview.css の stopgap 2ブロック削除、Storybook での
   全コンポーネント×dark×corporate の目視確認
5. 未解決の問い（あれば）: 例: StateLayers の Dark 値は反転か同値か

**Verify**: メモが上記5項目を含む

## Test plan

- spike のためテストなし。Step 3 の通し実験が実質の検証。

## Done criteria

- [ ] `plans/spike-notes/009-dark-mode-findings.md` が存在し、Step 4 の5項目を含む
- [ ] `git status --short packages/token-pipeline apps/storybook` → 空（実験が残っていない）
- [ ] `pnpm turbo run build typecheck test tokens:check` 全タスク成功（何も壊していない）
- [ ] `plans/README.md` の Status 更新

## STOP conditions

- Step 3 の実験で `[data-theme="dark"]` ブロックが**出力されない**（modeSelectors の
  配線に対する理解が間違っている — パイプラインの追加調査が必要なので停止・報告）。
- color-system.json の構造が「Current state」の記述（Brand/UI/StateLayers、Light 単一）
  と異なる。

## Maintenance notes

- この spike の成果物はデザイナーへの発注書。本実装は「Figma で Dark 値追加 →
  token-bridge で同期 PR → preview.css stopgap 削除 → Storybook 目視」の別プランに
  なる（Figma 作業完了後に起票）。
- Corporate（data-color-system 軸）との複合は specificity 運用が
  terrazzo-integration.md に文書化済み — 本実装時に必ず参照。
