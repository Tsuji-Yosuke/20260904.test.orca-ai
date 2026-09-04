---
name: Dialog
status: ready
layer: component
description: small / large と alert 表現を持つモーダルダイアログ（Base UI ベース）。
sources:
  figma:
    # published Dialog は node 9874:10911 の COMPONENT_SET（page "Dialog"）ただ1つ。
    # variant 軸は Size（small/large）× hasButton（true/false）の2つのみ。
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=9874-10911
  implementations: []
  storybook: []
---

# Dialog

## Guide

### Purpose

- 進行中の文脈に割り込み、ユーザーの注意を 1 つのタスク・決定・情報に集中させるモーダルな面。
- 「いま、これに応えてから先に進む」という焦点化を作る責務を負う。背後の操作は一時的に遮断される。
- 背後コンテンツの描画やルーティングは責務外。
- 常設のサイドパネルや、割り込みを伴わない補助表示（Popover / Sidebar）の代替ではない。

### Usage

**Use when**

- 続行に確認・入力・意思決定が必要で、背後の作業を一旦止めるべきとき。
- 重要な情報を、見落とされないように前面で提示するとき。
- 破壊的操作の確認（削除など）。

**Do not use when**

- 割り込まずに補助情報を添えたいとき（Popover / Tooltip）。
- 常設の領域・ナビゲーション（Sidebar）。
- 短い一過性の通知（Toast）。
- 入力が長大でページ遷移が自然なとき（専用ページ）。

### User Mental Model

- 「前面に箱が出て、背景が暗くなり、まずこれに応える」状態と認識する。
- 右上の × ボタンが常に閉じる手段として存在すると期待する。
- 破壊的確認では、誤操作で確定しない安全側の既定を期待する。

### Anatomy

Dialog は固定順序のスロット構造を持つ、単一のコンテナ。

- **Trigger**（任意）— Dialog を開く起点。呼び出し側が制御で開く場合は不要。
- **Backdrop**（必須）— 背景を覆うスクリム。背後への割り込みを示す。
- **Container**（必須）— Dialog 本体の面。前面に浮く。
- **Header**（必須）— **Title**（必須）と、右上固定の **Close Affordance**（必須）を持つ。
- **Body**（必須）— 自由スロット。主たる内容（説明・フォーム等）を呼び出し側が構成する。
- **Footer**（hasButton のときのみ）— 操作（確定 / 取消など）。

順序（上→下）: Header（Title + Close）→ Body → Footer（あれば）。

禁止:

- 1 つの Dialog に複数の主題を詰め込まない。
- Close Affordance を省略しない。全 variant に常設する。
- Footer の主アクションの位置・意味を画面ごとに変えない。

### Content Model

- Title は主題を一言で。問いかけ型（「削除しますか？」）も可。
- Body の中身の意味は呼び出し側が決める。Dialog は構造・余白のみ提供する。
- Footer のアクションラベルは結果を明示する（「削除」「キャンセル」など、曖昧な「OK」を避ける）。
- 破壊的アクションは意味色（danger）と安全側の既定で示す。
- 国際化: Title / Body / アクションラベル / Close Affordance のアクセシブルネームすべて翻訳対象。

### Layout And Density

Figma 実測（node 9874:10911）に基づく。

- Container は角丸なし・枠線なし。視口中央に配置し、内容が視口を超える場合は Container 内でスクロールする。背景はスクロールさせない。
- 幅は size 段階（small / large）の上限値で頭打ちにし、狭い画面では縮む。
- Header: 上 24px・左 24px・下 8px・右 48px（Close Affordance の逃げ）の内側余白。
- Close Affordance: 右上 absolute 配置（右 4px・上 4px）。small は 40px 四方・アイコン 16px、large は 56px 四方。
- Body: 左右 24px・上下 8px の内側余白。hasButton=false（Footer なし）のときは下端 24px。
- Footer（hasButton のときのみ）:
  - small: 左右 24px・上 8px・下 24px、アクションを右寄せで横並び（gap 8px）。
  - large: 全辺 24px、アクションを中央寄せで縦積み（gap 8px）。塗り（filled）が上、線（outlined）が下。
    ボタンは等幅（内容幅の約6割。実測 592px / 内容幅 962px）。

### Accessibility Notes

