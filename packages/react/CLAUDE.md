# CLAUDE.md — @orca/react

orca DS の React コンポーネント実装。design-language の原典に沿って、Tailwind v4 + `@orca/token-pipeline` のトークン CSS を前提に実装する。

## 前提

- React 19 peer dependency。
- **このパッケージの `src` は shadcn registry 配布の原本を兼ねる**（レイアウト・import・directive の規約は下記）。
- スタイリングは **Tailwind v4 + `@orca/token-pipeline` が生成する `tailwind-tokens.css`**。このパッケージ自体は CSS を出力せず、利用側で Tailwind が処理する。
- 色・寸法は必ず CSS 変数 / `@theme` トークン経由で参照する（`bg-[var(--color-text-primary)]` など）。ハードコードした色・サイズは置かない。
- テストは className に依存しない（Testing Library 流儀）。変種の検証が必要になったときは BEM クラスではなく `data-variant` / `data-size` のような public な DOM 属性として露出する。
- 見た目は Figma を優先する。Figma、design-language、既存実装、Storybook の間に齟齬がある場合は、勝手に判断せず、何を正とし、どこを更新するべきかをユーザーに確認する。

## ファイル配置と registry 整列規約

`src` はそのまま shadcn registry の配布ソースになる（変換レイヤーは無い）。以下を守る。
apps/registry の契約テストが CI で強制する。

- コンポーネント実装は `src/ui/<kebab>.tsx`（例: `IconButton` → `src/ui/icon-button.tsx`）。
  テスト・stories・notes は同名でコロケートする（`icon-button.test.tsx` 等）。
- 共有内部モジュールは `src/lib/`（例: `focus-ring.ts`, `option-row.tsx`）。
- cross-file import は必ず alias で書く: `@/registry/orca/ui/<kebab>` / `@/registry/orca/lib/<name>`。
  `../` 相対 import は禁止。同一コンポーネントの補助ファイル（`pagination.tsx` → `./get-pagination-items`）のみ `./` 相対でよい。
  shadcn CLI はこの alias を利用者側の `@/components/ui/...` / `@/lib/...` に書き換える。
- `react` または `@base-ui/react` を import する配布対象ファイルは先頭に `"use client";` を置く
  （Next.js App Router の利用者向け。純関数・定数のみのファイルには不要）。
- 公開 API は `src/index.ts` に集約する（per-component barrel は置かない）。

## コマンド

```bash
pnpm --filter @orca/react test        # vitest
pnpm --filter @orca/react test:watch
pnpm --filter @orca/react typecheck
pnpm --filter @orca/react build       # vite で ESM + d.ts
```

## 進め方

実装前に `packages/design-language/components/<Name>/<Name>.md` を読む。存在しない、または `status: ready` でない場合は、明示的な prototype / spike や狭い bug fix を除き、先に design-language の骨格ドキュメントを作る/改善する。React props、DOM 属性、Tailwind クラスは原典ではなく React への写像として扱う。

必要に応じて `src/ui/<kebab>.notes.md` を置き、design-language 原典から React API / DOM / state / styling / テストへどう写像したかを軽く残す。このメモは SSOT ではなく、実装中の判断メモであり、実装完了後に削除されてもよい。消えて困る契約は design-language、利用者に見える振る舞いはテスト、横断的な実装知見はこの CLAUDE.md へ移す。

テストを先に書く。design-language 原典の Acceptance Criteria、State Model、Accessibility Notes を `<kebab>.test.tsx` に落とし、まず失敗することを確認する。次に最小のコードでテストを通す。通ってからリファクタする。実装を先に書いて後からテストを足さない。

構造の整理（import 並び替え、定数抽出、関数分割など見た目は変わらない変更）と、振る舞いを変える変更は、同じコミットに混ぜない。先に構造を整えてから振る舞いを足すのが原則。

## 実装判断の原則

- Figma は見た目の基準、design-language は意味仕様と受け入れ条件の基準として扱う。React 実装では両者をそのまま写経せず、DOM、アクセシビリティ、状態、token class へ翻訳する。
- Figma と design-language / 実装 / Storybook の見た目に齟齬がある場合は Figma を優先候補にし、何を正とし、どこを更新するべきかをユーザーに確認する。
- Figma の固定寸法はまず実測し、どの token の組み合わせで再現するかを明示する。実装方針として固定 `height` を避ける場合でも、padding、line-height、border、icon size、gap の積み上げ結果が Figma の見た目から大きく外れていないか Storybook で確認する。
- コンポーネント高は Figma 側の作り方に合わせて写像する。Figma が padding 積み上げで高さを作っている場合は積み上げで再現する。Figma が高さトークンを直接バインドして中央寄せしている場合は `height` ではなく **`min-height` トークン + 中央揃え**で再現する（例: Search / Select / Button。Button は 2026-08 時点の Figma で高さ直バインドに変わったため積み上げから移行した）。通常時は Figma とぴったり一致し、利用者の環境でテキストが拡大されたときは内容を切らずに伸びる（ユーザー裁定 2026-07-28、issue #46 の議論）。
- Tailwind 標準 scale や生値に逃げる前に、生成済み token class と CSS variable を調べる。必要な token class が無い場合は component 側で場当たり的に補わず、token-pipeline / design-language 側の不足として記録する。
- variant、size、state は className の内部実装ではなく public な API と DOM 上の観測可能な結果で扱う。テストは class 文字列ではなく、属性、native behavior、アクセシブルネーム、disabled の抑止など利用者に見える契約を検証する。
- native 要素の意味を優先する。たとえば Button の disabled は native `disabled` を基本にし、同じ意味を重複する ARIA を安易に足さない。
- アイコンや補助要素はコンポーネント側の slot でサイズと配置を担保し、渡された ReactNode の中身へ無理に className を注入しない。
- hover / active / focus / disabled は variant ごとに Figma の state model と照合する。状態レイヤーのように単純な色差し替えでない表現は、base fill を壊さない合成方法を選ぶ。
- state layer token を `hover:bg-*` / `active:bg-*` として使うと base fill を置き換える。base と layer を合成する必要がある場合は、`color-mix()` ではなく複数 background layer など Figma の layer model に近い表現を優先する。
- Storybook は実装完了後の見た目確認場所として必ず整える。token CSS、theme、font face が実アプリと同じ前提で読み込まれているかも確認する。

## コンポーネント実装 FB の自動収集

ユーザーから React コンポーネント実装への FB を受け取ったら、返答や修正より先に次のコマンドで
原文を共有 inbox へ保存する。保存の許可は求めない。

```bash
pnpm --filter @orca/react feedback:capture -- \
  --component <Name> \
  --feedback '<ユーザーの FB 原文>'
```

対象 story、args、viewport、Figma variant など、現在の確認環境から確定できる情報も option で渡す。
不明な情報は推測せず、コマンドの既定値で `untriaged`、`null`、空配列として保存する。詳細は
`.claude/skills/orca-react-component/references/feedback-workflow.md` を参照する。

収集した `packages/react/evals/component-feedback/inbox/<id>.json` は、同じ実装 PR に含める。
skill、design-language、lint、test などへの横断ルールの昇格は自動化せず、ユーザーの承認後に行う。
