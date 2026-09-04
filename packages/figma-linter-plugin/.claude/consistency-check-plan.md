> 注: この文書は独立リポジトリ時代の実装計画を保存したものです。コマンドと Workflow のパスは
> 現在の `packages/figma-linter-plugin` およびルートの `CLAUDE.md` を優先してください。

# 機能5: 横断チェック (Variant Consistency) — 実装プラン

## 実装状況 (2026-06-29)

- ✅ **Stage A** — 型 (`messages.ts`) + 純推論コア (`consistency-core.ts`) + テスト 13 件。
- ✅ **Stage B** — `inspect.ts` リファクタ: `readDimField` / `classifyContainerFills` 共有化、
  `readNodeProperties` / `bindNodeProperty` 公開。
- ✅ **Stage C** — エンジン `consistency.ts` (`deriveConsistencyReport` / `applyConsistencyFixes`)
  + `code.ts` ハンドラ (`get-consistency` / `apply-consistency-fixes`)。
- ✅ **Stage D** — UI: `CheckScreen` の単体/横断切替 + `ConsistencyList` + ストーリー/フィクスチャ/mock。
- ✅ **Stage E** — 仕上げ:
  - `color.overlay` (StateLayers) 対応で全プロパティ完成 (`readOverlayProperty` + bind)。
  - 軸一定度 (`axisConsistency`) を UI に表示 (推論の透明性)。
  - 「すべて揃える」前の確認モーダル (`ConsistencyConfirmModal`)。個別/グループは即時。
  - CI: `ci.yml` が PR で `npm test` 済み。`release.yml` (main) にも `npm test` を追加。
  - 純コアのテストに `freeThreshold` の挙動ロックを追加 (計 14 件)。
- ⏳ **残** — 実 Figma ファイル (例のボタン) での動作確認。`FREE_THRESHOLD` 既定 0.8 / radius 4 隅混在は
  現状維持で確定。

検証: typecheck (両 config) / build / `npm test` (30 passed) / build-storybook いずれもクリーン。
未検証: `consistency.ts` と `inspect.ts` の read/bind は Figma 実機でのみ動作 (純コア以外は自動テスト無し)。

## 0. 目的と位置づけ

既存の `機能4`（`inspect.ts`）は **1ノードを縦に見る「絶対チェック」**: 各バリアントが
「正しい名前空間の System トークンか・生値でないか」を固定の期待 prefix と突き合わせる。
判定はそのノード内で閉じており、隣のバリアントは見ない。

本機能は直交する **「相対チェック」**:

> 同じ種類のバリアント同士（例: 同じ Type/State）を横に並べ、**仲間内で同じトークンを
> 使っているか**を見る。例: ボタンの背景fillは Type と State で決まり、Size では変わらない
> はず → 「Type=Primary, State=Enabled を固定して Size だけ動かした3つ」は同じfillトークンで
> あるべき。1つだけ違えば横軸の不整合。

向き（どの軸を固定し、どの軸で揃えるか）はプロパティごとに違う（fill は Size で揃う、
height は Type/State で揃う）。**この向きをデザインから自動推論する**のが核。

確定済みの方針（ユーザー合意）:
- ルールの決め方 = **完全自動推論**（支配軸も期待トークンもデザインから導出、設定ゼロ）。
- 提示 = **グループ別リスト**。
- v1 範囲 = **全プロパティ**（色 + 寸法）。アルゴリズムは共通、値の取り出し器だけ差し替える。

このリポジトリの一貫した哲学（「トークンをハードコードせず live から導出」, `schema.ts`）に
沿い、「fill は Type+State で決まる」をコードに書かず、**支配的パターンから推論**する。

---

## 1. 自動推論アルゴリズム

プロパティ P ごとに：

1. **マトリクス構築** — Component Set の各子 COMPONENT を `variantProperties`（Type/Size/State）で
   分解。セル = 軸座標 → そのセルの P の現在値（トークン）。
