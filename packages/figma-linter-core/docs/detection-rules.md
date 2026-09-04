# 検知ルール仕様 (SSoT)

「機能4: チェックデザイン」が、選択したコンポーネントの**トークン利用**を検査する際の
ルール定義の唯一の出典 (Single Source of Truth) です。

- **このドキュメントが人間向けの SSoT**です。ルールを追加・変更するときは、まずここを更新します。
- コード側のカタログは [`src/rules.ts`](../src/rules.ts) にあり、検査ロジック
  (`src/inspect/`) はそれを参照します。
- 両者の整合は [`src/rules.test.ts`](../src/rules.test.ts) が
  [後述のルール一覧表](#ルール一覧)を解析して照合します。**片方だけ変更するとテストが落ちます**
  (= このドキュメントが実装を統制します)。

---

## 1. 目的

選択コンポーネント (およびその配下の Auto Layout 要素) が、

1. **正しい System トークン**を使っているか (実数のベタ指定や、別コレクション/誤った名前空間の
   トークンになっていないか)、
2. 値が一致するなら**正しいトークンへバインドし直せる**か

を検査します。検査は read-only で、「適用」を押したときだけ NG 項目を**値マッチ**で推定して
バインドし直します。トークンの実値・名前・エイリアスはプラグインにハードコードせず、
live な Variables API から導出します。固定なのは「期待する名前空間 (prefix)」だけです。

## 2. 前提

### 2.1 対象コレクション

| 役割 | コレクション | 解決方法 |
| --- | --- | --- |
| 数値トークン | **Dimension System** | 名前に `dimension system` を含む。無ければ `system` を含み `typography`/`color` を含まないもの。 |
| 色トークン | **Color System** | 名前に `color system` を含む。無ければ `color` と `system` を含むもの。 |

`(deprecated)` を含むコレクションは候補から除外します。該当コレクションが見つからない場合、
その**セクションの全行は対象外 (na)** とし、誤検知を出しません。

### 2.2 検査対象ノードの展開

選択ノード群を次の規則で「検査対象」へ展開します (詳細は `collectCheckTargets`)。

- 各ルート (明示選択) は検査可能なら必ず含める (Component / Instance も含む)。
- 配下を再帰し、**Auto Layout のフレーム**を深さ無制限で集める (Component / Instance でも含める。
  例: サイドバーの各メニュー項目)。
- ただし**ネストした Component / Component Set / Instance の「中身」には潜らない** (内部のアイコン・
  ラベル等は検査対象にしない)。

対象が 1 件なら詳細 (アナトミー付き)、2 件以上なら一覧 (Index) を返します。一覧では「内容署名
(メイン + 公開プロパティ + 中身のテキスト/構造) かつ 検査結果 (合否・修正件数) が同一」のものを
1 件に畳みます (繰り返しメニュー項目など)。

## 3. 判定状態と自動修正

### 3.1 行の状態 (`CheckStatus`)

| 状態 | 意味 | 件数集計 |
| --- | --- | --- |
| `pass` | 期待どおり正しいトークンが使われている | pass にカウント |
| `fail` | 誤ったトークン / 別コレクション / 実数のベタ指定 | fail にカウント |
| `na` | 対象外 (値が無い、Auto Layout でない、hug、コレクション欠如 等) | カウントしない |

数値フィールドは内部的に次の 4 状態で評価します (`evalField`)。

- **ok** → `pass`: 期待コレクション内で正しい prefix のトークンにバインド済み。
- **wrong** → `fail`: 別物のトークン / 別コレクション / 解決不能 (`?`) にバインド。
- **raw** → `fail`: 未バインドで実数 (> 0) がベタ指定されている。
- **empty** → `na`: 未バインドで値が無い (null / ≤ 0)。

### 3.2 自動修正 (`apply`)

- **Dimension (raw / wrong)**: 同カテゴリの候補トークンから**最近傍の値**を選んでバインド
  (`matchNumber`)。差分には before/after のトークン名と実数を記録します。
- **Color (背景)**: 既に正しければ修正なし。誤って On カラーが背景なら非 On 版へ寄せます
  (`stripOn`、決定的)。生値 / 別コレクションは現在色に最も近い**非 On** System カラーへ寄せます
  (色マッチは曖昧なので背景の付け替えのみで、中の要素へ特定 On を強制しません)。
- **Color (On)**: 期待 On ペアが**確実なときだけ**その On トークンへバインド (曖昧なときは案内のみ)。
- **Color (オーバーレイ)**: 近傍の StateLayers トークンへ寄せます (alpha 込みで色マッチ)。

### 3.3 一括修正 (Index の「一括で修正」)

安全策として、**Color は変換せず**、**実数が変わらない寸法トークン化のみ** (`beforeValue === afterValue`)
を適用します。値が変わる丸め寄せ (例 23 → 24) や Color は一括対象外として残します。

## 4. ルール一覧

検知ルールの正本です。`src/rules.ts` の `RULES` と 1:1 で対応します
(`rules.test.ts` が照合)。

- **ID**: 行 ID (`CheckRow.id`)。検査結果・アナトミー・修正差分の安定キー。
- **アナトミー**: プレビュー上の固定番号 (`—` は目印なし)。
- **期待バインド (prefix / slot)**: Dimension は正トークンの接頭辞、Color は検査スロット。
- **検査フィールド**: 読み取る Figma ノードのフィールド。

<!-- rules-table:start -->
| ID | ラベル | カテゴリ | アナトミー | 期待バインド (prefix / slot) | 検査フィールド |
| --- | --- | --- | --- | --- | --- |
| `dimension.height` | Component Height | dimension | 1 | `Sizing/Component/` | `height` |
| `dimension.paddingTop` | Padding Top | dimension | 2 | `Spacing/Padding/` | `paddingTop` |
| `dimension.paddingBottom` | Padding Bottom | dimension | 3 | `Spacing/Padding/` | `paddingBottom` |
| `dimension.paddingLeft` | Padding Left | dimension | 4 | `Spacing/Padding/` | `paddingLeft` |
| `dimension.paddingRight` | Padding Right | dimension | 5 | `Spacing/Padding/` | `paddingRight` |
| `dimension.gap` | Margin | dimension | 6 | `Spacing/Margin/` | `itemSpacing` |
| `dimension.gapWrap` | Margin (Wrap) | dimension | — | `Spacing/Margin/` | `counterAxisSpacing` |
| `dimension.radius` | Radius | dimension | 7 | `Sizing/Radius/` | `topLeftRadius, topRightRadius, bottomLeftRadius, bottomRightRadius` |
| `color.background` | Background | color | 8 | `background` | `fills` |
| `color.on` | On | color | 9 | `on` | `fills` |
<!-- rules-table:end -->

## 5. 各ルールの詳細

### Dimension セクション

Dimension System が見つからないときは全行 na。

#### `dimension.height` — Component Height

- **目的**: 高さが `Dimension System / Sizing/Component/*` トークンで指定されているか。
- **na**: 高さが **hug** (コンテンツ追従) のとき (`VERTICAL` かつ `primaryAxisSizingMode=AUTO`、
  または `HORIZONTAL` かつ `counterAxisSizingMode=AUTO`)。チップは `Hug`。あるいは値が無い (empty)。
- **pass / fail**: §3.1 の通り。
- **修正**: 最近傍の `Sizing/Component/*` 候補へ。

#### `dimension.paddingTop` / `paddingBottom` / `paddingLeft` / `paddingRight` — Padding 各辺

- **前提**: **Auto Layout のときのみ**各辺を 1 行ずつ検査する。Auto Layout でないときは集約行
  `dimension.padding` を na で出す (各辺行は出さない)。
- **目的**: 各辺パディングが `Spacing/Padding/*` トークンか。
- **修正**: 最近傍の `Spacing/Padding/*` 候補へ。

#### `dimension.gap` — Margin

- **前提**: **Auto Layout のときのみ** `itemSpacing` を検査する。Auto Layout でないときは na。
- **目的**: 要素間の隙間が `Spacing/Margin/*` トークンか。
- **修正**: 最近傍の `Spacing/Margin/*` 候補へ。

#### `dimension.gapWrap` — Margin (Wrap)

- **前提**: `layoutWrap=WRAP` かつ `counterAxisSpacing` が**独立指定**のときだけ追加で検査する
  (独立バインドがある、または値が `itemSpacing` と異なる)。未設定時の getter は `itemSpacing` を
  ミラーするため、独立でないときは検査しない (二重計上・偽陽性を避ける)。
- **アナトミー番号なし** (プレビュー目印は出さない)。
- **修正**: 最近傍の `Spacing/Margin/*` 候補へ。

#### `dimension.radius` — Radius

- **目的**: 4 隅 (`topLeftRadius` / `topRightRadius` / `bottomLeftRadius` / `bottomRightRadius`) が
  `Sizing/Radius/*` トークンか。**4 隅を 1 行に集約**する。
- **集計**: 値のある隅 (relevant) がすべて ok なら pass、1 つでも非 ok なら fail。チップは全一致で
  その値、混在で `mixed`。
- **修正**: 各隅を最近傍の `Sizing/Radius/*` 候補へ。

### Color セクション

Color System が見つからないときは全行 na。

#### `color.background` — Background

- **目的**: 背景の地色が `Color System` の **group/variant 2 段・先頭が On でない**トークンか。
- **インタラクション状態の 2 枚 fill**: State=Hover などでは背景が「地色 + StateLayers の半透明
  オーバーレイ」になり得る。可視 SOLID 塗りを次のように分類する。
  - **オーバーレイ**: StateLayers/* にバインド済み、または (インタラクション状態 かつ 未バインド
    かつ 実効 alpha < `0.5`)。
  - **地色**: それ以外。**最下層 (最小 index)** を背景代表とする。
- **地色の合否**: 上記 2 段・非 On なら pass。On / 別物 / 生値は fail。
- **オーバーレイの合否**: `StateLayers/*` にバインド済みなら pass、生値 / 別トークンは fail。
- **集計**: いずれか fail → fail / いずれか pass → pass / それ以外 na。オーバーレイがあるときだけ
  1 行 2 チップ (地色 + オーバーレイ) で内訳を見せる。
- **修正 (地色)**: §3.2 の通り (誤 On → 非 On 変換は決定的、生値/別物 → 近傍非 On カラー)。
- **修正 (オーバーレイ)**: 近傍の `StateLayers/*` トークンへ。
- **On ペアの伝播**: 地色が確定 (正しい背景、または On→非 On 変換が一意) のときだけ
  「期待 On ペア名」(`group/On{variant}`) を算出し、`color.on` の厳密一致に渡す。

#### `color.on` — On

- **目的**: 中の要素 (テキスト / アイコンの content leaf) の最初の可視 SOLID 塗りが、背景に対応する
  On カラーか。
- **判定**:
  - 期待 On ペアが**確実** (`color.background` から渡される) なら、その On トークンに**厳密一致**で pass。
  - 期待が曖昧 / 不明なら「`Color System` の On カラー (先頭 On)」であれば pass。
- **例外1 — ワイルドカード On**: `UI/OnPlaceholder` / `UI/OnDisabled` は背景の group/variant に依らず
  **常に pass** (Surface + OnPlaceholder / Surface + OnDisabled のように任意の背景と組み合わせて
  使えるため)。Container 版 (`OnPlaceholderContainer` / `OnDisabledContainer`) は対象外。
- **例外2 — State=Error**: バリアント `State=Error` のとき、On スロットに `UI/Error` を許容する
  (背景に依らない例外)。
- **集計**: content leaf が無ければ na。全要素が正なら pass、1 つでも非正なら fail。チップは全一致で
  値、混在で `mixed`。
- **修正**: 期待 On が確実なときだけその On トークンへバインド (曖昧なときは案内のみで強制しない)。

## 6. 検知ルールではない行 (na プレースホルダ)

次の ID は「対象外」を示すプレースホルダで、検知ルールではありません (ルール一覧表には載りません)。

- `dimension.padding` — Auto Layout でないときの Padding 集約 na 行。
- Dimension System / Color System が見つからないときの na 行 (`dimension.height` /
  `dimension.padding` / `dimension.gap` / `dimension.radius` / `color.background` / `color.on`)。

## 7. アナトミー番号

プレビュー上の固定番号です。ルールごとに不変で、na 行・番号なしの行は飛ばします (連番を詰め直さない)。

| 番号 | ルール |
| --- | --- |
| 1 | Component Height |
| 2 | Padding Top |
| 3 | Padding Bottom |
| 4 | Padding Left |
| 5 | Padding Right |
| 6 | Margin (Gap) |
| 7 | Radius |
| 8 | Background |
| 9 | On |

`Margin (Wrap)` は番号を持ちません。

## 8. エラー文

違反 1 種をユーザー向けに要約する日本語文の正本です。現在は CI の Slack / Actions Summary 通知が
使っていますが、プラグイン側のエラー表示など、違反を人に伝える場面で共通に使うことを想定して
います。消費者は違反を種別 (下表のキー) に分類し、この表の文をそのまま使います。コード側のカタログは
[`src/error-messages.ts`](../src/error-messages.ts) にあり、`error-messages.test.ts` がこの表と
照合します (ルール一覧表と同じ方式。**片方だけ変更するとテストが落ちます**)。

`{ルール}` `{カテゴリ}` `{コレクション}` `{プロパティ}` は表示時に実際の名前 (ルール表・
機能5 のプロパティ表示名) へ置換されるプレースホルダです。言い換えは行いません — 表示名が
分かりにくい場合は、この文書のラベル定義そのものを見直します。

<!-- error-messages:start -->
| 種別キー | エラー文 |
| --- | --- |
| `dimension.raw` | {ルール}にトークン未使用 |
| `dimension.unresolvable` | {ルール}のトークンが参照できない (ノイズ変数の可能性) |
| `dimension.mixedCorners` | {ルール}の指定が四隅で不揃い |
| `dimension.wrongCategory` | {ルール}に{カテゴリ}トークンを指定 |
| `dimension.wrongToken` | {ルール}に誤ったトークンを指定 |
| `dimension.wrongCollection` | {ルール}に{コレクション}のトークンを指定 |
| `background.overlayRaw` | 状態オーバーレイにトークン未使用 |
| `background.raw` | Backgroundにトークン未使用 |
| `background.unresolvable` | Backgroundのトークンが参照できない (ノイズ変数の可能性) |
| `background.reference` | BackgroundにReferenceカラーを指定 |
| `background.on` | BackgroundにOnカラーを指定 |
| `background.wrongToken` | Backgroundに誤ったカラートークンを指定 |
| `background.wrongCollection` | Backgroundに{コレクション}のカラーを指定 |
| `on.raw` | Onカラーにトークン未使用 |
| `on.unresolvable` | Onカラーのトークンが参照できない (ノイズ変数の可能性) |
| `on.mixed` | Onカラーの指定が混在 |
| `on.reference` | OnカラーにReferenceカラーを指定 |
| `on.wrongPair` | 背景に対応しないOnカラーを指定 |
| `on.nonOn` | OnカラーにOn以外のカラーを指定 |
| `on.wrongCollection` | Onカラーに{コレクション}のカラーを指定 |
| `consistency.mismatch` | {プロパティ}が他バリアントと不揃い |
<!-- error-messages:end -->

どの違反がどの種別キーに分類されるか (current 値の分類ロジック) は
`figma-linter-ci/src/notify.ts` の `classifyViolation` を参照してください。

## 9. メンテナンス手順

ルールを追加・変更・削除するときは:

1. **このドキュメント**の「ルール一覧」表と該当する詳細節を更新する。
2. [`src/rules.ts`](../src/rules.ts) の `RULES` カタログを同じ内容に更新する。
3. 必要なら検査ロジック (`src/inspect/`) を実装する。
4. エラー文が必要なら「エラー文」表と [`src/error-messages.ts`](../src/error-messages.ts) を更新する。
5. `pnpm --filter @orca/figma-linter-core test` を実行する。`rules.test.ts` が「ルール一覧」表と `RULES`、
   `error-messages.test.ts` が「エラー文」表とカタログの整合を検査し、ズレていれば失敗します。