- **WAI-ARIA Dialog (Modal) Pattern** に準拠。破壊的確認用途は `role="alertdialog"` を用いる（severity）。視覚差は持たない。
- Title を Dialog のアクセシブルネームに結びつける。
- Body の内容を説明（description）として結びつける仕組みは、自然に維持できる場合は残してよい。専用の Description スロットは持たない（Figma に説明テキスト要素なし）。
- focus trap・open/close 時のフォーカス移動と復帰・Esc・背景スクロールロックは標準パターンに従う（実装プリミティブで担保）。
- Close Affordance はアクセシブルネームを持つ（例: 「閉じる」）。

## Spec

### Interaction Model

WAI-ARIA Dialog (Modal) Pattern の標準挙動（focus trap、open 時のフォーカス移動、閉じた後のフォーカス復帰、Esc で閉じる、背景クリックで閉じる、背景スクロールロック）に準拠する。orca 固有の追加判断のみ記述する。

- 既定はモーダル（背後を操作不可にする）。
- 閉じる手段は Close Affordance（×）・Esc・背景クリックの 3 系統。破壊的確認（severity=alert）でも Close Affordance は維持する。
- 主アクションの配置は size に連動する（Layout And Density 参照）。

### State Model

- 開閉（open / closed）を持つ。open 時のみ Container と Backdrop が存在する。
- 内部のフォーム等の状態は中身側の責務。Dialog 自体は開閉程度に限る。

### Visual Semantics

- Container は白背景・角丸なし・枠線なしの面で、Elevation Level 5（強い影）により前面性を示す。Backdrop は背景を減衰させ割り込みを示す。
- Title は small が headline-small-bold（24px）、large が headline-large-bold（32px）。色は Primary（既定テーマでは黒）。
- 破壊的確認は主アクションに danger の意味色を与える。
- Close Affordance は ghost・円形の IconButton 相当。既存の × アイコンの慣習に従う。
- motion は開閉のトランジションに用いてよい（`prefers-reduced-motion` を尊重）。

### Variants And Options

- **size**: small / large。Container 幅上限・Title タイポグラフィ・Close Affordance 寸法・Footer レイアウトが連動して変わる。
- **hasButton**: Footer の有無。false のとき Body 下端の余白が広がる。
- **severity**: 通常（既定・role=dialog） / 破壊的確認（role=alertdialog）。視覚差は持たない a11y セマンティクスのみ。

### Open Questions

- Container 幅の上限値（small=345px / large=1010px）は Figma 実測値であり、対応するトークンが整備されていない。トークン同期後に置き換える。
- Header 右 padding 48px に一致する spacing トークンが確認できていない（`padding-3xl` は既定 64px）。実装時に改めて確認する。
- Footer のボタン構成（small: 横並び / large: 縦積み・filled+outlined）を Dialog 側で強制するか、単なる配置レイアウトとして自由スロットに留めるかは実装時に判断する。
- large の Footer ボタン幅は実測 592px（内容幅 962px の 61.5%）の1サンプルのみで、固定値か割合かを判別できない。実装は割合（60%）+ 下限（内容が折れない幅）で暫定対応。デザイナーに意図を確認する。

### Acceptance Criteria

- AC-Dialog-01: Trigger または制御により開閉でき、open 時のみ Container と Backdrop が存在する。
- AC-Dialog-02: モーダル時、focus trap・open 時のフォーカス移動・閉じた後のフォーカス復帰・背景スクロールロックが働く（標準パターン）。
- AC-Dialog-03: Esc と背景クリックで閉じられる。
- AC-Dialog-04: Title が Dialog のアクセシブルネームになる。
- AC-Dialog-05: Close Affordance（×）が全 variant に常設され、アクセシブルネームを持ち、クリックで Dialog を閉じる。
- AC-Dialog-06: severity=alert のとき `role="alertdialog"`、既定は `role="dialog"` になる。
- AC-Dialog-07: size（small / large）を区別でき、Title タイポグラフィと Close Affordance 寸法が size に連動する。（検証: Storybook）
- AC-Dialog-08: hasButton=true のとき Footer が表示され、hasButton=false のとき Footer は表示されず Body 下端の余白が広がる。（検証: Storybook）
- AC-Dialog-09: Footer のレイアウトは size に連動する（small: 右寄せ横並び / large: 中央寄せ縦積み）。（検証: Storybook）
- AC-Dialog-10: Container は角丸なし・枠線なしで、Elevation Level 5 の影を持つ。（検証: Storybook）
- AC-Dialog-11: 色・寸法・影・モーションは token 経由で、全テーマで破綻しない。（検証: Storybook）
