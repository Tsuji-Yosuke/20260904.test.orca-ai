---
name: Select
status: ready
layer: component
description: 単一選択のセレクト（Base UI Select ベース）。
sources:
  figma:
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=393-268&m=dev
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=1688-26547&m=dev
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=1688-26347&m=dev
  implementations: []
  storybook: []
---

# Select

## Guide

### Purpose

- 列挙可能で有限な選択肢の中から、ユーザーが 1 件を選ぶための入力コンポーネント。
- 「あらかじめ用意された選択肢の中に答えがある」という前提をユーザーに伝え、現在の選択を 1 行のトリガーに集約して表示する責務を負う。
- 候補集合の生成、検索、フェッチ、選択ロジックそのものは責務外。
- 候補行（Item / Option）の見た目（Row Container・Hover・Focused の表現）は、[Search](../Search/Search.md) の Suggestion Surface とも共有する内部プリミティブとして設計する。ただし選択済みを示す黒塗り表現は Select 固有（詳細は Item / Option 節）。

### Usage

**Use when**

- 取りうる値が列挙可能で、UI 上で常時すべて並列表示するほど短くないとき。
- フォームの単項目入力で、選択肢が「設定 / カテゴリ / 状態 / 担当者」のように離散的なとき。
- 自由入力ではなく、選択肢の中に必ず答えがあると保証できるとき。

**Do not use when**

- 取り得る値が 5 件前後以下で常時表示の方が認知しやすいとき（Radio / Segmented / Chips）。
- 自由入力が必要なとき（Search / TextField）。
- 多階層・大量項目の閲覧と選択が主目的のとき（Tree / Table 等）。
- 単一の固定ナビゲーション遷移（Link / Button）。
- 値が真偽 2 値のとき（Switch / Checkbox）。

### User Mental Model

- 「ここを開くと、選べる候補の一覧が出る」「閉じている間は今の選択が読める」という二相のメンタルモデル。
- トリガーは現在値を読む場所、Suggestion Surface は選びに行く場所、という役割分担を期待する。
- 候補を開いている間も、トリガーの位置・幅・現在値の連続性は壊れないと期待する。
- 1 つの項目はラベルのみで完結し、選択されている項目は行全体の強い塗りで一目に分かると期待する。

### Anatomy

Select 全体は **Trigger**（閉時に常時見える本体）と **Suggestion Surface**（開時に展開される候補面）で構成される。Suggestion Surface は **Item / Option** の縦並びのみで構成される。

#### Trigger（必須）

- Container — 単一行の選択トリガー。角丸は持たず、下端の下線（アウトライン）でアフォーダンスを示す。
- Value Display — 現在の選択値を表示する領域。未選択時は Placeholder。
- Toggle Indicator — 開閉状態を示す chevron。Container 末尾に固定。

Trigger 任意:

- Leading Icon — 選択対象の分類（フィルタ等）を示す装飾アイコン。Container 先頭、Value Display の前。
  寸法は Size に追従する（16 / 20 / 24px）。装飾でありアクセシブルネームに寄与しない。
  （Figma component set に正式スロットとして存在。issue #46 の裁定で採用）

Trigger 追加（Error 状態のみ）:

- Error Text — Error 状態のときだけ Container 直下に現れる 1 行の補助テキスト。他の状態には存在しない。

Trigger 禁止:

- Container 内に複数の Value Display を置かない。
- Container 内に独立した送信ボタンを置かない。開閉は Container 全体で受ける。
- Container を角丸・全周囲み枠として描画しない（下線のみが正）。

#### Suggestion Surface（開時のみ存在）

- Surface Container — Trigger 直下に連結して知覚される従属サーフェス。角丸・輪郭・影を持つ。
- Item List — Item / Option を縦に並べただけの集合。Group Header・Separator・Empty State・Footer Action は持たない。

#### Item / Option（独立 anatomy 単位・視覚を共有対象）

Item は Select の Suggestion Surface 内でのみ選択対象として機能するが、行の見た目（Row Container・Hover・Focused の表現）は Search の Suggestion Surface とも共有する。

Item 必須:

- Row Container — 1 行のヒット領域。
- Label — 項目の主内容。1 行省略を基本とする。

Item 任意:

