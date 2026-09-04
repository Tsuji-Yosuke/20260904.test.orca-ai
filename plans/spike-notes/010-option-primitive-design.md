# Spike 010: Search / Select が共有する Option プリミティブの所属と依存方向

- 元プラン: `plans/010-spike-shared-option-primitive.md`
- 実行日: 2026-07-14
- Drift check: `git diff --stat 73dd926..HEAD -- packages/design-language/components/Search/Search.md packages/design-language/components/Select/Select.md packages/react/src/Search` は空。プラン記載の「Current state」引用は現物と一致（差分なし、STOP せず続行）。

## 結論（先出し）

**推奨: 案 A — `packages/react/src/internal/` に非公開の視覚専用 Option モジュールを置き、
Search は `Autocomplete.Item`（= `ComboboxItem`）に、Select は `Select.Item` にそれぞれ
被せる。** 依存方向は「Search → Select」でも「Select → Search」でもなく、「Search と
Select が共に internal モジュールに依存する」。

根拠は以下 3 点（詳細は各節）:

1. Base UI 実ソースで確認した事実として、`Autocomplete.Item` と `Select.Item` は
   **別実装**（別ファイル・別 React context ツリー）だが、DOM 上に出す **`data-selected` /
   `data-highlighted` / `data-disabled` の集合は完全一致**する。これは「振る舞いの実装は
   別々にせざるを得ないが、視覚を駆動する状態インターフェースは共有できる」ことを意味し、
   案 A の前提（視覚層のみ共有）にちょうど合う。
2. Figma 側でも、`Search`（node `1748:16971`）の published component は
   `Select/Menu`（node `1688:26547`。さらに配下に `Select/Menu/MenuItem`, node
   `1688:26347`）を **dependency として直接インスタンス化**している。ユーザーが不採用と
   裁定したのは `Select/Menu/MenuItem` 内の「チェックボックス風装飾」という一部の見た目
   要素であり、「Search の候補行が Select 系コンポーネントの構造を再利用する」という
   Figma 側の構造そのものは維持されている。これは案 B（Select が正、Search が依存）や
   案 C（共有しない）よりも案 A（対称な共有）を支持する一次情報である。
3. Select.md の AC「所属パッケージが変わっても意味が変わらない」は、視覚・anatomy
   （Row Container / Label / Description / Leading・Trailing Slot / Selection Indicator の
   配置順）を 1 箇所に持つ案 A が最も直接的に満たす。案 B は「Select 実装後に Search が
   Select 内部へ依存する」形になり、意味的にも「所属パッケージが変わっても意味が変わらない」
   の逆（意味の所在が Select パッケージに固定される）に近い。案 C はクラス文字列の重複を
   許すため、2 箇所が将来ずれるリスクを構造的に排除できない。

---

## Step 1: Base UI 制約（実測）

確認した Base UI バージョン: **`1.0.0-rc.0`**
（`packages/react/node_modules/@base-ui-components/react/package.json` の `"version"` フィールド）

### 1-1. Autocomplete.Item（=ComboboxItem）と Select.Item は同一実装か

**別実装。** 根拠:

- `packages/react/node_modules/@base-ui-components/react/autocomplete/index.parts.js`
  は `Item` を `require("../combobox/item/ComboboxItem")` から再輸出している。つまり
  **`Autocomplete.Item` は文字通り `ComboboxItem` の別名**（Autocomplete は Combobox の
  パーツ群を土台にした薄いラッパー）。
- `packages/react/node_modules/@base-ui-components/react/select/index.parts.js` の
  `Item` は `require("./item/SelectItem")` — Select 専用ディレクトリ配下の独立実装。
- `ComboboxItem.js`（`combobox/item/ComboboxItem.js`）は `useComboboxRootContext` /
  `useComboboxDerivedItemsContext`（Combobox 側 store）に依存し、`SelectItem.js`
  （`select/item/SelectItem.js`）は `useSelectRootContext`（Select 側 store）に依存する。
  Provider ツリーそのものが別物であり、一方の Item をもう一方の Root 配下でそのまま
  動かすことはできない（=「同じコンポーネントを両方から import して使う」という
  安易な共有は技術的に不可能）。
