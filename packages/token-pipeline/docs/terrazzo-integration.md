# Terrazzo 統合

## 目的

このドキュメントは、プラグインが出力するトークン JSON を Terrazzo で変換して実コード（CSS, JS 等）として利用する方法を整理するもの。

## Terrazzo とは

[Terrazzo](https://github.com/terrazzoapp/terrazzo) は DTCG（Design Tokens Community Group）形式の JSON を入力に取り、CSS custom properties, Sass 変数, JS/TS モジュール, Swift コード等を出力するトークンコンパイラ。

主な特徴:

- DTCG 形式に準拠した入力を期待する
- マルチモード対応（`$extensions.mode`）
- プラグインベースの出力（CSS, Sass, JS/TS, Tailwind, Swift 等）
- `$extensions` の未知キーは無視する（`figmaSync` と共存可能）

## 出力形式

プラグインの JSON 出力は DTCG/Terrazzo 互換形式になっている。

### Variable トークン（マルチモード）

```json
{
  "color": {
    "primary": {
      "$type": "color",
      "$value": "#111111ff",
      "$extensions": {
        "mode": {
          "Light": "#111111ff",
          "Dark": "#eeeeeeff"
        },
        "figmaSync": {
          "variableId": "VariableID:1:2",
          "modeValues": { "m-light": { "hex": "#111111ff" }, "m-dark": { "hex": "#eeeeeeff" } },
          "updatedHash": "...",
          "syncedHash": "...",
          "managed": true
        }
      }
    }
  }
}
```

- `$value` はデフォルトモードのスカラー値
- `$extensions.mode` はモード名をキーにした全モード値
- `$extensions.figmaSync` は同期用メタデータ（Terrazzo は無視する）

### Variable トークン（単一モード）

```json
{
  "spacing": {
    "sm": {
      "$type": "number",
      "$value": 8,
      "$extensions": {
        "figmaSync": { "..." : "..." }
      }
    }
  }
}
```

単一モードのコレクションでは `$extensions.mode` を省略する。

### Style トークン

Style トークン（paint / text / effect / grid）はモードを持たない。
`$value` はスカラー値またはオブジェクト。

### Alias

DTCG の参照構文 `{color.text.primary}` をそのまま使う。
`$extensions.mode` 内の値も alias にできる。

```json
{
  "$value": "{color.primary}",
  "$extensions": {
    "mode": {
      "Light": "{color.primary}",
      "Dark": "#ff0000ff"
    }
  }
}
```

## `$type` の互換性

| 値 | DTCG 互換 | 備考 |
|---|---|---|
| `"color"` | 互換 | |
| `"number"` | 互換 | |
| `"string"` | 互換 | Terrazzo 拡張 |
| `"boolean"` | 互換 | Terrazzo 拡張 |
| `"typography"` | 互換 | |
| `"shadow"` | 互換 | |
| `"other"` | **非標準** | grid style に使用。Terrazzo で認識されない可能性がある |

## JSON の手編集

GitHub 側で JSON を手編集する場合、`$extensions.mode` の値を変更すれば良い。
`$extensions.figmaSync.modeValues` を合わせて更新する必要はない。
parse 時に `$extensions.mode` を正として `modeValues` を再構成する。

## 旧形式の後方互換

以前の形式（`$value` が mode ID をキーとした辞書）も parse できる。
旧形式の JSON は次回の export で自動的に新形式に置き換わる。

旧形式の判定: `$value` がオブジェクトで `$extensions.mode` が存在しない場合。

## 内部モデルとの関係

DTCG 形式は JSON の入出力層（serialize.ts / parse.ts）でのみ扱う。
内部の `SyncDocument` モデルでは `token.value` は mode ID をキーとした辞書のまま。

```
JSON (DTCG)                    内部モデル (SyncDocument)
$value: "#111111ff"            token.value: { "m-light": "#111111ff", "m-dark": "#eeeeeeff" }
$extensions.mode: { Light, Dark }
                    ↕ serialize / parse
$extensions.figmaSync.modeValues: { "m-light": ..., "m-dark": ... }
```

serialize 時に mode ID → mode 名に変換し、parse 時にコレクションメタデータの `modes` 配列を使ってモード名 → mode ID に逆変換する。

## Terrazzo 設定例

```javascript
// terrazzo.config.js
import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";

export default defineConfig({
  tokens: [
    "./tokens/variables/*.json",
    "./tokens/styles/*.json"
  ],
  outDir: "./generated/",
  plugins: [
    css({
      filename: "tokens.css",
      modeSelectors: [
        {
          mode: "Light",
          selectors: [
            '@media (prefers-color-scheme: light)',
            '[data-theme="light"]'
          ]
        },
        {
          mode: "Dark",
          selectors: [
            '@media (prefers-color-scheme: dark)',
            '[data-theme="dark"]'
          ]
        }
      ]
    })
  ]
});
```

出力イメージ:

```css
:root {
  --color-primary: #111111ff;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #eeeeeeff;
  }
}

[data-theme="dark"] {
  --color-primary: #eeeeeeff;
}
```

## Tailwind 統合

CSS に加えて `@terrazzo/plugin-tailwind` を使うことで、Tailwind CSS のプリセットを生成できる。

### 設定例（CSS + Tailwind 併用）

```javascript
// terrazzo.config.js
import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";
import tailwind from "@terrazzo/plugin-tailwind";

export default defineConfig({
  tokens: [
    "./tokens/variables/*.json",
    "./tokens/styles/*.json"
  ],
  outDir: "./generated/",
  plugins: [
    css({
      filename: "tokens.css",
      modeSelectors: [
        {
          mode: "Light",
          selectors: [
            '@media (prefers-color-scheme: light)',
            '[data-theme="light"]'
          ]
        },
        {
          mode: "Dark",
          selectors: [
            '@media (prefers-color-scheme: dark)',
            '[data-theme="dark"]'
          ]
        }
      ]
    }),
    tailwind({
      filename: "tailwind-tokens.js"
    })
  ]
});
```

CSS プラグインがモード切替（Light/Dark）を CSS 変数 + メディアクエリで処理し、Tailwind プラグインはその CSS 変数を参照するプリセットを生成する。

### Tailwind 設定

```javascript
// tailwind.config.js
import tailwindTokens from "./generated/tailwind-tokens.js";

export default {
  presets: [tailwindTokens],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
};
```

アプリのエントリ CSS で `tokens.css` を読み込む:

```css
/* src/global.css */
@import "../generated/tokens.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

使用例:

```html
<div class="text-color-primary bg-color-surface">
  Light/Dark はメディアクエリまたは data-theme 属性で自動切替
</div>
```

> **注意**: `@terrazzo/plugin-tailwind` の出力形式（preset object か theme extension か）はバージョンによって異なる可能性がある。実際の出力を確認して `tailwind.config.js` の統合方法を調整すること。

## 推奨ワークフロー

### エンドツーエンドのフロー

```
1. デザイナーが Figma でトークンを変更
2. @orca/token-bridge-figma プラグインで diff を確認 → PR を作成
   (packages/token-pipeline/tokens/variables/*.json, tokens/styles/*.json が変更される)
3. 開発者が PR をチェックアウト → pnpm --filter @orca/token-pipeline tokens で再生成
4. generated/ の差分をコミット
5. CI が整合性を検証（tokens:check）
6. PR マージ → デプロイ
```

### orca 内のパッケージ配置

`@orca/token-pipeline` が token source と Terrazzo ビルドを保持する。`@orca/token-bridge-figma` プラグインは、このパッケージの `tokens/` 配下を同期ターゲットとして参照する。

```
packages/token-pipeline/
  tokens/                   ← token-bridge-figma プラグインの targetDir
    variables/
      core.json
      red.json
      ...
    styles/
      paint.json
      text.json
  terrazzo.config.mjs
  tailwind.template.css
  generated/                ← Terrazzo 出力（git 管理）
    tokens.css
    tailwind-tokens.css
  package.json
```

`@orca/token-bridge-figma` の設定画面で、orca リポジトリの owner / repo / baseBranch と targetDir (`packages/token-pipeline/tokens`) を設定する。

### npm scripts

`@orca/token-pipeline/package.json`:

```json
{
  "scripts": {
    "tokens": "npx tz build && node scripts/postprocess-tailwind-tokens.mjs && node scripts/generate-typography-utilities.mjs",
    "tokens:check": "npx tz build && node scripts/postprocess-tailwind-tokens.mjs && node scripts/generate-typography-utilities.mjs && git diff --exit-code generated/"
  }
}
```

- `tokens`: トークン JSON から CSS / Tailwind プリセットを再生成し、`postprocess-tailwind-tokens.mjs` と `generate-typography-utilities.mjs` で後処理する
- `tokens:check`: 上記を再生成した上で `generated/` に差分がないことを検証

ルートから叩く場合は `pnpm --filter @orca/token-pipeline tokens` / `pnpm --filter @orca/token-pipeline tokens:check` を使う。

### CI（GitHub Actions）

orca の `.github/workflows/tokens.yml` を参照。`packages/token-pipeline/**` への変更をトリガーに `tokens:check` を走らせる。

### 生成物の git 管理

`generated/` はコミットする（gitignore しない）。

理由:

- PR の diff でトークン変更の実際の影響（CSS / Tailwind）がレビューできる
- デプロイ時にビルド依存がない
- ファイルサイズは小さい（CSS + JS プリセット）

## 未対応の制約

### `$type: "other"`

grid style に使っている `"other"` は DTCG 非標準。
Terrazzo が無視するかエラーにするかは要検証。
必要に応じて Terrazzo のカスタムプラグインで対応する。

### モード名の一致

`terrazzo.config.js` の `modeSelectors` に指定するモード名は、Figma のコレクションモード名と完全一致が必要。
デザイナーが Figma 側でモード名をリネームした場合、Terrazzo 設定も手動で更新する必要がある。

### 切替軸の対応表

Storybook / アプリ側は以下の 4 軸を独立の HTML 属性として切り替える。各軸の由来と CSS 属性は次のとおり。

| 軸 | 由来 | CSS 属性 |
|---|---|---|
| theme | Light / Dark モード | `data-theme` |
| lang | JP / EN モード | `data-lang` |
| density | Expressive / Productive のコレクション | `data-density` |
| color-system | Color System の Extended Collection | `data-color-system` |

density テーマは 2 つの形を受け付ける。(1) 親子方式: `parentCollectionId` を持つ
Extended Collection（Typography の Expressive / Productive が現行この形）。(2) 差し替え方式:
親情報を持たない独立コレクション（2026-08 の Figma 再構成後の Dimension の Expressive /
Productive）。差し替え方式は `siblingThemeBaseCollectionName` の表（コレクション名 →
畳み込み先の既定コレクション名）で判定し、同名変数を既定コレクションの追加モードとして
畳み込む。独立コレクションのまま Terrazzo に渡すと既定モードの値が `:root` を上書きするため、
この畳み込みを外してはならない。

`color-system` 軸の値はコレクション名を `cssVariableSlug()` で slug 化したもの（例: `Corporate` → `corporate`）。
Light モードは既定値のため属性単独のセレクタ（`[data-color-system="corporate"]`）になり、Dark モードは
`data-theme` との複合セレクタ（`[data-color-system="corporate"][data-theme="dark"]`）になる。

この判定は、拡張元の親コレクション名が `"Color System"` と完全一致する場合にのみ有効になる
（`preprocess-tokens.mjs` の `colorSystemParentCollectionNames`）。Figma 側で親コレクション名がリネーム
されると判定が外れ、`[data-theme="<名>-<モード>"]` という未知コレクション向け fallback に落ちる。
この変化は `tokens:check` の生成物差分として検出できる。

運用上の注意: `[data-theme="dark"]` 単独セレクタの specificity は (0,1,0)、拡張側の複合セレクタ
`[data-color-system="..."][data-theme="dark"]` は (0,2,0) であり、同点にはならない。拡張 Color System
（Corporate 等）が Dark モードを持っていれば、この複合セレクタが確実に勝つため競合は起きない。

危ういのは、base の Color System に Dark モードがあり、拡張側（Corporate 等）が Light モードしか
持たない場合である。このとき拡張側は Light 用の単独セレクタ `[data-color-system="corporate"]`
（0,1,0）しか生成せず、これが base の `[data-theme="dark"]`（0,1,0）と specificity 同点になる。
どちらが効くかは CSS ソース順（後勝ち）で決まってしまい、corporate の Light 配色と base の Dark
配色が中途半端に混在しうる。拡張 Color System（Corporate 等）の見た目が base の Dark 配色に
引きずられないよう、base に Dark モードを追加する際は拡張側の Extended Collection にも同時に
Dark モードを揃えて追加すること。
