# orca Design Language

orca デザインシステムの原典。人間にも AI にも読まれることを前提に書かれる。
このドキュメントは入口であり、実体は Foundations と各 component doc にある。

## 構成

```
packages/design-language/
├ DESIGN.md                  ← このファイル（入口）
├ foundations/
│   ├ principles.md          ← 設計原則（言語・意味・トークン）
│   └ accessibility.md       ← アクセシビリティ共通要件 + WAI-ARIA / HTML 準拠宣言
└ components/<Name>/<Name>.md ← 各コンポーネントの SSOT（Foundations への差分・固有事項）
```

## 読む順序

1. **[foundations/principles.md](./foundations/principles.md)** — 設計原則。意味で語る・token 経由・語彙の安定性・逸脱の明示・プラットフォーム詳細の分離。
2. **[foundations/accessibility.md](./foundations/accessibility.md)** — a11y 共通要件と WAI-ARIA APG / HTML 標準への一括準拠宣言。
3. **components/&lt;Name&gt;/&lt;Name&gt;.md** — 個別コンポーネントの意味仕様。Foundations を暗黙の前提とし、固有事項・逸脱・追加ケアのみを書く。

## 関連パッケージ

- **`@orca/token-pipeline`** — W3C DTCG トークンを Terrazzo でビルドし CSS / Tailwind 出力を生成する。
- **`@orca/token-bridge-figma`** — Figma の variables / styles と token JSON を双方向同期する Figma Plugin。
- **`@orca/react`** — React 実装。SSOT に従う。React 固有の判断は `packages/react/src/<Name>/<Name>.notes.md` に置く。

## 参考リンク

- トークン同期の仕様: [`@orca/token-bridge-figma/docs/sync-spec.md`](../token-bridge-figma/docs/sync-spec.md)
- Terrazzo 統合の判断記録: [`@orca/token-pipeline/docs/terrazzo-integration.md`](../token-pipeline/docs/terrazzo-integration.md)
