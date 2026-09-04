---
name: Card
status: ready
layer: component
description: ヘッダースロットを持つコンテンツコンテナ。
sources:
  figma:
    # published Card は node 9481:8874 の COMPONENT_SET（page "Card"）ただ1つ。
    # variant 軸は hasImage / hasContextMenu の2つのみ。State variant（Hover/Focused/Selected 等）は存在しない。
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=9481-8874
  implementations: []
  storybook: []
---

# Card

## Guide

### Purpose

- 見出し・本文・画像・自由な操作スロットを 1 つの面（サーフェス）にまとめて提示する、静的な入れ物。
- 「ここからここまでが 1 つのまとまり」という境界を、枠線と角丸と内側余白で作ることに責務を持つ。
- 中身（テキスト・画像・操作要素）の意味と挙動は中身側の責務。Card 自身は操作を解決しない。
- レイアウトグリッドそのものや、ページ全体の領域分割は責務外。

### Usage

**Use when**

- 見出し・説明・画像・操作を 1 まとまりとして並置したいとき。
- 一覧で各要素を等価なまとまりとして反復表示したいとき。

**Do not use when**

- 入れ子の境界を持たない素のテキスト塊（素の要素を使う）。
- モーダルな割り込み（Dialog を使う）。
- ナビゲーション主目的の並び（List / Sidebar / Tabs を使う）。
- まとまり全体をクリック可能にしたい用途（Card 自身はクリック不可。必要なら中身のスロットに操作要素を置く）。

### User Mental Model

- 「枠で囲まれた 1 つのまとまり」を、ひとかたまりの情報として読む。
- 枠線と角丸は「他と区切られた独立した塊」という手がかりとして読まれる。
- Card 自体は押せるものだと期待しない。押せる操作は中身のボタン・アイコンなど個別要素に対して行う。

### Anatomy

Card は上から順に最大 4 つの領域を持つ、固定順序のスロットコンテナ。

- **Image**（任意）— カード幅いっぱいに広がり、上端の角丸に沿う画像領域。
- **Header**（任意）— 横並びの 2 要素:
  - **Text ブロック**（任意）— 縦並びの **Title**（任意）と **Description**（任意）。
  - **Header Slot**（任意）— 右端、40px 四方。IconButton などの単一操作要素を置く。
- **Content**（任意）— 自由スロット。中身の意味・構造には関与しない。
- **Footer**（任意）— 自由スロット。操作やメタ情報を置く。

順序（上→下）: Image → Header → Content → Footer。全スロットが任意であり、Card はどの組み合わせでも成立する。

禁止:

- スロットの順序を呼び出し側で入れ替えない。
- Header Slot に複数の操作要素を並べない（単一の操作対象専用）。

### Content Model

- Title は主題を一言で示す。装飾的な飾り文にしない。
- Description は Title を補う短い説明。長文を詰め込まない。
- Image は主題に関係する図版に限る。
- Content / Footer の中身の意味は呼び出し側が決める。Card は構造・余白のみ提供する。
- 国際化: Title・Description・スロット内テキストはすべて翻訳対象。

### Layout And Density

- Header は左右 24px・上 24px・下 8px の内側余白を持ち、Text ブロックと Header Slot を横並び（gap 8px）で配置する。Text ブロックは Header の残り幅を占有し（fill）、Title・Description はその幅で折り返す。Text ブロック内は Title と Description を縦並び（gap 4px）で配置する。
- Content は左右 24px・上下 8px の内側余白を持つ。
- Footer は左右 24px・上 8px・下 24px の内側余白を持つ。
- Image はカード幅いっぱいに広がり、内側余白を持たない（フルブリード）。
- 幅は親に追従する流動幅を基本とする。高さは内容に従う。
- density variant（padding の大小切り替え）は持たない。

### Accessibility Notes

- 非インタラクティブなため role は持たせない。
- Title を含む場合、見出し要素（例: h3）として意味づけ、その見出しでまとまりの主題が辿れるようにする。見出しレベルの最終判断は呼び出し側の文脈に委ねてよい。
- Header Slot・Content・Footer 内の操作要素は、それぞれ自身のアクセシビリティ要件（フォーカス可能性・アクセシブルネーム）を個別に満たす。

## Spec

### Interaction Model

- Card 自体は非インタラクティブ。クリック・ホバー等の独自の操作対象にならない。
- 操作が必要な場合は Header Slot / Content / Footer に置かれた個別の操作要素（ボタン等）がそれぞれの操作を担う。

### State Model

- なし。Card は状態を持たない静的なコンテナであり、5 state 共通語彙（enabled/hover/active/focused/disabled）は適用外。

### Visual Semantics

- Container は白背景（Figma: UI/Surface）・1px の枠線（Figma: UI/OutlineBright）・角丸（Figma: sizing/radius/lg = 12px）を持つ面として、周囲から独立したまとまりであることを示す。（裁定 2026-08-07: 旧 base/card・border-radius/rounded-xl 14px は Figma 側を UI/Surface・sizing/radius/lg へ修正済み）
- 影・浮きの表現は持たない（輪郭のみで区切る）。
- Title は Figma テキストスタイル `Standard/Title/MediumBold` 相当の太字見出し、色は Brand/Primary 系（既定テーマでは黒）。
- Description は Figma テキストスタイル `Standard/Body/Medium` 相当、色は UI/OnSurface 系。
- 意味色（danger / success 等）は Card 自身に載せない。中身で表現する。

### Variants And Options

- **hasImage**: Image スロットの有無。
- **hasContextMenu**: Header Slot（40px）の有無。

emphasis（outlined/elevated/filled 等の視覚的重みの切り替え）、size（padding 密度の切り替え）、インタラクティブ化（href / onClick によるクリック可能な Card、hover/active のステートレイヤー、フォーカスリング）は Figma に存在せず、本コンポーネントの responsibility に含めない。

### Open Questions

- Title の見出しレベル（h2/h3 等）の最終決定責務を Card に持たせるか、呼び出し側に完全に委ねるか。
- Image のアスペクト比プリセットの要否（Figma はプレースホルダ表示のみで実寸の根拠なし）。

### Acceptance Criteria

- AC-Card-01: Image / Header（Title・Description・Header Slot）/ Content / Footer を任意に組み合わせて 1 つのまとまりを構成でき、いずれも省略できる。
- AC-Card-02: スロットは Image → Header → Content → Footer の順序で表示される。（検証: Storybook）
- AC-Card-03: Header 内の Text ブロック（Title・Description）と Header Slot は横並びで配置され、Header Slot は 40px 四方である。（検証: Storybook）
- AC-Card-04: Title は見出し要素として意味づけられる。
- AC-Card-05: Card は独自の role・クリックハンドラ・フォーカス可能属性を持たず、静的な div として振る舞う。
- AC-Card-06: Container は白背景・1px 枠線・角丸を持つ。（検証: Storybook）
- AC-Card-07: emphasis / size / インタラクティブ化（href・onClick・hover・active・focus リング）の variant を持たない。
- AC-Card-08: 色・余白・角丸は token 経由で、全テーマで破綻しない。（検証: Storybook）
- AC-Card-09: Title は太字見出しスタイル・Brand/Primary 系の色、Description は本文スタイル・UI/OnSurface 系の色で表示される。（検証: Storybook）