2. **軸ごとの「一定度」を測る** — 軸 a を選び、a 以外を固定した“線”を全部取り、その線上で
   トークンが一定な割合 = `consistency(a)`。**推論には valid セル（正しいトークン）だけ**を使い、
   生値/誤りセルがルールを歪めないようにする。
3. **free / gov に振り分け** — `consistency(a) ≥ FREE_THRESHOLD`（既定 0.8）= **free（揃うべき＝横軸）**、
   未満 = **gov（変えてよい）**。
   - 全軸 free → 1グループ（全体で一定であるべき）。`inferable=true`。
   - **free 軸ゼロ**（どの軸でもトークンが変わる = P は全軸で正当に変わる）→ ピアが居ないので
     `inferable=false` でスキップ（**誤検知ガード**）。
4. **グルーピング＋多数決** — gov 座標でグループ化。各グループの最頻トークン = 期待値。
   - 同数割れ（厳密な多数派が無い）→ `ambiguous=true`, 期待値 null（**自動修正せず手動選択へ**）。
   - グループのセルが1つ → 自明に整合、外れ値なし。
5. **外れ値抽出** — 期待値と違う **applicable な全セル**（valid/invalid 問わず）が指摘対象。
   生値/誤りセルは多数決には投票しないが、「ピアが教える正しいトークン」に寄せられる
   （= 値マッチでは直せない生値も意図トークンへ修正できる相乗効果）。
6. **修正案** — 外れ値を期待トークンへ再バインド。

### ボタンでの動き（例）

背景fill: `consistency` は Size=高（S/M/L 同一）、Type=低・State=低 → `free={Size}, gov={Type,State}`。
グループ「Type=Primary, State=Enabled」(S/M/L) の期待 = 多数派トークン。Large だけ別トークンなら外れ値。
寸法系は逆に `gov={Size}, free={Type,State}` と推論され、**同じアルゴリズムが向きを自動反転**する。

### セルの正規化（純コアへの入力）

| セル種別 | `key`(比較キー) | `votable`(多数決に参加) | マトリクス参加 |
|---|---|---|---|
| na（対象外: hug の height, gap 無し 等） | `null` | — | 除外 |
| valid（正しい System トークン） | トークンのフルネーム | true | 参加 |
| invalid（生値 / 誤名前空間） | フルネーム or `raw:<value>` | false | 外れ値候補としてのみ参加 |

比較単位は **トークンの同一性（name/id）**。「同じトークンで揃っているか」が主旨。
（将来オプション: エイリアス経由で実色が同じケースを同一視する緩和。）

---

## 2. データモデル（`src/shared/messages.ts` 追加）

```ts
// ===========================================================================
// 機能5: 横断チェック (Variant Consistency)
// ===========================================================================

/** グループ内の期待（最頻）トークン。 */
export interface ConsistencyExpected {
  token: string;     // フルネーム "Color System/Brand/Primary"
  tokenId: string;
  value: string;     // 解決値 (hex / 実数)
  count: number;     // グループ内でこのトークンの数
  total: number;     // グループ内 votable セル数
}

/** バリアント1セルの要約（表示・再バインド用）。 */
export interface VariantCellSummary {
  nodeId: string;
  axes: Record<string, string>;   // { Type:'Primary', Size:'Large', State:'Enabled' }
  label: string;                  // free 軸の値だけ "Large" など（行表示用）
  token: string | null;           // 現在トークン フルネーム（null=未指定）
  tokenId: string | null;
  value: string | null;           // hex / 実数（スウォッチ・表示）
  valid: boolean;                 // Layer1（絶対チェック）合否
}

/** 1プロパティ×1グループの一貫性結果。 */
export interface ConsistencyGroup {
  key: Record<string, string>;    // gov 座標（グループキー）
  label: string;                  // "Type=Primary, State=Enabled"
  expected: ConsistencyExpected | null;  // ambiguous のとき null
  cells: VariantCellSummary[];           // free 軸の総当たり
  outliers: VariantCellSummary[];        // 期待と違うセル（指摘）
  ambiguous: boolean;
  /** ambiguous 時の手動選択肢（票が割れた候補）。 */
  candidates?: Array<{ tokenId: string; token: string; value: string; count: number }>;
}

/** 1プロパティの推論結果。 */
export interface ConsistencyPropertyReport {
  property: string;               // 'color.background' など（縦チェックの行 id と対応）
  label: string;                  // "背景fill"
  kind: 'dimension' | 'color';
  freeAxes: string[];             // ['Size']
  govAxes: string[];              // ['Type','State']
  inferable: boolean;             // false=規則を推定できず（スキップ）
  axisConsistency: Record<string, number>;  // 透明性: 各軸の一定度 0..1
  groups: ConsistencyGroup[];     // 外れ値 or ambiguous を含むグループのみ
  outlierCount: number;
}

/** Component Set 全体の横断チェック結果。 */
export interface ConsistencyReport {
  setNodeId: string;
  setName: string;
  axes: string[];                 // ['Type','Size','State']
  axisValues: Record<string, string[]>;
  variantCount: number;
  properties: ConsistencyPropertyReport[];
  totalOutliers: number;
  ambiguousCount: number;
}
```

