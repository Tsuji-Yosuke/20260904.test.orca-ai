# Button implementation notes

この文書は `packages/design-language/components/Button/Button.md` を React 実装へ写像するためのメモであり、Button の意味仕様そのものではない。仕様の正は design-language 側に置く。実装・原典とこのメモが食い違う場合は、実装・原典を正とし、このメモを直ちに修正または削除する。

## Figma snapshot

2026-08-07 時点の Figma `Button` component set（node 1186:1331、published の正典はこの set のみ）。

- variant axes: `Type` Primary / Secondary / Ghost × `Size` Small / Medium / Large × `State` Enabled / Hover / Active / Focused / Disabled。
- 高さは `Sizing/Component/Full/sm|md|lg`（40 / 48 / 56）を `h` + `min-h` に**直接バインド**する。旧 snapshot（2026-06-08）の「padding 積み上げ」構造から Figma 側が変更された。
- Size ごとの寸法（Type を跨いで共通、スポットチェック済み）:

  | Size | px | py | gap | icon | typography |
  | --- | --- | --- | --- | --- | --- |
  | Small | `Padding/md` = 16 | `Padding/xs` = 8 | `Margin/md` = 4 | 16 | Tight/Body/Small（12 / 400） |
  | Medium | `Padding/lg` = 24 | `Padding/xs` = 8 | `Margin/md` = 4 | 20 | Tight/Body/MediumBold（14 / 700） |
  | Large | `Padding/3xl` = 48 | `Padding/md` = 16 | `Margin/lg` = 8 | 24 | Tight/Body/LargeBold（16 / 700） |

- radius は `Sizing/Radius/sm`（4）。Secondary の輪郭は `Sizing/Border/sm`（1）× `UI/Outline`。
- Secondary Active は基底 fill なしで `UI/StateLayers/DarkOpacity/16` を直接塗る（旧 snapshot にあった surface-bright 基底は現行 Figma には無い）。Ghost と同じ「透明基底 + state layer」構造。

## React への写像

- `variant="primary" | "secondary" | "ghost"` × `size="sm" | "md" | "lg"`（デフォルト `md`）が Figma の Type × Size に対応。
- 高さは `min-h-component-full-*` + 中央揃えで写像する（react CLAUDE.md の高さ裁定。Figma が高さ直バインドに変わったことに伴うユーザー裁定 2026-08-07）。通常時は 40 / 48 / 56 にぴったり一致し、テキスト拡大時は内容を切らずに伸びる。
- state layer は全 variant 共通で `hover:state-layer-8` / `active:state-layer-16`（background-image 重畳、base fill を壊さない）。
- Focused は Figma の State variant ではなく `focus-visible:shadow-focus-outline`（共有 `FOCUS_VISIBLE_RING`）へ写像。
- Disabled は variant ごとに semantic token（Primary: `bg-disabled text-on-disabled` / Secondary: `border-disabled text-on-disabled` / Ghost: `text-on-disabled`）。
- `leadingIcon` / `trailingIcon` は slot wrapper（`size-icon-*`）でサイズを担保し、アクセシブルネームは可視 Label が担う。

## 一時的な gap

- Figma ラベルの `font-feature-settings: "palt" 1` は `typography-tight-body-*` utility に無く、再現していない。Button 側では場当たり対応しない（ユーザー裁定 2026-08-07）。token-pipeline / typography 側の不足として要対応。
- Figma の min-width（Small 32 / Medium 38）は意味づけ不明のため写していない。design-language の Open Questions に記録済み（ユーザー裁定 2026-08-07）。
- `UI/OutlineFocus` は現行 Figma では `#0187A7` だが、`tokens/variables/color-system.json` は `{Brand.Toyota Red}` のまま（token 同期が現行 Figma より古い）。Button は semantic token を参照するだけなので、値の更新は token-bridge-figma の再同期で解決する。
