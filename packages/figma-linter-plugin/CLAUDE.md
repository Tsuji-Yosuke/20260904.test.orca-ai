# CLAUDE.md — @orca/figma-linter-plugin

このパッケージで作業する際のガイドです（Claude Code 向け）。Figma Variables を扱う
Figma プラグイン（TypeScript + React）です。

## プロジェクト概要

- **manifest.json** — Figma プラグインのマニフェスト。
- **検知ルールと判定ロジックは `@orca/figma-linter-core` に移管済み**。仕様書 (SSoT) は
  `packages/figma-linter-core/docs/detection-rules.md`、カタログは同パッケージの `src/rules.ts`。
  CI の定期 lint (`@orca/figma-linter-ci`) と同じコアを共有するため、検査の判定を変えるときは
  必ずコア側を変更する（プラグイン内にロジックを複製しない）。
- **src/main/** — Figma サンドボックス（メインスレッド）で動くコントローラ。`figma` API を直接叩く。
- **src/main/adapter.ts** — 検査コアの Plugin API アダプタ（LintNode / LintVariable / binder 実装）。
- **src/main/inspect/** — プラグイン固有の検査まわり: 選択の解決・プレビュー PNG・アナトミー目印
  （`anatomy.ts`）・自動修正の適用。判定そのものはコアを呼ぶ。
- **src/ui/** — iframe で動く React UI（`components/` 部品 / `panels/` パネル / `screens/` 画面）。
- **src/shared/messages.ts** — UI ⇄ main で共有する型付きメッセージプロトコル（唯一の正）。
  検査結果の型（CheckRow / FixDiff / ConsistencyReport 等）はコアから re-export している。
- **.storybook/** — Storybook 設定。UI を Figma 外のブラウザで開発・確認する。
- **scripts/build.mjs** — esbuild ビルド（UI を 1 枚の HTML にインライン化）。
- **worker/** — 更新チェック用 JSON を配信する Cloudflare Worker。

UI（iframe）と main（サンドボックス）は別環境で動くため `postMessage` で通信します。やり取りする型は
必ず `src/shared/messages.ts` に集約し、両側の `switch` 分岐を更新してください。

## コマンド

```bash
pnpm --filter @orca/figma-linter-plugin dev               # ファイル監視 + 自動ビルド
pnpm --filter @orca/figma-linter-plugin build             # 本番ビルド（minify）
pnpm --filter @orca/figma-linter-plugin typecheck         # 型チェック（UI / main を別々に検証）
pnpm --filter @orca/figma-linter-plugin test              # vitest（schema / updateCheck 等のユニットテスト）
pnpm --filter @orca/figma-linter-plugin storybook         # Storybook 開発サーバ（http://localhost:6007）
pnpm --filter @orca/figma-linter-plugin build-storybook   # 静的 Storybook を storybook-static/ に出力
```

## 検知ルール（SSoT = @orca/figma-linter-core）

チェックデザイン機能の検知ルールは **`packages/figma-linter-core/docs/detection-rules.md` が唯一の正
（SSoT）**。コードがドキュメントに従属する関係をコア側の `rules.test.ts` が強制しており、
ドキュメントの「ルール一覧」表と `figma-linter-core/src/rules.ts` の `RULES` カタログが食い違うと
テストが落ちる。追加・変更の手順は `packages/figma-linter-core/README.md` を参照。

- **判定ロジックはコア側 (`figma-linter-core/src/inspect/*`) を変更する**。プラグイン側に検査の
  分岐を足さない（CI の lint と挙動がズレる）。
- 判定の根拠となるトークン名は **Figma の Variable Collection が正**（例: Color System の `UI/OnDisabled`）。
  コードに書く collection 相対名は実エクスポートと一致させる。
- コアを変更したら、このプラグインと `@orca/figma-linter-ci` の両方の test / typecheck を確認する。

## Storybook（必須ルール）

**UI コンポーネントを新規追加・変更したら、対応する Story を必ず作成・更新すること。** Story の無い
UI 変更はマージしない。Figma を開かずにブラウザだけで全状態を確認できる状態を常に維持する。

### 何に Story が必要か

- `src/ui/components/`・`src/ui/panels/`・`src/ui/screens/` 配下の表示要素には、対応する
  `*.stories.tsx` を **必ず** 用意する（純粋なロジック専用モジュールは除く）。
- 新しいコンポーネントを足したら同じコミットで Story を足す。props や状態を増やしたら Story にも
  反映する（不足している状態を放置しない）。
- 1 コンポーネント = 1 Story ファイル（`Foo.tsx` → `Foo.stories.tsx`、同じディレクトリに置く）。

### Story の規約（既存に合わせる）

- **title の命名**: `Components/*`（再利用部品）/ `Panels/*`（パネル）/ `Plugin/*`（画面・全体 UI）。
  先頭カテゴリはディレクトリに対応させ、leaf 名はコンポーネント名にする
  （`screens/CheckScreen` → `Plugin/CheckScreen`）。例外として全体 UI（`App`）は `Plugin/Full UI`
  とし、個別画面と区別する。
- **autodocs**: すべての `meta` に `tags: ['autodocs']` を付ける（Docs ページを自動生成する）。
- **ダミーデータは `.storybook/fixtures.ts` に集約** し、Story から import する。コンポーネント内や
  Story 内に本物っぽいデータをハードコードしない（本番のトークン構造の正は Figma の Variable
  Collection。fixtures はあくまでプレビュー用の固定サンプル）。
- **コールバック props は `storybook/test` の `fn()`** を使う（アクションパネルで発火を確認できる）。
- **`parameters.figmaFrame`** で実機のプラグインウィンドウ寸法を再現する
  （既定 `width: 360`。下線などを端まで伸ばす要素は `padding: 0`）。
- **状態網羅**: 主要な状態（loading / empty / busy / error / success / 単一・複数選択など）を
  それぞれ別 Story にする。モーダルは通常状態と `busy`（適用中）の両方を出す。
- **Figma メインスレッドに依存する画面**（`App` や `screens/*`）は `./messaging` /`../messaging` が
  `.storybook/figma-messaging.mock.ts` に差し替わる（`.storybook/main.ts` の `viteFinal`）。本番コードは
  無改変のまま、mock 越しにインタラクティブ動作させる。新しいメッセージを足したら mock の応答も足す。
- **テーマ / a11y**: ライト・ダークはツールバーで切替（`.storybook/figma-theme.css`）。`addon-a11y` を
  同梱しているので、a11y パネルの指摘は基本的に解消する。

### 最小テンプレート

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Foo } from './Foo';

/** 何を見せる Story か（デザイン参照番号があれば併記）。 */
const meta: Meta<typeof Foo> = {
  title: 'Components/Foo',
  component: Foo,
  tags: ['autodocs'],
  args: { /* 既定 props。コールバックは fn() */ onChange: fn() },
  parameters: { figmaFrame: { width: 360, padding: 16 } },
};
export default meta;