メッセージ追加:

```ts
// UIMessage
| { type: 'get-consistency' }
| { type: 'apply-consistency-fixes'; fixes: Array<{ nodeId: string; property: string; refId: string }> }

// PluginMessage
| { type: 'consistency'; report: ConsistencyReport | null }   // null=選択がコンポーネントセットでない
| { type: 'consistency-applied'; fixed: number; failed: number }
```

対象プロパティ（縦チェックの行 id に合わせ、抽出器を再利用）:
`dimension.height` / `dimension.paddingTop|Bottom|Left|Right` / `dimension.gap` /
`dimension.radius`（4隅同一トークンなら其れ、混在は `mixed` 扱い） /
`color.background`（地色） / `color.on` / `color.overlay`（StateLayers; State でのみ applicable）。

---

## 3. 純推論コア（`src/shared/consistency-core.ts` 新規・Figma 非依存）

```ts
export interface MatrixCell {
  coord: Record<string, string>;
  key: string | null;   // null=対象外（除外）
  votable: boolean;     // valid トークンのみ true
}

export interface AxisInference {
  freeAxes: string[];
  govAxes: string[];
  inferable: boolean;
  axisConsistency: Record<string, number>;
}

/** votable セルだけで軸ごとの一定度を測り free/gov を決める。 */
export function inferAxes(
  axes: string[],
  cells: MatrixCell[],
  opts?: { freeThreshold?: number },  // 既定 0.8
): AxisInference;

export interface VoteGroup {
  key: Record<string, string>;
  members: MatrixCell[];
  expectedKey: string | null;       // 最頻 key（ambiguous は null）
  ambiguous: boolean;
  tally: Array<{ key: string; count: number }>;
}

/** gov 座標でグループ化し、votable で多数決。outlier 判定は呼び出し側（applicable 全セル）。 */
export function groupAndVote(cells: MatrixCell[], govAxes: string[]): VoteGroup[];
```

`consistency(a)` の定義:
- a 以外の座標でセルをグループ化 = a 方向の“線”。
- votable が2つ以上ある線のみ評価対象。その線上の key が全て等しければ「一定」。
- `axisConsistency[a] = 一定な線 / 評価対象の線`。評価対象が0なら a は判別不能 → free 扱い。

`inferable`:
- freeAxes が空 → false（全軸で変わる = ピア無し）。
- それ以外（全 free 含む）→ true。

→ **vitest 単体テスト対象**（Figma 不要で網羅しやすい）。

---

## 4. Figma 側エンジン（`src/main/consistency.ts` 新規）

```ts
export async function deriveConsistencyReport(): Promise<ConsistencyReport | null>;
export async function applyConsistencyFixes(
  fixes: Array<{ nodeId: string; property: string; refId: string }>,
): Promise<{ fixed: number; failed: number }>;
```

