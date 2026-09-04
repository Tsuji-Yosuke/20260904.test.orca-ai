---
name: Search
status: ready
layer: component
description: サジェスト付き検索入力（Base UI Autocomplete ベース）。
sources:
  figma:
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=1748-16686&m=dev
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=1748-16971&m=dev
  implementations: []
  storybook: []
---

# Search

## Guide

### Purpose

- ユーザーが自由入力したキーワードで対象集合を絞り込むための入力コンポーネント。
- 「探したい対象がある」というユーザー意図を、最短のキーストロークで結果集合へ橋渡しする責務を負う。
- 結果一覧の描画、ページング、空状態の表現、検索ロジックそのものは責務外。
- 単なるテキスト入力（自由記述、フォームのフィールド）の代替ではない。

### Usage

**Use when**

- 一覧 / コレクション / ナビゲーション内の絞り込みが、ユーザーの主目的になり得る画面。
- 画面ヘッダーやサイドバー上部に常設され、即時または送信式で結果を絞る用途。
- 候補語サジェスト・最近の検索・型付き補完など、入力を補助する余地があるとき。

**Do not use when**

- 取り得る値があらかじめ列挙可能で短いとき（Select / Filter chips を使う）。
- 自由記述の本文・コメント・備考（TextField / TextArea を使う）。
- 数値や日付のレンジ指定（専用入力を使う）。
- 単一の固定的なナビゲーション遷移（Link / Button を使う）。

### User Mental Model

- 「ここに語を入れれば、見えている範囲が絞られる / 候補が出る」という即時の応答性を期待する。
- 虫眼鏡アイコンは検索という機能アフォーダンスのアンカーであり、ラベルが省略されてもユーザーは検索だと認識する。
- クリア操作はいつでも安全に取り消せると期待する（破壊的でない）。
- Enter は「確定 / 送信」、入力中の状態は「絞り込み中」と読み取られる。
- フォーカス中（Active）に入力すると候補一覧がコンポーネント直下に展開され、その間も入力欄は連続して扱える、と期待する。

### Anatomy

必須:

- Container — 単一行の入力コンテナ。
- Leading Indicator — 検索を示すアイコン（虫眼鏡）。Container の先頭、入力テキストと視覚的に分離。
- Input — 自由入力テキスト領域。プレースホルダーまたは外部ラベルで意図を伝える。

任意:

- Clear Affordance — 値があるときだけ現れる、入力をクリアする副次トリガー。
- Trailing Hint — キーボードショートカット表示（例: ⌘K）や状態アイコン（loading 等）。サジェストを伴わない常設検索でのみ用いる。
- Suggestion Surface — 入力中・フォーカス中（Active）に展開される候補集合。Container と一体として知覚される従属サーフェス。中の Item は [Select](../Select/Select.md) の Item / Option プリミティブを再利用する。
- Empty Hint — 入力が空のときに表示される手引き（最近の検索 / 推奨検索）。

順序（左→右）: Leading Indicator → Input → Clear Affordance → Trailing Hint。Suggestion Surface は Container の直下に展開。

禁止:

- Container の中に主要トリガー（送信ボタン）を埋め込まない。送信は Enter とアイコン押下に委ねる。
- 同じ Container 内に複数の入力を置かない。

### Content Model

- プレースホルダーは検索対象を一言で示す（例: 「タスクを検索」）。装飾的な文言にしない。
- 外部ラベルが必要な場面では Container の直上に置き、プレースホルダーで重複させない。
- 入力値は折返し不可・1 行。横スクロールには逃がさない。
- サジェスト項目はラベル必須、補助テキスト・カテゴリ・アイコンは任意（Select の Item / Option 仕様に従う）。
- 国際化: プレースホルダー、aria 用ラベル、クリア操作、サジェストのカテゴリ見出しは翻訳対象。

### Layout And Density

Popover / Combobox の標準的な配置挙動（Container 幅へのアンカー、下方向に開けないときの上方向開きなど）に準拠。orca 固有の追加判断のみ記述する。

- 1 行固定。複数行入力には絶対に拡張しない。
- 高さは Size ごとの 3 段階（Small 40px / Medium 48px / Large 56px。共通コンポーネント高スケールに一致）。縦 padding の積み上げで高さを作らず、この値を下限の高さとして内容を垂直中央に置く。通常時はこの高さちょうどになり、利用者の環境でテキストが拡大された場合は内容を切らずに伸びる。
- 横 padding と内部要素の間隔は全 Size 共通で 8px。
- Leading Indicator の寸法は Size に追従する（16 / 20 / 24px）。
- 最小タッチターゲットの逸脱: Small は 40px を下限とする（Foundations の 44px から逸脱。マウス前提面用途に限定）。Medium 以上では 44px 相当を確保。
- 横幅は親に追従する流動幅を既定。固定幅は呼び出し側の判断。
- Search 自身は外側の余白を持たない。