type Story = StoryObj<typeof Foo>;

export const Default: Story = {};
```

### コミット前チェック

1. `pnpm --filter @orca/figma-linter-plugin build-storybook` が通る（Story がビルドエラーにならない）。
2. `pnpm --filter @orca/figma-linter-plugin typecheck` が通る。
3. 変更・追加した UI に対応する Story が存在し、主要な状態を網羅している。

## コーディング規約

- コメント・UI 文言は日本語、識別子は英語（既存ファイルに倣う）。コメントの密度・命名・イディオムは
  周囲のコードに合わせる。
- メッセージを増やすときは **まず `src/shared/messages.ts` に型を追加** → UI / main 双方の `switch` に
  分岐を足す、の順。
- `manifest.json` の `documentAccess` は `dynamic-page`。ノードアクセスは `figma.getNodeByIdAsync()` 等の
  非同期 API を使う。
- 型は厳格（strict / `noUncheckedIndexedAccess` / `verbatimModuleSyntax` / `isolatedModules`）。
  型インポートは `import type` を使う。
- ロジック（`src/main/schema.ts`・`src/main/adapter.ts`・`src/ui/lib/*`）を変更したら対応する
  `*.test.ts` を更新・追加する。検知ルール・判定ロジックの変更はコア側で行い、
  [検知ルール（SSoT）](#検知ルールssot--orcafigma-linter-core) の手順に従う。
