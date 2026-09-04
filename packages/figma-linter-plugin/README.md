# Common UI Plugin — Figma Plugin

TypeScript + React 製の Figma プラグインテンプレートです。ローカルの Variable コレクション一覧を取得して表示するサンプル実装が入っています。

## 構成

```
manifest.json          Figma プラグインのマニフェスト
scripts/build.mjs      esbuild ビルドスクリプト（UI を 1 枚の HTML にインライン化）
.storybook/            Storybook 設定（UI を Figma 外のブラウザでプレビュー）
src/
  main/                Figma サンドボックスで動くコントローラ（figma API）
    code.ts
    tsconfig.json
  ui/                  iframe で動く React UI
    index.html         HTML テンプレート（JS / CSS はビルド時に注入）
    main.tsx           React エントリ
    App.tsx
    messaging.ts       型付き postMessage ヘルパー
    styles.css
  shared/
    messaging.ts       ← (UI ⇄ main) で共有するメッセージ型
dist/                  ビルド成果物（code.js / ui.html）
```

UI（iframe）と main（サンドボックス）は別々の環境で動くため、`postMessage` で通信します。やり取りする型は `src/shared/messages.ts` に集約しています。

## セットアップ

monorepo のルートで実行します。

```bash
pnpm install
```

## 開発

```bash
pnpm --filter @orca/figma-linter-plugin dev        # ファイル監視 + 自動ビルド
pnpm --filter @orca/figma-linter-plugin build      # 本番ビルド（minify）
pnpm --filter @orca/figma-linter-plugin typecheck  # 型チェック（UI / main を別々に検証）
```

## Storybook（UI を外部環境でプレビュー / テスト）

Figma を開かずに、ブラウザだけで UI コンポーネントや各パネルを開発・確認できます。

```bash
pnpm --filter @orca/figma-linter-plugin storybook         # 開発サーバ（http://localhost:6007）
pnpm --filter @orca/figma-linter-plugin build-storybook   # 静的サイトを storybook-static/ に出力
```

- **状態網羅**: 各コンポーネント / パネルの状態（読み込み中・空・適用中・成功フィードバック等）を Story 化しています（`src/ui/**/*.stories.tsx`）。
- **プラグイン全体の操作**: 「Plugin / Full UI」ストーリーは、Figma メインスレッドをブラウザ内モック（`.storybook/figma-messaging.mock.ts`）で代替し、タブ切替・プリセット適用・スライダー操作まで一通り動かせます。本番コードは無改変で、Storybook 実行時のみ `src/ui/messaging.ts` をモックへ差し替えています（`.storybook/main.ts` の `viteFinal`）。
- **テーマ切替**: ツールバーから Figma のライト / ダークを再現できます（`--figma-color-*` を `.storybook/figma-theme.css` で供給）。実機の `themeColors` 相当。
- **アクセシビリティ検査**: `@storybook/addon-a11y` を同梱（このプラグインの UI は WAI-ARIA パターンを実装しているため）。

> ビルダーは Vite（`@storybook/react-vite`）です。本番プラグインのビルド（`scripts/build.mjs` の esbuild）とは独立しており、Storybook 関連はすべて devDependencies と `.storybook/` ・ `*.stories.tsx` に閉じています。

## Figma で読み込む

1. `pnpm --filter @orca/figma-linter-plugin build`（または `dev`）で `dist/` を生成
2. Figma デスクトップアプリ →「Plugins」→「Development」→「Import plugin from manifest…」
3. `packages/figma-linter-plugin/manifest.json` を選択
4. メニューやクイックアクションからプラグインを実行

> `manifest.json` の `"id"` は開発用の値（`COMMON_UI_PLUGIN`）です。公開する場合は Figma が発行する正式な ID に置き換えてください。

## カスタマイズのヒント

- UI ⇄ main のメッセージを増やすときは、まず `src/shared/messages.ts` に型を追加 → 両側で `switch` 分岐を足す、の順がおすすめです。
- `manifest.json` の `documentAccess` は `dynamic-page` です。ノードへアクセスする際は `figma.getNodeByIdAsync()` などの非同期 API を使ってください。
- 外部通信が必要になったら `manifest.json` の `networkAccess.allowedDomains` を更新します。
