---
name: orca-react-component
description: "`status: ready` の design-language 原典をもとに、packages/react の Orca React コンポーネントをTDDで実装・修正する。React API、Storybook、テスト、token classへの写像、実装後のStorybook FBの自動収集・修正・承認済み事例への変換を扱うときに使う。"
---

# Orca React コンポーネント

`packages/react` でコンポーネントを作成・変更するときに使う。

React 実装は `@orca/design-language` の下流にある。React props、Tailwind class、Storybook、現在の実装をコンポーネントの原典として扱わない。

## 実装前ゲート

実装前に必ず確認する。

1. `$ARGUMENTS` またはユーザーの依頼からコンポーネント名を正規化する。
2. `packages/design-language/components/<Name>/<Name>.md` を探す。React の実装名（コンポーネント名・ファイル名）は原典の `name` と一致させる。不一致にする場合はユーザー確認の上、原典 frontmatter の `sources.implementations` に実装パスを記録する。AC ID は常に原典 `name` 基準（既成例: 原典 `Chips` の `AC-Chips-NN` を `src/ui/chip.test.tsx` が参照）。命名規則の正本は `packages/design-language/README.md`。
3. 文書が存在しない場合は React 実装を止め、先に `orca-component-design-doc` を使う。
4. frontmatter の `status` を読む。
5. `status` が `ready` でない場合は、ユーザーが明示的に prototype / spike を求めている場合を除き、先に design-language 文書を改善する。
6. 次のセクションを実装計画に変換する（原典は `## Guide` / `## Spec` の 2 部構成。各セクションは `###` 見出し。構成の正本は `packages/design-language/README.md`）。
   - Anatomy（Guide）
   - Content Model（Guide）
   - Accessibility Notes（Guide）
   - Interaction Model（Spec）
   - State Model（Spec）
   - Variants And Options（Spec）
   - Acceptance Criteria（Spec）
7. Figma、既存実装、Storybook、テストは写像の根拠として読む。ただし原典にはしない。見た目は Figma を優先候補にし、齟齬がある場合はユーザーに確認する（裁定ルールの正本はルート `CLAUDE.md`）。
8. Figma の照合対象は published component の**全ノード**。`list_file_components_for_code_connect`（fileKey だけで全 published component の nodeId・variant を列挙できる）で当該コンポーネントの Item 系と全体 symbol の両方を洗い出し、両方を実測する。`Doc/<Name>` ページは空のプレースホルダーであることが多く、照合対象にしない。
9. **Figma published に定義があるものだけを実装する。** Figma に無い機能・状態・視覚（折り畳み、badge、チェックマーク、独自インジケータ等）を「暫定の既定」として発明しない。実装・原典に Figma に無いものを見つけたら一覧にしてユーザーへ提示し、裁定を得てから進める。a11y の意味論（landmark、aria-label、aria-current、aria-invalid 等）は Figma に描けないため維持してよい。
10. ここまで確認してから React API を設計する。

狭い不具合修正は、原典文書が `ready` でなくても進めてよい。ただし、見つけた仕様不一致は design-language または実装側の既知 gap として記録する。

## TDD の進め方

TDD を実践する。

1. design-language の Acceptance Criteria から、先にテストを書く/更新する。
2. 可能ならテストを実行し、期待どおり失敗することを確認する。
3. テストを通す最小の React 実装を書く。
4. テストが通ってからリファクタする。
5. 構造整理と振る舞い変更は、可能な限り別コミットに分ける。

各 AC を検証するテストの名前には、原典の AC ID（例: `AC-Button-04`）をそのまま含める。
`（検証: …）` 区分の無い AC は、テスト名に ID が現れることを `@orca/react` の contracts テストが CI で突合する
（規約の正本は `packages/design-language/README.md`）。

AC の検証区分ごとの扱い:

- 区分なし: テスト名に AC ID を含める（上記）。
- `（検証: Storybook）`: 対応する story を必ず用意し、story 直上に
  `// AC-<Name>-NN（検証: Storybook）: <要約>` コメントで ID を記す
  （実例: `packages/react/src/ui/pagination.stories.tsx` の RTL story）。完了前に原典と stories を突合する:

  ```bash
  grep -n '（検証: Storybook）' packages/design-language/components/<Name>/<Name>.md
  grep -n 'AC-<Name>-' packages/react/src/ui/<kebab>.stories.tsx
  ```

- `（検証: Foundations）` / `（検証: 対象外）`: React 側の対応物は不要。

Testing Library では className 文字列より、利用者に見える振る舞いを検証する。variant / size を DOM 上で検証する必要がある場合は、private class ではなく `data-variant` / `data-size` など public な DOM 属性として露出する。

## React notes の扱い

必要に応じて、実装中の判断メモをコンポーネントの近くに置く。

`packages/react/src/ui/<kebab>.notes.md`（`<kebab>` はコンポーネント名の kebab-case。`IconButton` → `icon-button`）

このメモは SSOT ではない。実装中に design-language を React API / DOM / state / styling / テストへどう写像したかを軽く残すための一時メモであり、実装が安定したら削除してよい。

置き場所の判断:

- 消えて困る意味仕様や受け入れ条件は design-language に移す。
- 利用者に見える振る舞いはテストに移す。
- 横断的な実装知見は `packages/react/CLAUDE.md` に移す。
- token class の実現可能性や Figma 差分調査などの作業ログは、必要なら PR 本文や issue に残す。notes を恒久保管場所にしない。

notes を作る場合は短く保ち、以下程度に留める。

