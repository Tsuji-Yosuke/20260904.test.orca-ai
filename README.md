# orca

コンポーネントは shadcn/ui 方式（ソースコピー）で配布する。利用方法は [docs/registry.md](docs/registry.md) を参照。

## Packages

- `@orca/design-language` — デザインシステムの原典と contracts（SSOT）
- `@orca/figma-linter-plugin` — Figma Variables の操作とデザイン整合性チェックを行う Plugin
- `@orca/token-pipeline` — W3C DTCG 準拠トークンの Terrazzo ビルドパイプライン
- `@orca/token-bridge-figma` — Figma variables / styles と token JSON の双方向同期 Plugin

## 開発

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```