- 振る舞いにも実質差がある: `ComboboxItem` は `role="option"`（Row 内では `gridcell`）で
  `tabIndex` を常に `undefined`（複合リストのフォーカス委譲に任せる）、選択確定時に
  `submitOnItemClick` があれば `requestSubmit()` を伴う。`SelectItem` は `role="option"`
  固定・`tabIndex={highlighted ? 0 : -1}` の明示的な roving tabindex、`multiple` の
  有無で選択確定時に配列へ足し引きする分岐を持つ。ホバー時のハイライト制御
  （`onMouseEnter` / `onMouseMove` / `onMouseLeave` と `highlightItemOnHover`）は
  `SelectItem` にしかない。

### 1-2. data 属性の異同（属性名を仮定せず実ソースで確認）

`ComboboxtemDataAttributes.js`（原文ファイル名のタイポは Base UI 側のまま）と
`SelectItemDataAttributes.js` を突合すると、**両者は文字列として完全一致**:

| 状態 | Combobox 側 enum 値 | Select 側 enum 値 |
|---|---|---|
| 選択済み | `data-selected` | `data-selected` |
| ハイライト | `data-highlighted` | `data-highlighted` |
| 無効 | `data-disabled` | `data-disabled` |

さらに、両実装は `useRenderElement` に渡す `state` オブジェクトを
`{ disabled, selected, highlighted }` という**同じ形**で組み立てている
（`ComboboxItem.js` L106-110、`SelectItem.js` L92-96）。`useRenderElement` →
`getStateAttributesProps`（`utils/getStateAttributesProps.js`）はカスタム
mapping を渡していない限り `value === true` の state キーを機械的に
`data-${key}` に変換するデフォルト規則を使うため、この一致は偶然ではなく、
「同じ state 形状を渡せば同じ data 属性が出る」という Base UI 共通のレンダリング
規約に基づく。Tabs の前例（data-selected が実際には存在しなかった）と異なり、
今回は両実装のソースで直接確認済み。

Selected の意味論には差がある点は注意: `ComboboxItem` の `selected` は
`selectionMode !== 'none'` のときのみ有効になる（Search の現行実装は
`selectionMode` を明示していないため既定値次第。実測は Search.tsx 側で
`data-[highlighted]` しかスタイリングしておらず `data-[selected]` は未使用 —
Search は「一時的な候補提示」であり永続的な選択状態を持たないため）。
`SelectItem` の `selected` は Select 本体の確定値と直接結び付く恒常的な状態。
→ **`data-highlighted` と `data-disabled` は両コンポーネントが同じ意味で
使う共通状態、`data-selected` は Select 側でのみ意味を持つ拡張状態**として
扱うのが安全（Step 3 のトークン対応表に反映）。

### 1-3. スタイル層だけを共有する場合に必要な最小インターフェース

以下が揃えば、Base UI の実装差を意識せず視覚層を共有できる:

- 対象要素（`ComboboxItem` / `SelectItem` とも `div` をデフォルトレンダー）が
  `data-highlighted` / `data-selected` / `data-disabled` を **true のときだけ**
  属性として持つこと（確認済み、両実装とも `useRenderElement` 経由で保証）。
- `className` が文字列または `(state) => string` を受け付け、かつ
  `componentProps` の残り（`{...elementProps}`）がそのまま DOM 属性として
  素通しされること（両実装とも `useRenderElement('div', componentProps, ...)`
  に `componentProps` をそのまま渡しており、`render` prop によるカスタム
  レンダーも両方でサポート）。
- `children` をそのまま内部 DOM として描画できること（どちらも子要素の
  制約を持たない、通常の React children）。

この 3 点さえ満たせば、共有すべき「視覚層」は **Base UI の state を一切
importせず、`data-*` 属性セレクタ（Tailwind の `data-[highlighted]:` 等）
だけで駆動する Tailwind クラス文字列 + 内部 anatomy（Leading/Label/
Description/Trailing/Selection Indicator の配置）を返す純粋な
プレゼンテーション層**として書ける。Base UI の Root/Context には一切触れない
ため、Combobox 由来か Select 由来かに依存しない。

---

## Step 2: 3 案比較

判断基準:

1. Base UI 制約（Step 1）と両立するか。
2. design-language の意味論（Select.md AC「所属パッケージが変わっても意味が
   変わらない」を満たすか）。
3. 既出荷 Search への影響（破壊的変更の有無、テストへの影響）。

| 案 | Base UI 制約との両立 | Select.md AC 充足 | Search への影響 |
|---|---|---|---|
| **A: 共通 Option 視覚モジュール**（internal, 非公開） | ◎ 視覚層のみなら Combobox/Select の実装差を吸収できる（Step 1-3） | ◎ anatomy・token 対応が 1 箇所に集約され、所属パッケージが変わっても見た目の意味が変わらない | 小（Item の中身を internal コンポーネントに委譲するだけ。公開 API・テストへの影響なし） |
| **B: Select.Item を正とし Search が依存** | △ 技術的には Search が Select パッケージを import すること自体は可能だが、Search の実 Item は `ComboboxItem` のままなので「依存」は視覚 class の使い回し止まりで A と実質同じ効果しか得られない。かつ Select（未実装）に Search（ready・出荷済み）が依存する向きは実装順序と逆行する | △ 「Select が正」を明示すると、意味の所在が Select パッケージに固定されてしまい、AC の「所属パッケージが変わっても意味が変わらない」という中立性の趣旨とややズレる | 中〜大（Select 実装完了を待たないと Search を改修できない。Select の内部変更が意図せず Search に波及するリスクを恒久的に抱える） |
| **C: 共有しない**（token クラス文字列の定数のみ、意味論は文書レベル） | ○ 最も単純で Base UI 差を気にしなくてよい | △ クラス文字列だけの共有では anatomy（Leading/Description/Trailing/Selection Indicator の並び）の一致は保証されない。実装者が将来どちらかだけ変更すれば意味が乖離しうる。AC を満たすかは「運用の規律」に依存してしまう | 小（今の Search 実装とほぼ同じ書き方を継続できる） |

**推奨: 案 A。** 案 B を採らない理由（1〜2文）: Search はすでに `status: ready`
で出荷済みだが Select は `draft`・未実装であり、「Select を正として Search が
依存する」は実装順序と依存方向を逆立ちさせる。加えて Search の Item は
`ComboboxItem` である以上、Select.Item を直接使うことはできず、結局 A と同じ
「視覚層だけ共有」に帰着するため、B は A に対する優位性がない。
案 C を採らない理由（1〜2文）: クラス文字列だけの共有は anatomy（要素の
並び・存在条件）の一致までは強制しないため、Select.md の Item anatomy
（Selection Indicator の位置切替、Description の有無など）が今後変わった際に
Search 側の実装者が追随を忘れるリスクを構造的に消せない。Figma が
`Search` → `Select/Menu` → `Select/Menu/MenuItem` という依存構造を実際に
持っている（Step 1 冒頭の一次情報）ことも、コード側で対称な共有モジュールを
持つ案 A の妥当性を裏付ける。

---

## Step 3: 推奨案（A）の API スケッチと影響範囲

### 3-1. モジュール配置

```
packages/react/src/internal/option/OptionRow.tsx   # 非公開の視覚専用コンポーネント
packages/react/src/internal/option/optionRow.notes.md  # 任意（実装時の判断メモ）
```

- `packages/react/src/index.ts` からは **export しない**（`internal/` は
  `@orca/react` パッケージ内部でのみ import される非公開モジュールという位置付け。
  現状 `src/` 直下に `internal/` は存在しないため、これが最初の導入例になる）。
- design-language 側には `Option` という独立コンポーネント文書は作らない
  （Select.md の「Item / Option（独立 anatomy 単位）」節が既に意味の SSOT。
  internal モジュールはその React 実装の一写像に過ぎない）。

### 3-2. props / 状態と token クラスの対応表

`OptionRow` は Base UI の state を一切知らない、純粋な anatomy コンポーネント。
状態はすべて **消費側（Search.tsx / Select.tsx）が `className` に渡す
`data-[highlighted]:` 等の Tailwind data 属性セレクタ**として表現する
（Step 1-3 の結論どおり）。

`OptionRow` props（案）:

| prop | 型 | 意味 | anatomy 上の位置 |
|---|---|---|---|
| `label` | `ReactNode`（必須） | Item 必須の主文字列 | Label |
| `description?` | `ReactNode` | 補助テキスト、1〜2 行省略 | Description（Label の下） |
| `leading?` | `ReactNode` | アイコン / カラーチップ / アバター | Leading Slot |
| `trailing?` | `ReactNode` | ショートカット・件数・補助アイコン | Trailing Slot |
| `selectionIndicator?` | `ReactNode` | 選択済み表示 | 単一選択=Trailing 側、複数選択=Leading 側 |
| `multiple?` | `boolean`（既定 `false`） | Selection Indicator の位置切替のみに使用 | — |
| `className?` | `string` | 消費側から state 駆動クラスを注入する差し込み口 | Row Container |

state → token class 対応（消費側が Item の `className` に渡す文字列。
`OptionRow` 自体はこれを持たない — Row Container の外側は Item 要素なので）:

| Base UI state (data 属性) | 共有すべきか | token class（案） | 備考 |
|---|---|---|---|
| `data-highlighted` | 共有（Search・Select 双方が使う） | `data-[highlighted]:bg-surface-container` | 現行 Search.tsx と同じ値を流用可能 |
| `data-disabled` | 共有 | `data-[disabled]:text-on-disabled data-[disabled]:cursor-not-allowed` | 現行 Search.tsx には未実装（サジェストは disabled 項目を想定していない）→ 導入時に追加 |
| `data-selected` | **Select のみ**（Search は意味を持たない。Step 1-2 参照） | `data-[selected]:bg-...(強めのトークン) data-[selected]:font-medium` + Selection Indicator 表示 | Search 側は付与しても無害だが、Search の現行仕様では data-selected が立たない運用（`selectionMode` 次第）なので当面不要 |

Row Container 自体の共通クラス（padding / typography / cursor など）は
現行 Search.tsx の
`"flex items-center px-padding-lg py-padding-sm cursor-default select-none typography-tight-body-medium text-on-surface"`
をベースに `OptionRow` 側の固定クラスとして引き取れる
（Select.md Layout And Density「Item の最小高さは Trigger Medium と整合」は
別途 size prop が必要になるため、これは Open Question として Step 3-5 に残す）。

### 3-3. 既存 Search.tsx の改修差分の見積もり

- 変更対象は `Autocomplete.List` の render 関数の中身（現行 `Search.tsx`
  289〜301 行目）のみ。
- 見積もり: **改修行数はおよそ 10〜15 行**（`Autocomplete.Item` の
  `className` を `OptionRow` 呼び出しへ差し替え、`children` を
  `<OptionRow label={item} />` に置換）。`Autocomplete.Root` /
  `Autocomplete.Popup` 等、Item 以外のパーツ・public props (`SearchProps`) は
  無変更。
- テストへの影響: `Search.test.tsx`（220 行）を確認した限り className や
  data 属性を直接アサートする箇所は無く、挙動・アクセシビリティ中心
  （プロジェクトの既定方針 [feedback_testing_classname] と一致）。よって
  この改修だけでは既存テストの破壊は想定しにくい。ただし disabled 候補や
  description 付き候補など `OptionRow` が新たに扱う anatomy は Search 側の
  現行 `items?: readonly string[]` という単純な文字列配列 API では表現できず、
  それらを Search に持ち込むかどうかは別途 API 拡張の判断が要る
  （このスパイクの範囲外、Step 4 に送る）。

### 3-4. Search.md / Select.md の Open Questions 書き換え文面案

適用は行わない（`/orca-component-design-doc` skill を使う後続作業）。以下は
そのまま差し替えに使える文面案。

**Search.md**（現行 149〜151 行相当の置き換え案）:

> - **Suggestion Surface のデザイン**（Search 本体に内蔵するか、Combobox 等の
>   別コンポーネントに委ねるか）は Base UI Autocomplete（Combobox パーツ群）へ
>   の委譲で解決済み（`packages/react/src/Search/Search.notes.md` 参照）。
>   Surface 内の Item / Option は Select の Item / Option 仕様を意味の正とし、
>   React 実装では非公開の共有視覚モジュール（`packages/react/src/internal/`）
>   を Search・Select の双方が利用する（`plans/spike-notes/010-option-primitive-design.md`
>   で確定）。Surface 自体の境界連続性・影・最大高さは引き続き未定。