- Leading Icon / Trailing Icon — Label の前後に置ける装飾アイコンスロット。
  Figma `Select/Menu/MenuItem` の正式スロットとして存在し、2026-08-07 の再照合裁定で採用。
  寸法は行の Size に依らず固定（16px 相当）。装飾でありアクセシブルネームに寄与しない。
  指定しなければスロット自体を描画しない（Figma の破線四角はプレースホルダーであり実描画しない）。
  Trailing の意味付け（純装飾か状態表示か）は Figma に確定根拠が無い（Open Questions 参照）。

Item 禁止:

- 説明文・メタ情報・選択チェックマーク等、Label とアイコンスロット以外の内容を行に足さない。
- 1 行に複数の独立アクションを並置しない（行の主機能は「この項目を選ぶ」一点）。

### Content Model

#### Trigger

- Placeholder は「何を選ぶか」を一言で示す（例: 「担当者を選択」）。装飾文に流さない。
- 現在値が長い場合は 1 行で省略する。Trigger は折り返さない。
- Error Text は 1 行で省略を許す。

#### Item

- Label を主内容として持つ。1 行省略を基本とする。
- Leading / Trailing Icon は装飾スロットであり、Label の代わりに内容上の意味を運ばせない。
- 国際化: Placeholder、Error Text、Item の Label は翻訳対象。

### Layout And Density

Popover / Listbox の標準的な配置挙動（Trigger 幅へのアンカー、下方向に開けないときの上方向開きなど）に準拠。orca 固有の追加判断のみ記述する。

#### Trigger

- 高さは Size ごとの 3 段階（Small 40px / Medium 48px / Large 56px。共通コンポーネント高スケールに一致）。
  この値を下限の高さとして内容を垂直中央に置き、通常時はこの高さちょうどになる。利用者の環境で
  テキストが拡大された場合は内容を切らずに伸びる。1 行固定で複数行に拡張しない。
- Toggle Indicator と Leading Icon の寸法は Size に追従する（16 / 20 / 24px）。
- 横幅は親に追従する流動幅を既定。固定幅は呼び出し側の判断。
- Error Text は高さ 24px 相当の 1 行で、文字サイズは Size に追従する（12 / 14 / 16px・標準ウェイト）。
  Container との間隔は 4px 相当の固定 gap（Figma 実測 2026-08-07）。
- Container の左右 padding は Size に依らず一定（padding/md 相当 16px。2026-08-07 の裁定）。
  Figma component set の padding 0 は作画漏れ疑いで確認中のため、Figma には合わせない（Open Questions 参照）。

#### Suggestion Surface

- Surface は内側 padding を持たない。高さは Item の積み上げだけで決まり、角丸は端の行を切り抜いて表現する
  （Figma 実測・裁定 2026-08-07）。
- 最大表示行数は固定数ではなく視口とパディングに応じて算出し、超過分はスクロール。

#### Item / Option

- Item の縦寸法は Trigger の Size に追従せず、共通コンポーネント高スケールの最小段（40px）を下限高として
  固定する（Figma の MenuItem に Size 軸は無い。2026-08-07 の裁定で height token + 下限高の写像に確定）。
  テキスト拡大時は内容を切らずに伸びる。
- Search の Suggestion Item として再利用される場合も同じ縦寸法を踏襲する（Figma 上も同一コンポーネント）。

### Accessibility Notes

**WAI-ARIA Listbox Pattern** に準拠。標準 ARIA 属性付与・キーボード操作・論理フォーカス管理は実装プリミティブで担保する。orca 固有の追加ケアのみ記述する。

- Read only は `aria-readonly`、Error は `aria-invalid` + `aria-describedby`（Error Text と関連付け）で通知する。
- フォーム統合（`required` / `name` などのネイティブ意味論）は実装プリミティブに委ねる。

## Spec

### Interaction Model

Listbox の標準キー操作・focus 管理に準拠。orca 固有の追加判断のみ記述する。

#### Trigger

- Esc は Suggestion Surface が開いていれば閉じる。開いていなければフォーカスを抜ける。Esc で閉じても選択値は破棄しない。
- 確定（Item 選択）で Suggestion Surface を閉じる。

#### Item / Option

- 確定直後の押し下げフィードバックは持たない（確定が一瞬で行われるため）。

### State Model