### Accessibility Notes

- Input は `searchbox` ロール（HTML 標準）。
- サジェストを伴う場合は **WAI-ARIA Combobox Pattern (List Autocomplete with Manual Selection)** に準拠。標準 ARIA 属性付与・キーボード操作・論理フォーカス管理は実装プリミティブで担保する。
- orca 固有の追加ケア:
  - focus-visible リングを Input 個別ではなく **Container 単位**で提示する（視覚と支援技術上のフォーカス扱いが矛盾しないようにする）。
  - Clear はアクセシブルネームを持つトリガーとして公開する（例: 「検索語をクリア」）。
  - Error は `aria-invalid` + `aria-describedby`、Loading は `aria-busy` で通知する。
  - アクセシブルネームは Placeholder 単独に依存しない。

## Spec

### Interaction Model

Combobox の標準キー操作・focus 管理に準拠。orca 固有の追加判断のみ記述する。

- Container 上の任意位置クリックで Input にフォーカスが移る（Container 単位のヒット領域）。
- Clear はクリックで値を即時に空にし、フォーカスは Input に残す。
- **Esc の優先度（orca 固有）**: (a) サジェストが開いていればサジェストを閉じる、(b) 値があればクリア、(c) フォーカスを抜ける。
- **Enter の挙動切替**: 通常は確定 / 送信。サジェストが開いている時は「ハイライト中のサジェスト選択」に切り替わる。
- focus-visible リングは Input そのものではなく **Container 単位**で提示する。
- Activation Timing: 即時絞り込み（type-to-filter）型と送信型のいずれを採るかは利用文脈で決まる。デフォルトは即時。
- Cancellation: Esc / Clear / フォーカスアウトいずれでもユーザーの直前状態を破壊しない。
- Loading インジケータは Trailing Hint 位置に出してよい。

### State Model

Foundations の 5 state に加え、Search 固有の追加状態を持つ。

- Active — フォーカス + Suggestion Surface が展開されている状態。Focused を内包する。Figma の Doc 上では他状態の 2 倍以上の縦尺で表現される（サジェスト常設想定）。
- Error — クエリが受理されない / バリデーションに反する。輪郭・補助テキストで通知。値は破壊しない。
- Filled は state ではなく「値の有無」軸（独立軸）。Enabled / Hover / Focused / Active のいずれとも共存する。
- Loading（非同期サジェスト・絞込待ち）は Focused / Active と共存しうる派生状態。
- Readonly は独立 variant とせず、当面 Disabled の派生として扱う。

優先度（共通語彙からの逸脱）: **Disabled > Error > Active > Focused > Hover > Enabled**（Error の位置が Select と異なる）。

### Visual Semantics

- 境界・背景は「入力可能領域」のアフォーダンスを担う。輪郭型（border + 白背景）が基準、塗り型は theme / surface 都合の派生。
- 基準となる境界表現は「枠」ではなく**下線**である。Container 自体の角丸は上 2 辺のみの小さい丸みにとどめ、視覚的な重心を下線に置く（Tabs と同系統の意匠）。
- Leading Indicator は装飾ではなく「検索機能」の記号。色は前景テキストに準ずる。
- Enabled では下線は明るいグレーの細線、背景は白。この状態が既定の見え方である。
- Hover では背景がわずかに濃いグレーに変わり、**同時に**下線が黒・太線に変わる（背景と下線の 2 要素が連動して変化する）。
- Focused は Enabled と同じ背景・下線を保ったまま、Container の外側に赤いフォーカスリングが追加される（下線そのものは変化しない）。
- Active（サジェスト展開）状態では下線が黒・太線になり、Container と Suggestion Surface が連続した 1 つのサーフェスに見えることを優先する（境界線の連続、影の付け方など）。角丸は Suggestion Surface との連続性を優先し、Container 側に丸みを持たせない。
- Loading は微弱なモーション（スピナー）で示し、Container 全体を点滅させない。
- Error は下線が太線に変わり、かつ専用の警告色になる。加えて入力領域の末尾に Clear とは別のエラー専用アイコンが現れ、補助テキストが Container 直下に表示される。入力済みの値は破壊しない。
- Disabled は背景・下線ともに専用の無効化トークンに切り替わり、他の state の背景 / 下線トークンとは共有しない。
- Selection / hover はサジェスト項目側のみで表現し、Container は変えない。