手順:
1. **対象セット解決** — 現在の選択から COMPONENT_SET を決める:
   - 選択が COMPONENT_SET → それ。
   - 選択が変種 COMPONENT（親が SET）や INSTANCE（main の親が SET）→ その SET。
   - 見つからなければ `null`（UI が「コンポーネントセットを選択」を表示）。
2. **軸解析** — `set.children`（各 COMPONENT）の `variantProperties` から軸名・値を収集。
3. **値抽出** — 各変種 × 各プロパティの現在値を `inspect.ts` の抽出器で取得（§5）。
   `findSystemCollections()` は1回、variable/collection キャッシュをセット全体で共有。
4. **推論** — プロパティごとに `MatrixCell[]` を組み、`inferAxes` + `groupAndVote`。
   outlier = グループ内 applicable セルのうち key ≠ expected。
5. **組み立て** — `ConsistencyReport`（外れ値 or ambiguous のあるプロパティ/グループのみ載せる）。

**修正適用** — outlier の property をその期待トークン（or 手動選択）へ再バインド:
- `dimension.height` → `setBoundVariable(node,'height',v)`
- `dimension.padding*` → 各辺フィールド
- `dimension.gap` → `itemSpacing`
- `dimension.radius` → 4隅すべて
- `color.background` → 地色 paint の index を再判定して `bindFillVariableAt`
- `color.on` → content leaf 各々に `bindFillVariable`
- `color.overlay` → StateLayers の overlay paint index に `bindFillVariableAt`

低レベルバインダ（`setBoundVariable` / `bindFillVariableAt` / `bindFillVariable`）は inspect.ts の
ものを再利用（export 追加）。

---

## 5. `inspect.ts` のリファクタ（挙動不変・最小）

横断エンジンが必要とする「1ノード → プロパティ別の現在トークン」を抽出する関数を新設し、
**色の地色/オーバーレイ分類ロジックを縦チェックと共有**する（ロジック分岐を防ぐ）。

```ts
export interface PropertyReading {
  property: string;
  tokenName: string | null;   // collection-scoped フルネーム
  tokenId: string | null;
  value: string | null;       // hex / 実数
  valid: boolean;             // Layer1（正しい名前空間 & 非生値）
  applicable: boolean;        // na でない
}

/** 1ノードを読み、プロパティ別の現在トークンを返す（縦チェックと同じ判定基準）。 */
export async function readNodeProperties(
  node: SceneNode,
  dimSystem: VariableCollection | null,
  colorSystem: VariableCollection | null,
  caches: Caches,
): Promise<PropertyReading[]>;
```

- 寸法: `readNumber`/`readBoundAlias`/`getVarCached`/`fullTokenName` を再利用。`evalField` と
  同じ ok/wrong/raw/empty 判定で valid/applicable を決める。
- 色: `checkContainerFill` の **地色/オーバーレイ分類**を `classifyContainerFills(node,...)` として
  抽出し、`checkContainerFill` と `readNodeProperties` の両方から呼ぶ。`color.on` は
  `collectContentLeaves` + 既存の On 判定を流用。
- 既存の縦チェック（CheckRow 生成）も可能な範囲でこの抽出器に寄せ、**既存テスト + 追加テストで
  挙動不変を担保**。バインダ群を `export` する。

---

## 6. UI（`CheckScreen.tsx` + 新規 `ConsistencyList.tsx`）

**エントリポイント** — `CheckScreen` 上部にセグメント切替「単体チェック / 横断チェック」。
横断タブで `get-consistency` を送信し、`consistency` を受けて `ConsistencyList` を描画。
選択が SET でなければ「コンポーネントセットを選択してください」。
**負荷を考え横断チェックは on-demand**（タブ表示/再検査ボタン）で、毎 selectionchange の自動実行は
しない（~45変種 × 全プロパティの読み取りは重い）。タブ表示中にセットが変わったら再取得。

