# Select implementation notes

`packages/design-language/components/Select/Select.md`（status: ready）を React へ写像するメモ。
仕様の正は design-language。実装が安定したら削除してよい。

## 2026-07-14 ユーザー裁定: 発明を全削除

初回実装（2026-07 上旬）は Figma に根拠の無い API（`multiple` / `clearable` / `label` /
`helperText` / Item の `ItemIndicator` チェックマーク）を暫定で持っていたが、Sidebar 再整合と
同じ方針でユーザーが「Figma に無い発明は全削除」と裁定。以下を撤去した。

- `multiple`（複数選択）・`clearable` + `clearLabel`（クリア操作）・`label`（外部ラベル）・
  `helperText`。いずれも Figma `Select`（node 393:268）の全 size×state 実測に対応要素が
  存在しないため（`get_design_context` で確認済み）。Select.md の Open Questions に降格。
- Item の `ItemIndicator`（チェックマーク）+ `font-bold`。Figma `Select/Menu/MenuItem`
  （node 1688:26347）の Active は「行全面の黒塗り＋前景反転」のみで、別インジケータは無い。
- Item / Option の視覚（Row Container・Hover・Focused・Disabled・Active の駆動）は
  `packages/react/src/internal/option-row.tsx` に切り出し、Search と共有（後述）。

`error` / `errorMessage` は維持（Figma の Error 状態に専用の Error Text 行があるため）。
`aria-label` は維持（アクセシブルネームは必須提供）。

## 採用した実装プリミティブ

- **Base UI Select**（`@base-ui-components/react/select`）の上に token スタイル。Listbox の
  WAI-ARIA、キーボード操作、type-ahead、論理フォーカス、Surface 配置（Trigger 幅アンカー、
  上下開き）を Base UI に委譲。[[project_base_ui_allowed]]
- Trigger=role=combobox の button（`BaseSelect.Trigger`）、Surface=Portal/Positioner/Popup/List、
  各 Item=`BaseSelect.Item`。

## Option 視覚の共有（`internal/option-row.tsx`）

`plans/spike-notes/010-option-primitive-design.md`（案A）に基づき、Item/Option の見た目は
`packages/react/src/internal/option-row.tsx` の `optionRowClassName()` / `OptionRowLabel` に
切り出し、Select（`Select.Item`）と Search（`Autocomplete.Item` = `ComboboxItem`）の双方が
使う。`@orca/react` の `index.ts` からは export しない（非公開）。

- `data-highlighted`・`data-disabled` は両実装で完全一致する共通の state（Base UI 実ソースで
  確認済み）。`data-selected` は **Select のみ**が意味を持つ拡張状態（`selectable: true` を
  渡したときだけ黒塗りクラスを注入。Search は opt-in しない）。
- Hover と Focused（キーボードハイライト）は Base UI 側で同じ `data-highlighted` に統合されて
  おり、実装上は区別できない（`SelectItem`/`ComboboxItem` とも `onMouseEnter` がポインタ重畳時に
  同じ highlighted state を更新する）。この制約により state layer の重畳と共有 focus リングを
  まとめて `data-highlighted` に適用している。Figma の Hover（重畳のみ）と Focused（重畳+リング）
  の描き分けは実装では合成表現になる — 既知のギャップとして記録。

## React への写像

- `items: {value,label,disabled?}[]`。Base UI Root に渡し Value のラベル表示にも使う。
- `value` / `defaultValue` / `onValueChange`（単一選択のみ、`string | null`）。
- `size`（small/medium/large, data-size）、`disabled`、`readOnly`、`required`、`name`。
- `error` + `errorMessage`（aria-invalid + aria-describedby、Error Text 行）。
- アクセシブルネームは `aria-label`（必須提供、プレースホルダー単独に依存しない）。
- `aria-readonly` は Base UI の `Select.Trigger` が `readOnly` prop から自動的に付与する
  （`SelectTrigger.js` で確認済み）ため、こちらで重複して手動セットしない。

## Trigger の視覚実装（Figma node 393:268 実測、2026-08-07 再実測）