Trigger と Item はそれぞれ固有の state セットを持つ（Figma で確定済み）。

#### Trigger の 7 状態

- Enabled — 既定。
- Hover — ポインタ重畳。
- Focused — キーボード / クリックでフォーカスが当たっている。共有 focus リングを伴う。
- Active — Suggestion Surface が開いている。Trigger は Suggestion Surface と連結した 1 つのサーフェスとして描画される。
  （Figma component set での variant 名は "Selected"。Item の Active（選択済み）とは別概念なので、原典では Active と呼ぶ）
- Disabled — 非活性。操作を受け付けない。
- Read only — 値は読めるが開閉・選択操作を受け付けない。Disabled とは異なる中間表現（下線が破線になる）。
- Error — バリデーションに反する。値は破棄しない。Container 直下に Error Text が現れる。

優先度: **Disabled > Read only > Error > Active > Focused > Hover > Enabled**。

Filled / Empty は state ではなく「値の有無」軸。Placeholder と Value Display の表示はこの軸で切り替わる。

#### Item / Option の 5 状態

- Enabled — 既定。
- Hover — ポインタ重畳。
- Focused — キーボードフォーカス。共有 focus リングを伴う。
- Active — その行が現在選択中。行全面の塗り＋前景反転で示す（Item / Option 節の Visual Semantics 参照）。
- Disabled — 選べない。背景は変えず、文字色のみ弱める。

優先度: Disabled > Active > Focused > Hover > Enabled。Active と Focused は共存しうる（選択済みの行に論理フォーカスがある状況）。

### Visual Semantics

#### Trigger

- 全 state 共通で「下線のみ」がアフォーダンスを担う。角丸・全周囲み枠は使わない。
- 値・Placeholder の文字サイズは Size に追従する。ウェイトは Small が標準、Medium / Large は太字
  （Figma 実測 2026-08-07。太字の意図はデザイナー確認中だが、Figma を正として写像する）。
- 未選択時の Placeholder と Leading Icon は placeholder 系の弱い前景色で、選択済みの値より一段弱く読める。
- Enabled は細い下線（弱い中立色）と白背景で、最も控えめな状態として読める。
- Hover は下線が太く強い前景アクセント色に変わり、背景がわずかに沈んだ色調に変わる。Focused と同じ強さの下線色を先取りする形で「押せそう」を伝える。
- Focused は Hover と同じ背景・下線の強さに加え、Container 全体を囲む共有 focus リングが足される。
- Active（Suggestion Surface が開いている）は下線ではなく白背景＋弱い輪郭のプレーンなサーフェスとして描画され、直下の Suggestion Surface と視覚的に連続する。
- Disabled は下線が細いまま最も弱い中立色になり、背景全体がフラットな無効色で塗られる。文字も弱色になる。
- Read only は下線が破線になる。背景は Enabled と同じ白のままで、「読めるが触れない」を Disabled と区別する。
- Error は背景がエラー系の塗りに変わり、下線が強いエラー色になる。値・Leading Icon・Toggle Indicator の
  前景も同じエラー色に切り替わる。Container 直下に同じエラー色の Error Text が現れる。
- Toggle Indicator（chevron）は前景の弱色で描かれ、Active で 180° 反転する。

#### Item / Option

- Enabled は白背景、標準の前景色テキスト。
- Leading / Trailing Icon の前景は Label の前景色に追従する（Active では反転、Disabled では弱色）。
- Hover は白背景に半透明の重畳レイヤーが乗る（背景色を差し替えるのではなく重ねる）。
- Focused は白背景＋共有 focus リング。
- Active（選択済み）は行全面が強いブランド前景色（黒系）で塗られ、文字は反転前景色（白）になる。チェックマーク等の別インジケータは伴わない。
- Disabled は背景を変えず、文字色のみ弱色にする。

### Variants And Options

- Size: Small / Medium / Large。Figma の Size 軸に対応し、高さが 3 段階で固定される。意味は「埋め込み密度 / 標準 / 主役」で、機能差は持たない。
- Read state: Editable / Read only / Disabled。Read only は「触れないが読める」、Disabled は「触れないし非活性に見える」。
- Validation: Default / Error。
- Item / Option の視覚共有範囲: Hover / Focused の見た目は Search の Suggestion Surface と共有する。Active（選択済みの黒塗り）は Select 固有で、Search には無い概念（Search は候補確定後にサーフェスを閉じるため、永続的な選択済み表現を持たない）。