**`ConsistencyList`（グループ別リスト）**:
```
背景fill        横軸: Size を揃える   (一定度 Size 1.00 / Type 0.20 / State 0.13)
├ Type=Primary, State=Enabled   期待 ● Brand/Primary (2/3)        [このグループを揃える]
│   ⚠ Large   ● Brand/Primary-Hover  →  [揃える]
├ Type=Ghost, State=Hover  ⚠ 決め手なし（票が割れています）
│   ○ StateLayers/.../8 (1)   ○ StateLayers/.../16 (1)  ← どちらかを選択
                                                       [このプロパティの外れ値をすべて揃える]
```
- 行は既存のスウォッチ/チップ class を再利用。外れ値は橙系で強調、期待トークンは緑系。
- `ambiguous` グループは候補を出して手動選択（選ぶまで「揃える」無効）。
- フッター「すべて揃える」= 非 ambiguous の外れ値を一括。適用前に確認モーダル（既存パターン流用）。
- 適用は `apply-consistency-fixes` → main が `runMutation` で再バインド → 再取得して最新を反映。

---

## 7. ファイル一覧

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/shared/messages.ts` | 編集 | 型 + メッセージ追加 |
| `src/shared/consistency-core.ts` | 新規 | 純推論（inferAxes / groupAndVote） |
| `src/shared/consistency-core.test.ts` | 新規 | vitest 単体テスト |
| `src/main/inspect.ts` | 編集 | `classifyContainerFills` 抽出 + `readNodeProperties` + バインダ export |
| `src/main/consistency.ts` | 新規 | セット解析・マトリクス構築・推論・修正適用 |
| `src/main/code.ts` | 編集 | `get-consistency`（読取）/ `apply-consistency-fixes`（mutation）ハンドラ |
| `src/ui/screens/CheckScreen.tsx` | 編集 | 単体/横断 切替 + メッセージ配線 |
| `src/ui/components/ConsistencyList.tsx` | 新規 | グループ別リスト UI |
| `src/ui/components/ConsistencyList.stories.tsx` | 新規 | ストーリー |
| `.storybook/fixtures.ts` | 編集 | サンプル `ConsistencyReport` |
| `src/ui/styles.css` | 編集 | リスト用スタイル（既存 chip を極力再利用） |

---

## 8. 段階導入（各段で独立にマージ可）

- **Stage A** — `messages.ts` 型 + `consistency-core.ts` + テスト（Figma 不要、純ロジックを先に固める）。
- **Stage B** — `inspect.ts` リファクタ（分類抽出 + `readNodeProperties`、挙動不変をテストで担保）。
- **Stage C** — `consistency.ts` エンジン + `code.ts` ハンドラ（読取＋修正適用）。
- **Stage D** — UI（切替 + `ConsistencyList` + ストーリー/フィクスチャ）。
- **Stage E** — 仕上げ（ambiguous 手動選択、軸一定度の透明性表示、エッジ、CI で `npm test`/typecheck）。

---

## 9. 既定の判断（誤検知を出さないためのガード）

- na セルは完全除外。推論は valid セルのみ。生値/誤りは推論を歪めず、推論済みルールに照らして指摘。
- free 軸ゼロ（全軸で変わる）プロパティは `inferable=false` でスキップ。
- 票割れグループは自動修正せず手動選択。
- 比較はトークン同一性（name/id）。
- 疎なマトリクス OK。意図的例外（Disabled だけ別fill 等）は該当軸が gov に入るので自然に通る。
- `FREE_THRESHOLD`/票割れ判定は調整可能にし、`axisConsistency` を UI に出して誤推論に人が気づけるように。

---

## 10. 未確定（実装時に詰める小項目）

- `FREE_THRESHOLD` の既定値（初期 0.8）と、中間帯（0.4〜0.8）を「低信頼」として警告するか。
- `color.overlay`（StateLayers）を v1 に含めるか、State 専用ロジックの細部。
- radius 4隅混在セルの扱い（`mixed` を外れ値とするか、別途指摘するか）。
- 横断タブをセット選択時に自動で見せるか、常時タブで出すか。