```md
# <Name> implementation notes

実装・原典とこのメモが食い違う場合は、実装・原典を正とし、このメモを直ちに修正または削除する。

## React への写像

design-language の概念を React API / DOM / state / styling へどう写像したか。

## 実装判断

React 固有の判断と理由。

## 一時的な gap

一時的な token gap、Figma 差分、未解決の実装課題。
```

notes を増やしすぎない。実装完了時に、消してよい内容と移すべき内容を見直す。

## Storybook FB から学習する

コンポーネント実装後の Storybook FB を受けた場合は、`references/feedback-workflow.md` を読む。
FB の自由文だけを恒久保存せず、修正前の実装、Storybook の表示条件、FB、承認された修正を1つのケースとして扱う。

- ユーザーから実装FBを受け取ったら、返答や修正より先に `feedback:capture` を実行する。保存の許可を求めない。
- FBの原文は要約せず `--feedback` へ渡す。対象componentは必須とし、対象storyなど会話から確定できる情報も渡す。
- category、scope、targetなどが不明でも収集を止めない。不明な値は指定せず、`untriaged`、`null`、空配列のまま保存する。
- 同じFBの再処理はdedupeされる。別件として明示的に再記録する場合だけ `--force` を使う。
- 自動収集された未承認FBは `packages/react/evals/component-feedback/inbox/<id>.json` に追加され、同じ実装PRでGit共有する。
- スクリーンショットや全 computed style などの大容量データは `.artifacts/component-feedback/<run-id>/` またはチームの共有ストレージに置き、inbox から locator で参照する。
- 修正後にユーザーが承認したケースだけを `packages/react/evals/component-feedback/cases/<id>.json` に追加する。
- token 関連のケースには、Figma variable、token、CSS variable、utility class、解決値のうち確認できた経路を修正前後に記録する。
- 1件のケースから横断ルールを自動確定しない。適用範囲と反復性を確認し、原典、React ガイド、skill reference、lint/test、token-pipeline のいずれへ昇格するかを分ける。
- ケース追加後は `pnpm --filter @orca/react feedback:check` を実行する。
- 未判断の FB は `pnpm --filter @orca/react feedback:list` で確認する。
- FBの収集と、skill・原典・lintなどへの昇格を分ける。収集は自動で行い、横断ルールへの昇格はユーザーの承認を得てから変更する。

新しいコンポーネントを実装するときは、全ケースを読み込まない。対象 component、同じ category、同じ
token または実装パターンに一致する承認済みケースだけを `rg` で探して読む。

## 実装ルール

実装判断の原則（Figma と原典の役割分担、固定寸法の積み上げ、state layer 合成、native 要素の意味、
slot の扱いなど）は `packages/react/CLAUDE.md` の「実装判断の原則」を正とする。token の規範は
`packages/design-language/foundations/principles.md` を正とする。ここには skill 固有の手順だけを書く。

- ファイル配置・alias import・`"use client"` は `packages/react/CLAUDE.md` の「ファイル配置と registry 整列規約」に従う
  （`src/ui/<kebab>.tsx`、共有は `src/lib/`、cross-file import は `@/registry/orca/*`、`../` 相対は禁止）。
- `packages/react` にある React 19 の既存パターンに合わせる。
- Tailwind v4 と `@orca/token-pipeline` 由来の token CSS / CSS variables を使う。Orca token または semantic CSS variable がある色・寸法をハードコードしない。
- spacing / sizing / typography の utility class は、`packages/token-pipeline/generated/tailwind-tokens.css` の `@theme` 変数に対応するものだけを使う。class を書く前に実在を確認する:

  ```bash
  grep -- '--spacing-padding-lg:' packages/token-pipeline/generated/tailwind-tokens.css
  ```

- Tailwind の数値 scale（`px-48`、`gap-2` 等）と任意値（`min-w-[24px]` 等）は使わない。`@theme` に該当変数が無くても Tailwind デフォルト（数値 × 0.25rem。`px-48` = 192px）へ**黙って解決される**ため、typo や scale 混同に気づけない。不足 token は component 側で補わず、token-pipeline / design-language 側の課題として記録する。
- 代表的な variant、state、density を Storybook に追加・更新する。token CSS、theme、font face が実アプリと同じ前提で読み込まれているか確認する。
- 必要に応じて `packages/react/src/index.ts` から public component / type を export する。
- 実装中に design-language の未決定事項が見つかったら、React に先に埋め込まず design-language を更新する。

## 検証

通常のコンポーネント作業では、まず狭いチェックを実行する。

```bash
pnpm --filter @orca/react test
pnpm --filter @orca/react typecheck
pnpm --filter @orca/react build
```

完了前に、数値 scale / 任意値の混入を検出する（ヒットした class は token 由来か個別に正当化する）:

```bash
grep -rnE '\b(m|p)[xytrbl]?-[0-9.]+|\b(gap|size|w|h|inset|rounded|border)-[0-9.]+|-\[[0-9]+px\]' packages/react/src/ui/<kebab>*
```

Storybook を変更した場合は以下も実行する。

```bash
pnpm --filter @orca/storybook typecheck
pnpm --filter @orca/storybook build
```

token、package export、複数パッケージにまたがる振る舞いを触った場合は、root の `pnpm build` / `pnpm test` / `pnpm tokens:check` など、影響範囲に応じたチェックを追加する。

## 完了時の報告

最後に以下を報告する。

- 参照した design-language 原典
- 変更した React / Storybook / design-language ファイル
- 実行したテスト・チェック
- 残っている gap
- notes を残した場合は、なぜ一時メモとして必要か。残す前に全項目を実装・原典と突合し、確定済み・解消済みの記述を削除または更新したこと
- Storybook FB を受けた場合は、承認済みケースを追加したか、未承認のため追加していないか
- Storybook FB を受けた場合は、自動収集したinbox JSONのパス
