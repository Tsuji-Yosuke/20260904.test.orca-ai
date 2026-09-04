# Figma 予備知識

## 目的

このドキュメントは、Figma Variable Sync の開発に必要な Figma 側の概念を整理するためのもの。
Figma Plugin API の公式仕様に基づきつつ、本プラグインでの扱い方と制約を併記する。

## Variables

### 概要

Variable は Figma におけるデザイントークンの単位。
1 つの Variable は 1 つの値（色、数値、文字列、真偽値）を持ち、Mode ごとに異なる値を定義できる。

### 型

Variable の型は `resolvedType` で表される。

| resolvedType | 値の例 | 主な用途 |
|---|---|---|
| `COLOR` | `{ r: 0, g: 0, b: 0, a: 1 }` | 塗り、線、エフェクト色 |
| `FLOAT` | `16` | フォントサイズ、角丸、間隔 |
| `STRING` | `"Noto Sans"` | フォントファミリ、テキスト内容 |
| `BOOLEAN` | `true` | コンポーネントプロパティの切替 |

### Variable Alias

Variable の値は、リテラル値の代わりに別の Variable への参照（Alias）にできる。

```typescript
// Alias の構造
interface VariableAlias {
  type: "VARIABLE_ALIAS";
  id: string; // 参照先 Variable の ID
}
```

- `variable.valuesByMode` は Alias を解決せずそのまま返す
- Alias チェーンを自分で辿る必要がある
- 循環参照は Figma 上では作れないが、repo 側の手編集で発生し得る

**本プラグインでの扱い:**

- Figma 読み取り時: Alias の `id`（Figma 内部 ID）を source ID に正規化して保存
- repo JSON 上: `{collection.variable.path}` 形式の参照文字列に変換
- Figma 書き戻し時: 参照文字列から Variable を解決し `createVariableAlias()` で再構成
- 循環参照検出: DFS で検出し、該当 Variable は skip して warning を返す

### Scope

Variable は `scopes` プロパティで、UI のどのピッカーに表示されるかを制御できる。
例えば `FRAME_FILL` を指定すると、フレームの塗りピッカーにのみ表示される。

本プラグインでは scope 情報の同期は現時点で対象外。

## Variable Collection

### 概要

Variable Collection は Variable のグループ。
同じ Collection に属する Variable は、同じ Mode のセットを共有する。

```
Collection "Colors"
├── Mode: "Light", "Dark"
├── Variable "primary"    → Light: #000, Dark: #FFF
├── Variable "secondary"  → Light: #333, Dark: #CCC
└── Variable "accent"     → Light: #06F, Dark: #3AF
```

### 主なプロパティ

| プロパティ | 説明 |
|---|---|
| `id` | 一意識別子（Figma が生成） |
| `name` | 表示名 |
| `modes` | `{ modeId, name }` の配列 |
| `defaultModeId` | デフォルト Mode の ID |
| `variableIds` | 所属する Variable の ID 一覧 |

### repo JSON との対応

本プラグインでは、1 Collection = 1 JSON ファイルとして DTCG 互換形式で出力する。
各トークンの `$value` はデフォルトモードのスカラー値、マルチモードの場合は `$extensions.mode` にモード名をキーとした全モード値を格納する。
ファイル内に Collection のメタデータ（名前、Mode 定義、ハッシュ）を `$extensions.figmaSync` に格納する。
詳細は [@orca/token-pipeline の terrazzo-integration.md](../../token-pipeline/docs/terrazzo-integration.md) を参照。

## Mode

### 概要

Mode は Collection 内の「値のバリエーション軸」。
典型的には Light / Dark、言語、密度などの切り替えに使う。

1 つの Collection には最低 1 つの Mode がある（`defaultModeId`）。
Collection 内のすべての Variable は、その Collection の全 Mode に対して値を持つ必要がある。

### Figma の制約

- **Mode 数の上限はプランによる。** Free プランでは 1 Mode のみ。
- **default mode は Plugin API から変更できない。** `defaultModeId` は read-only。

### Mode ID の不安定性

Figma は Mode ID を内部で自動生成する（例: `"1:0"`, `"1:1"`）。
Collection を削除して再作成すると、同じ Mode 名でも異なる ID が割り当てられる。

**本プラグインでの対策:**

source ID と actual ID の二重管理を行う。

- **source ID**: repo JSON 上で使う安定した識別子
- **actual ID**: Figma が実際に生成した ID

この対応関係は `pluginData` の `modeIdMap`（`Record<sourceId, actualId>`）に保存する。

```
repo JSON 上の Mode ID (source)  ←→  Figma 上の Mode ID (actual)
"light"                          ←→  "1:0"
"dark"                           ←→  "1:1"
```

読み取り時は actual → source に変換し、書き戻し時は source → actual に変換する。

### Mode の reconciliation

repo から Figma に反映する際の Mode 照合ロジック:

1. stored metadata の `modeIdMap` で source ID → actual ID を探す
2. 見つからなければ Mode 名で照合する
3. それでも見つからなければ `collection.addMode()` で新規作成する
4. Figma 側にあって repo 側にない Mode は**削除しない**（保守的方針）
5. 照合結果を `modeIdMap` に保存する

## Extended Collection

### 概要

Extended Collection は、既存の Collection を継承して値をオーバーライドできる仕組み。
**Enterprise プラン限定の機能。**