**Select.md**（現行 215 行相当の置き換え案）:

> - Item / Option の実装上の所属は、Select・Search いずれのパッケージにも
>   属さない非公開の共有視覚モジュール（`packages/react/src/internal/`）とする。
>   Select は `Select.Item`、Search は `Autocomplete.Item`（Base UI Combobox
>   由来）にそれぞれこのモジュールを被せ、Base UI 側の状態実装は独立のまま
>   視覚のみ共有する（判断根拠: `plans/spike-notes/010-option-primitive-design.md`）。

### 3-5. Surface の決定は含めない — 残る Open Question

Suggestion Surface（Container との境界連続性・影・最大表示行数・スクロール
挙動）の仕様は本スパイクのスコープ外。Search.md の Open Questions・
Select.md の Open Questions のうち、Surface 自体に関する項目
（境界連続性・影・最大高さ・Group Header/Separator/Footer Action の要否）は
**未解決のまま残す**。

---

## Step 4: 未解決事項と次アクション

### デザイナー確認が要る点（視覚仕様）

- Item の Disabled 表現（Search は現行未対応。Figma の `Select/Menu/MenuItem`
  component_set の State 軸には `Disabled` があるため、デザイナー確認の上で
  Search 側にも disabled 候補の概念を持ち込むかを判断する必要がある）。
- Suggestion Surface 自体の境界連続性・影・最大表示行数（Step 3-5 で
  据え置き。Select.md / Search.md 双方の既存 Open Questions のまま）。
- `Select/Menu/MenuItem`（node `1688:26347`）の実測値（padding、行高、
  Leading/Trailing アイコンの実サイズ）が design-language の記述
  （「Item の最小高さは Trigger Medium と整合」等）と整合するかどうかの
  Figma 実測（本スパイクでは `get_design_context` まで踏み込んでいない —
  プラン上「任意」とされていたため未実施）。

### 実装判断で閉じられる点

- Option モジュールの配置場所・非公開の扱い（本メモ Step 3-1 で確定案あり。
  設計判断で閉じられ、デザイナー確認は不要）。
- `data-selected` を Search 側で使わない・`data-highlighted`/`data-disabled`
  のみ共有する、という状態インターフェースの絞り込み（Step 1-2 / 3-2 の
  実装事実に基づく判断で閉じられる）。
- Search の `items?: readonly string[]` という現行 API を、Description /
  Leading / Trailing を持つ複合 Item に対応させて拡張するかどうかは
  Select 実装後の別プランで判断すればよい（このスパイクでは「共有モジュールの
  形」だけを決め、Search の公開 API 拡張そのものは対象外とする）。

### 次アクション

1. design-language 原典の更新: `/orca-component-design-doc` skill を使い、
   Step 3-4 の文面案を Search.md / Select.md の Open Questions に適用する
   （このメモは入力であり、適用はしない）。
2. Select 実装プランへの引き継ぎ事項:
   - Select 実装の最初のタスクとして `packages/react/src/internal/option/`
     を新設し、`OptionRow`（Step 3-2 のスケッチ）を実装してから
     `Select.Item` に被せる。
   - 同じタイミングで Search.tsx を軽微改修し（Step 3-3 の見積もり）、
     `Autocomplete.Item` にも同じ `OptionRow` を被せて実装を一本化する
     （Search 単体の既存テストは通る想定だが、実施後に必ず再実行して確認する）。
   - Figma `Select/Menu/MenuItem`（node `1688:26347`）を Select.Item の
     実装時の一次資料として使う。`Select`（node `393:268`）・
     `Select/Menu`（node `1688:26547`）も Trigger・Surface Container の
     実装時に参照する。
   - Sidebar 再整合で確立した「Figma published component に定義があるものだけ
     実装する」方針に照らすと、`Select/Menu/MenuItem` の State 軸
     （Enabled/Hover/Focused/Active/Disabled）はそのまま Item の状態語彙の
     一次情報として使える。ただし「チェックボックス風装飾」は不採用
     （2026-07-07 ユーザー裁定）なので、Selection Indicator の具体形状は
     別途デザイナー確認が要る。
