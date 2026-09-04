# @orca/component-meta

コンポーネントカタログの手書きメタデータ。registry（shadcn 配布）とドキュメントサイトが共有する、名前・タイトル・原典パス・配布ファイルの一覧を提供します。

- ビルドを持たない TS ソース直 export（`exports: { ".": "./src/index.ts" }`）。利用側が transpile する（apps/registry は tsx、apps/website は Next.js の `transpilePackages`）。
- 説明文（description）はここに置かない。`designDoc` がある UI アイテムは design-language 原典 frontmatter の `description` が正本（規約: `packages/design-language/README.md`）。`designDoc` を持たない lib アイテムだけ、このパッケージの `description` を使う。
- 依存関係もここに書かない。apps/registry の catalog が import 文から機械算出する。
