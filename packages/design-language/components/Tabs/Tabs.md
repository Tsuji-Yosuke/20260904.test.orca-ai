---
name: Tabs
status: ready
layer: component
description: TabList / Tab / TabPanel からなるタブ（Base UI Tabs ベース）。
sources:
  figma:
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=1722-18846&m=dev
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=1161-3903
  implementations: []
  storybook: []
---

# Tabs

## Guide

### Purpose

- 同じ文脈に属する複数のビューを同一領域に並べ、一度に一つだけを表示するためのナビゲーション部品。
- 「いまどの面を見ているか」を一目で把握でき、面同士を低コストで切り替えられることを保証する。
- ページ遷移そのものや、相互排他でない並列情報の同時表示は責務外。

### Usage

**Use when**

- 同一オブジェクトに対する複数の側面（概要 / 詳細 / 履歴 など）を切り替える。
- 2〜6 程度の安定した固定セットで、同時に見比べる必要がないとき。
- 切り替えのたびにスクロール位置やフォームを失うべきでない並列ビュー。

**Do not use when**

- 項目が動的に増減する、または項目数が多くて見出しが折り返すケース。Dropdown や List ナビを使う。
- 階層ナビゲーションの代替。Breadcrumb / SideNav を使う。
- ステップに順序があり前後関係を強調したい場合。Stepper を使う。
- 1 項目しかない場合。

### User Mental Model

- 「水平に並んだラベル群のうち、いま強調されているものが現在の面である」と認知する。
- ラベル選択 = 即座のビュー切替であり、フォーム送信や遷移確定の意味は持たない。
- 並び順は意味的安定性を持ち、再訪時にも同じ位置にあることを期待される。

### Anatomy

- **Tab List**（必須）— Tab を水平に並べるコンテナ。幅戦略として Spread / Fit の 2 つを持つ（Layout And Density 参照）。
- **Tab**（必須、2 以上）— ラベルを持つ選択可能な見出し。任意で先頭アイコン、末尾バッジ（カウントや状態）を持てる。
- **Selection Indicator**（必須）— 現在選択中の Tab を視覚的に示すマーカー。Tab List に対して 1 つだけ存在する。
- **Tab Panel**（必須）— 選択中の Tab に対応する内容領域。常に 1 つだけ表示される。
- Tab List 内に CTA や非タブ要素を混在させない。区切り線 / 余白 / 追加アクション領域は持たない。

### Content Model

- ラベルは短い名詞句または名詞。命令形・句点は避ける。
- 末尾バッジには件数や未読インジケータなど補助情報を載せる。装飾目的のバッジは置かない。
- ラベルが収まらないときは省略・折り返しせず、横スクロールまたはオーバーフロー処理に委ねる。
- 空状態（Tab が 1 件以下）には Tabs を表示しない。
- ローカライズで長くなる前提を持つ（英語の 1.5〜2 倍）。

### Layout And Density

- Tab List は水平配置を基本とする。縦並びは別コンポーネント扱い（Open Questions 参照）。
- Tab List の幅戦略:
  - **Spread** — 与えられた幅を Tab 数で均等に分配する。固定数・短ラベルでの利用に適する。
  - **Fit** — Tab はラベル幅に応じて縮み、Tab List 全体は内容幅に揃う。可変数・長ラベルや左寄せ配置に適する。
- 全 Tab が収まらない場合（Fit）は横スクロールでオーバーフローさせ、選択中 Tab が可視範囲外に出たら自動でスクロールインする。Spread は項目数が固定で収まる前提で使う。
- Tab List の左右端は周囲のコンテナ余白に揃え、Selection Indicator が端で欠けないようにする。



### Accessibility Notes

- **WAI-ARIA Tabs Pattern に準拠**。**手動活性化**を既定とする（理由は Interaction Model 参照）。
- Tab List 自体のアクセシブルネームを付与する手段を提供する（ページ内に複数 Tabs があるケースを想定）。
- 無効 Tab の扱い（矢印キーで飛ばすかフォーカスは到達させるか）は Open Questions。