### Variants And Options

- Size: Small / Medium / Large。Figma の Size 軸に対応。意味は「埋め込み密度 / 標準 / 主役」で、機能差は持たない。
- Submission mode: 即時絞り込み / 送信式。意味の違いは「結果が連続的に変わるか、明示的にクエリを発行するか」。Figma 上では区別されておらず、製品文脈で決める。
- Suggestion behavior: なし / 静的（最近の検索）/ 動的（型付きサジェスト）。Figma の Active 状態は「サジェストあり」前提のレイアウト想定を示すが、サジェスト無し運用も同じ Search で許容する。
- Surface integration: 単独（ページの中央 / ヘッダー）、埋め込み（サイドバー / ツールバー）、コマンドパレット呼び出し用トリガー。意味の違いは到達経路と常設性。

機能差を持たない見た目差は variant ではなく theme / surface 側の表現に倣う。

### Open Questions

component set（node-id=1748-16971）には Size × State のマトリクスが実データで定義済み
（固定高 40/48/56px は 2026-07-28 実測。issue #46 の裁定で実装が追随する）。
以下は component set からも確定できず、デザイナーとの合意が必要。

実装（`@orca/react`）では下記を**暫定の既定**として採用済み（デザイナー確認後に上書きしうる。詳細は `packages/react/src/ui/search.notes.md`）:
Leading = 虫眼鏡 / Trailing = loading スピナー位置兼用・⌘K は任意スロット / Suggestion Surface = Base UI Combobox(Autocomplete) に委譲 / Container = 輪郭型 / Submission = 即時絞り込み（Enter で onSubmit も発火）/ landmark `role="search"` は呼び出し側責務 / Error 条件は呼び出し側（`error` prop で受ける）。

- Leading Indicator のアイコン種別（虫眼鏡で確定か、別アイコンがあり得るか）。
- Trailing 領域の用途（ショートカット表示 ⌘K の常設可否、loading インジケータの位置）。
- **Suggestion Surface のデザイン**（Search 本体に内蔵するか、Combobox 等の別コンポーネントに委ねるか）。Figma の Active 状態は領域だけ確保されているが中身は未定義。Select の Item / Option を共有プリミティブとして使う前提だが、Surface 自体の境界連続性・影・最大高さ等は未定。
- Container の塗り型 / 輪郭型の選択（テーマで決まるか、variant か）。
- Submission mode のデフォルト（即時 vs 送信）。
- Search を landmark `role="search"` でラップする責務を本コンポーネントに持たせるか、呼び出し側に委ねるか。
- Error 状態の発生条件（クライアントバリデーションを Search 自身が持つか、結果側に委ねるか）。
- 実装着手時に `packages/react/src/ui/search.notes.md` へ移送: 採用する実装プリミティブの選択、コンポーネント分割、サジェストの状態管理。

### Acceptance Criteria

- AC-Search-01: Figma で確定済みの状態語彙（Enabled / Hover / Focused / Active / Error / Disabled）と、サイズ語彙（Small / Medium / Large）を、視覚と振る舞いの双方で区別できる。（検証: Storybook）
- AC-Search-02: 検索意図を 1 行の入力領域で受け止め、Leading Indicator により非ラベルでも検索だと識別できる。
- AC-Search-03: 値があるときだけ Clear アフォーダンスが現れ、クリック / Enter / Space でクリアできる。
- AC-Search-04: Esc の優先度（サジェスト閉じる → クリア → フォーカス抜ける）どおりに振る舞う。
- AC-Search-05: Enter はサジェスト非展開時は送信、展開時はハイライト選択に切り替わる。
- AC-Search-06: フォーカスは Container 単位で focus-visible のリングを示す。
- AC-Search-07: Active 状態では Container と Suggestion Surface が視覚的に連続したサーフェスとして読める。（検証: Storybook）
- AC-Search-08: Error 状態は `aria-invalid` と説明テキストの両方で支援技術に通知される。
- AC-Search-09: アクセシブルネームが必ず提供され、プレースホルダー単独に依存しない。
- AC-Search-10: Size ごとの高さ（Small 40px / Medium 48px / Large 56px）が通常時にちょうど成立し、状態や値の有無によって高さが変わらない。利用者の環境でテキストが拡大された場合は内容を切らずに高さが伸びる。（検証: Storybook）