機能差を持たない見た目差は variant ではなく theme / surface 側の表現に倣う。

### Open Questions

以下は Figma に確定した根拠が無いため、実装（`@orca/react`）に先立ってデザイナーとの合意が必要。合意が取れるまでは実装 API に含めない。

- 複数選択（multiple）を将来サポートするか。サポートする場合の Value Display・Item の視覚表現。
- 選択値をクリアする操作（Clear Affordance）を持つかどうか。持つ場合の Trigger 内配置。
- Item / Option に選択済みを示すチェックマーク等の別インジケータを追加するか（現行 Figma は塗りのみ）。
- Item に説明文（Description）やメタ情報を持たせるか。
- Loading（候補フェッチ中）状態を持つか。持つ場合の Trigger / Suggestion Surface 上の表現。
- Suggestion Surface に Group Header / Separator / Empty State / Footer Action を持たせるか。
- Item の Trailing Icon slot の意味付け（純装飾か、状態・種別の表示か）。slot 自体は 2026-08-07 の
  裁定で採用済みだが、Figma のプレースホルダーに入る実グリフと用途が未確定。
- Trigger の値テキストが Medium / Large で太字になる意図の確認（Figma 実測では全 state 一貫して太字、
  Small のみ標準ウェイト。実装は Figma を正として写像済み）。
- Trigger の横 padding の正。component set は padding 0（gap 4px のみ）で作られているが作画漏れの疑いがあり、
  デザイナー確認中（issue #76。2026-08-07 再実測でも padding 0 のまま）。確認が済むまで実装は Figma に
  合わせず、Size に依らず padding/md（16px）で統一する（2026-08-07 裁定）。
- type-ahead を MVP で必須とするかどうか。
- Suggestion Surface の最大表示行数の決定ロジック（固定行数 / 視口高さに対する割合 / コンテンツ依存）。

### Acceptance Criteria

- AC-Select-01: Figma で確認された Trigger の 7 状態語彙（Enabled / Hover / Focused / Active / Disabled / Error / Read only）が、下線の太さ・色・背景の組み合わせとしてそれぞれ視覚的に区別できる。（検証: Storybook）
- AC-Select-02: Trigger の Size（Small / Medium / Large）が高さの 3 段階（通常時 40px / 48px / 56px）として区別できる。（検証: Storybook）
- AC-Select-03: Trigger は閉時に現在の選択値を 1 行で示し、値が無いときは Placeholder を示す。
- AC-Select-04: Suggestion Surface は Trigger 幅にアンカーされ、開いている間は角丸・輪郭・影を持つ独立したサーフェスとして Trigger 直下に連続して読める。（検証: Storybook）
- AC-Select-05: Read only は `aria-readonly`、Error は `aria-invalid` で支援技術に通知され、いずれも値を破棄しない。
- AC-Select-06: Error 状態では Trigger 直下に Error Text 行が現れ、背景・下線に加えて値・アイコンの前景もエラー色に切り替わる。（検証: Storybook）
- AC-Select-07: Item の 5 状態語彙（Enabled / Hover / Focused / Active / Disabled）が、それぞれ視覚的に区別できる。（検証: Storybook）
- AC-Select-08: Item の Active（選択済み）は行全面の塗り＋前景反転で示し、チェックマーク等の別インジケータは伴わない。（検証: Storybook）
- AC-Select-09: 確定操作（Item 選択）で Suggestion Surface が閉じる。
- AC-Select-10: キーボードのみで開閉・候補選択・確定・Esc によるキャンセルが完結する。
- AC-Select-11: Item / Option の Hover / Focused の視覚は Search の Suggestion Surface と共通の見た目を用いる。Active の塗りは Select 専用とする。
- AC-Select-12: Trigger は任意の Leading Icon を Value Display の前に表示できる。指定しても Trigger の高さ・下線・値表示は変わらず、アイコンはアクセシブルネームに寄与しない。
- AC-Select-13: Item は任意の Leading / Trailing Icon を Label の前後に表示できる。指定しても行の選択挙動とアクセシブルネームは変わらず、未指定のときはスロット自体を描画しない。