```
Library Collection "Brand Colors" (親)
├── Mode: "Default"
├── Variable "primary" → #06F
└── Variable "secondary" → #333

Extended Collection "Product A Colors" (子)
├── Variable "primary" → #F60  ← オーバーライド
└── Variable "secondary" → (継承: #333)
```

### 仕組み

- 親 Collection の `extend(name)` または `figma.variables.extendLibraryCollectionByKeyAsync()` で作成
- 子は親の Mode と Variable を継承する
- 子で `variable.setValueForMode()` するとオーバーライドになる
- `variable.removeOverrideForMode()` で継承に戻せる
- `collection.isExtension` が `true` なら Extended Collection

### 本プラグインでの扱い

現時点では Extended Collection を明示的にモデル化していない。
通常の Collection として読み書きする。Enterprise 環境での追加対応が将来必要になる可能性がある。

## Style

### 概要

Style は再利用可能なデザインプロパティのセット。
Variable が「1 つの値」を持つのに対し、Style は「複合的なプロパティ群」を持つ。

**Variable との違い:**

| | Variable | Style |
|---|---|---|
| 値の構造 | 単一値 | 複合値（配列やプロパティ群） |
| Mode | あり（Mode ごとに値を持つ） | なし |
| 用途 | トークン | 塗り、タイポグラフィ、エフェクト、グリッド |

### Style の種類

#### Paint Style

塗り（Fill / Stroke）のスタイル。`paints: Paint[]` を持つ。

```typescript
// Paint は複数持てる（グラデーション重ねなど）
style.paints = [
  { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 },
];
```

**本プラグインの制約:** 単一の SOLID Paint のみ対応。複数 Paint やグラデーションは warning を出して skip する。

#### Text Style

タイポグラフィのスタイル。フォント、サイズ、行間などの複数プロパティを持つ。

主なプロパティ: `fontName`, `fontSize`, `lineHeight`, `letterSpacing`, `paragraphSpacing`, `paragraphIndent`, `textCase`, `textDecoration`

**本プラグインでの扱い:** 全プロパティを対応。書き戻し時に `figma.loadFontAsync()` が必要。

#### Effect Style

エフェクト（シャドウ、ブラーなど）のスタイル。`effects: Effect[]` を持つ。

**本プラグインの制約:** `DROP_SHADOW` と `INNER_SHADOW` のみ対応。`LAYER_BLUR` などは warning を出して skip する。

#### Grid Style

レイアウトグリッドのスタイル。`layoutGrids: LayoutGrid[]` を持つ。

**本プラグインでの扱い:** 対応済み。配列をそのまま保存・復元する。

### Style と Variable の結合（Bound Variables）

Style の個々のフィールドに Variable を bind できる。
bind された フィールドは Variable の値に追従し、Mode 切り替えに応じて動的に変わる。

```
Paint Style "Brand Fill"
├── color → Variable "brand/primary" に bind
└── opacity → 固定値 1.0
```

bind 可能なフィールドの例:

| Style 種別 | bind 可能フィールド |
|---|---|
| Paint | color, opacity |
| Text | fontFamily, fontStyle, fontWeight, fontSize, lineHeight, letterSpacing, paragraphSpacing, paragraphIndent |
| Effect | color, offset, radius, spread |
| Grid | sectionSize, count, offset, gutterSize |

**本プラグインでの扱い:**

- 読み取り時: `boundVariables` の Variable ID を source ID に正規化して保存
- 書き戻し時: source ID から Variable を解決し、API の bind ヘルパーで再設定
- bind 先の Variable が import セットに存在しない場合は warning を返す

### repo JSON との対応

本プラグインでは、Style は style type ごとに 1 JSON ファイルとして出力する。

| Style 種別 | token type |
|---|---|
| paint | `color` |
| text | `typography` |
| effect | `shadow` |
| grid | `other` |

### Style 名のフォルダ構造

Style 名は `/` 区切りでフォルダ階層を表現する。

```
"colors/primary/main" → Figma UI 上は colors > primary > main に表示
```

## ID の不安定性（共通の注意点）

Figma が生成する ID（Variable ID, Collection ID, Style ID, Mode ID）は、エンティティを削除して再作成すると変わる。

本プラグインでは `pluginData` に `sourceId` を保存し、Figma の内部 ID が変わっても同一エンティティとして追跡できるようにしている。照合の優先順位:

1. `pluginData` に保存した `sourceId` で照合
2. 見つからなければ `name` で照合（フォールバック）

## 用語対応表

| Figma 用語 | 本プラグインでの用語 | 補足 |
|---|---|---|
| Variable | variable / token | repo JSON 上では token として扱う |
| VariableCollection | collection | 1 collection = 1 JSON ファイル |
| Mode | mode | source ID / actual ID の二重管理 |
| VariableAlias | alias / reference | repo JSON 上では `{path}` 形式 |
| PaintStyle | paint style | `styleType: "paint"` |
| TextStyle | text style | `styleType: "text"` |
| EffectStyle | effect style | `styleType: "effect"` |
| GridStyle | grid style | `styleType: "grid"` |
| boundVariables | bound variables | Style のフィールドと Variable の紐付け |
| pluginData | plugin data / metadata | エンティティごとの永続ストレージ |