| State | 背景 | 下線色 | 下線幅 | 前景 | 備考 |
|---|---|---|---|---|---|
| Enabled | `bg-surface`（白） | `border-outline-bright` | `border-b-sm`(1px) | 値 `on-surface` / placeholder・アイコン `on-placeholder-container` | |
| Hover | `bg-surface-container` | `border-primary`（黒） | `border-b-md`(2px) | Enabled と同じ | `:hover` |
| Focused | Hover と同じ | Hover と同じ | Hover と同じ | 同上 | + `shadow-focus-outline` |
| Active | `bg-surface`（白） | `border-outline-bright` | `border-b-sm`(1px) | 同上 | Enabled と同じ見た目。Surface と連続 |
| Disabled | `bg-disabled` | `border-outline` | `border-b-sm`(1px) | `text-on-disabled`（値・アイコンとも継承） | |
| Read only | `bg-surface`（白） | `border-outline` | `border-b-sm`(1px) `border-dashed` | `text-on-surface` | |
| Error | `bg-error-container` | `border-on-error-container` | `border-b-sm`(1px) | `text-on-error-container`（値・アイコンとも継承） | + Error Text 行 |

2026-08-07 再照合の裁定（ユーザー確認済み）で以下を Figma 実測へ揃えた:

- 値・placeholder のウェイトは Small=Regular、Medium/Large=**Bold**
  （`typography-tight-body-{small,medium-bold,large-bold}`。SmallBold は Figma に存在しない）。
- placeholder / 未選択時アイコンの色は `on-placeholder`（#a6a6a6）→ `on-placeholder-container`（#8c8c8c）。
  Figma に Filled/Empty 軸は無く、「Enabled キャンバス＝未選択描画」の placeholder 解釈を採用。
  アイコン前景を値の有無で切り替えるため、uncontrolled でも `useState` で現在値を追跡している。
- `Select.Value` の `text-on-surface` 直書きをやめ、Trigger 側の state 色（error/disabled）を継承させる。
- Trigger 内 gap は `gap-margin-sm`（2px）→ `gap-margin-md`（4px、Figma margin/md）。
- Error Text は size 連動（12/14/16px Regular）・行高 `min-h-component-half-md`（24px）・
  `text-error`・Trigger との gap `gap-margin-md`（4px）。Small/Large も実測済み（1722:16745 / 1722:16760）。

既知の微差（デザイナー確認事項に含める）: Figma のアイコン前景は Hover で `on-surface-dim`
（#1f1f1f）、Read only で `on-surface`（#474747）と state 間で揺れている。実装は
「未選択 `on-placeholder-container` / 選択済み `on-surface-dim`」の 2 値に単純化した。

優先度 Disabled > Read only > Error > Active > Focused/Hover > Enabled は、Disabled/Read
only/Error を JS の相互排他な三項分岐で確定し、その他（Active/Focused/Hover）だけを実際の
`data-popup-open` / `:hover` / `:focus-visible` で駆動することで実現している
（Active は `:hover`/`:focus-visible` 側を `:not([data-popup-open])` で無効化して勝たせる。
Search.tsx の `:hover:not(:focus-within)` パターンを踏襲）。

角丸は一切使わない（`Select.md` Visual Semantics「下線のみ」）。高さは
`min-h-component-full-{sm,md,lg}`（40/48/56px、Figma 実測と一致）。通常時はこの高さちょうどで、テキスト拡大時は内容を切らずに伸びる。

## Menu（Suggestion Surface）と Item（2026-08-07 再実測・裁定反映）

- Surface は `rounded-md border-sm border-outline-bright bg-surface shadow-level-2`。
  内側 padding は持たない（`py-padding-sm` を削除。Figma node 1688:26547 は padding 0 で、
  高さは行の積み上げ、角丸は端の行を切り抜く）。Group Header / Separator / Empty State は無い。
- Item（option-row 共有）は Figma MenuItem 実測へ揃えた: 行高 `min-h-component-full-sm`
  （40px 下限・テキスト拡大時は伸びる）、横 padding `px-padding-md`（16px）、
  `typography-tight-body-small`（12px）、gap `gap-margin-lg`（8px）。
  **Search のサジェスト行にも波及する**が、Figma 上も Search の Suggestion Surface は同じ
  MenuItem コンポーネントのインスタンス（node 1748:16971 内で確認）なので同値。
- Item の Leading / Trailing Icon slot を採用（2026-08-07 裁定、AC-Select-13）。
  `SelectOption.leadingIcon / trailingIcon`（ReactNode）→ `OptionRowIcon`（16px 固定・
  `aria-hidden`・`data-item-icon`）。未指定時はスロット自体を描画しない。
  Search 側の公開 API へは出さない（別スコープ）。

## 一時的な gap（要 Figma 照合 / 設計）

- Trigger の横 padding は Figma が 0 のまま（issue #76、2026-08-07 再実測でも変わらず）。
  Figma には合わせず、size に依らず `px-padding-md`（16px）で統一（ユーザー裁定 2026-08-07。
  それまでの size 連動 12/16/24px も廃止）。
- vite の lib build で `@base-ui-components/react` は external 化（バンドルしない）。