## Spec

### Interaction Model

- 非活性 Tab の選択はブロックする。Tooltip 等で理由が伝えられることが望ましい。
- **手動活性化**を既定とする（フォーカス移動だけでは Panel を切り替えず、Enter / Space で確定する）。理由はパネル切替に伴う支援技術への過剰アナウンスを避けるため。

### State Model

- 選択を表す `selected` を 5 state 共通語彙に加える。`selected` は同時に 1 つだけ存在する。
- `selected` と `disabled` は同時に成立しない（既定の選択 Tab が無効化されたら別の有効 Tab に選択を移す）。
- `selected` と `hover` / `focused` は重畳しうるが、`selected` のシグナルが優先順位として上位に立つ。
- Tab List 自体に「全体無効」状態を持ちうる（読み込み中等）。その間は Tab List 内のすべての Tab を操作不可とする。

### Visual Semantics

- 選択中 Tab の「いまここ」のシグナルは Selection Indicator（下線、2px、強調色）のみが担う。文字の太さ・色は選択の有無で変えない（全 state で太字・同一の文字色）。
- 非選択 Tab も含め、Tab は常に下線（1px、控えめな色）を持つ。これは Tab List 全体の下辺と連続する境界線であり、選択中はその一部が太い Selection Indicator に置き換わる形になる。
- hover 時は背景がわずかに変化し、操作可能であることを示す。文字や下線は変えない。
- disabled でも下線自体は消えない。色を薄くして操作不可であることを示す。
- 区切り線は Tab List 全体の下辺としてのみ用いてよい。Tab 同士の縦区切りは原則なし。
- 危険・成功などの色シグナルは Tab には載せない。バッジ側で表現する。
- 切替時のモーション（Indicator のスライド等）は任意。

### Variants And Options

- **size**: `small` / `medium`（既定） / `large`。寸法とタイポ階層のみが変わる。情報構造は変えない。
- **layout**: `spread`（既定） / `fit`。Tab List 側の variant。
- **icon / badge**: 各 Tab に独立して付けられるオプション。variant ではない。

### Open Questions

- 無効 Tab を矢印キーでも飛ばすか、フォーカスは到達するが活性化させないか。プロダクトでの一貫した方針が必要。
  （React 実装は Base UI Tabs に委譲し、当面「フォーカスは到達するが活性化させない」+ `aria-disabled` を採用。）
- 横スクロール時のオーバーフローアフォーダンス（フェード / 矢印ボタン）の要否。
- 選択中 Tab が可視範囲外にあるときの自動スクロールインの要否（現状は横スクロールで手動到達できることのみを保証し、自動スクロールインは未実装）。
- 縦並び Tabs を本コンポーネントの variant に含めるか別コンポーネント化するか。
- 実装着手時に `packages/react/src/ui/tabs.notes.md` へ移送: 制御/非制御の両モード、Tab Panel の lazy mount / keep mount 切替、ルーティング連動。

### Acceptance Criteria

- AC-Tabs-01: 2 つ以上の Tab を持つとき、常に正確に 1 つの Tab が `selected` であり、対応する 1 つの Panel のみが可視である。
- AC-Tabs-02: ポインタ・キーボードのいずれの操作でも、選択中 Tab が視覚的に明確に区別される。（検証: Storybook）
- AC-Tabs-03: 手動活性化により、フォーカス移動だけでは Panel が切り替わらず、Enter / Space で確定したときに切り替わる。
- AC-Tabs-04: `layout=spread` では Tab が Tab List 幅を均等に占有し、`layout=fit` では Tab がラベル幅に従う。（検証: Storybook）
- AC-Tabs-05: ラベルが収まらない場合に折り返さず、選択中 Tab が可視範囲外にあっても横スクロールで到達可能である。（検証: Storybook）
- AC-Tabs-06: Tab List 全体無効のとき、Tab List 内のすべての Tab が操作不可となる。
