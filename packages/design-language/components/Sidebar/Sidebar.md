---
name: Sidebar
status: ready
layer: component
description: ナビゲーション項目を並べるサイドバー。
sources:
  figma:
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=2999-14066
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=2999-1955
  implementations: []
  storybook: []
---

# Sidebar

## Guide

### Purpose

- アプリケーション内で主要機能・ナビゲーション・設定ショートカットへ直接アクセスできるよう、画面の端に常設される UI 要素。
- 「自分は今どこにいて、他にどこへ行けるか」を提示し、主要領域の作業を中断させずに移動を可能にする。
- ページ本文の描画、検索ロジック、認可、状態同期は責務外。
- 一時的に開閉する非常設のオーバーレイ（Drawer）の代替ではない。

### Usage

**Use when**

- アプリ全体の主要セクション間を頻繁に移動する場面。
- セクションが意味的にグループ化でき、常時参照したい階層があるとき。
- 画面の幅にゆとりがあり、本文領域と同時に表示しても支障がない PC / タブレット文脈。

**Do not use when**

- 単一画面のローカルナビゲーション（Tabs / Segmented Control を使う）。
- 一時的に開く補助パネル（Drawer / Popover を使う）。
- 設定や詳細編集のフォーム（モーダル / ページ遷移を検討）。
- モバイル幅の常設ナビ（別のナビゲーションパターンへの切り替えを検討。折り畳み表示は本コンポーネントの仕様に含まない）。

### User Mental Model

- 「画面の脇に、自分の居場所と移動先のリストが常にある」状態を期待する。
- 現在地は Sidebar.Item のひとつが `current` として区別されることで示される。視覚的な強調は Figma に Current variant が定義されてから加わる想定で、現時点では `aria-current` による支援技術への通知のみを保証する。
- 文脈に応じて項目が増減することは許容するが、同じ場所に居る間は順序が安定していると期待する。

### Anatomy

Sidebar は薄いコンテナであり、内部に任意要素を配置できる **3 つのスロット** と、ナビゲーション項目を表す **Sidebar.Item primitive** を持つ。折り畳み Group や Header / Footer のような固定 compound 構造は持たない。

必須:

- **Container** — 画面の片側に固定される縦長の領域。Container 自身が landmark となる。
- **Top Slot** — 上部の自由領域。呼び出し側が自由に配置する（Sample ページの利用例: ロゴ、「こんにちは、ゲストさん」のような挨拶テキスト）。
- **Main Slot** — Sidebar.Item を並べる主領域。
- **Bottom Slot** — 下端に固定される自由領域（Sample ページの利用例: カード）。
- **Sidebar.Item** — Main Slot に並ぶ単一のナビゲーション要素 primitive。差し替え可能な Icon と、必須の Label（テキスト）を持つ。

順序（上→下）: Top Slot → Main Slot → Bottom Slot。各スロットの中身の組み方（Section / Heading 等）は呼び出し側に委ねる。

禁止:

- Sidebar 内に本文コンテンツや長文を置かない。
- 一時的なお知らせ・トーストの常設先にしない。

### Content Model

- Sidebar.Item のラベルは短い名詞 / 名詞句。
- アイコンはラベルの意味を補強する用途に限る。
- 国際化: Item ラベル、aria-label を翻訳対象とする。
- 長いラベルの折り返し・省略挙動は Figma に仕様がなく未定義（Open Questions）。

### Layout And Density

- 画面端に固定し、本文領域と並置する。Sticky / fixed のいずれを採るかは呼び出し側のレイアウトに従う。
- Item が Main Slot に収まらない場合の挙動（スクロール等）は Figma に仕様がなく未定義（Open Questions）。
- density variant は持たない（Figma に size variant が存在しないため）。

### Accessibility Notes

- Container は **`navigation` ランドマーク**として実装し、アクセシブルネーム（例: 「主要ナビゲーション」）を必ず持つ。
- **フォーカスは Sidebar 内で循環させない**。常設ナビゲーションであり、Tab で本文領域へ自然に抜けられることを優先する（Drawer / Dialog のような focus trap は行わない）。
- `current` は `aria-current="page"` によって支援技術に通知する。視覚信号は伴わない（Figma に Current variant が追加され次第、定義する）。

## Spec

### Interaction Model

- Sidebar.Item のクリック / タップでルーティング遷移。タップ領域はアイテム全幅。
- `current` の切り替え（`aria-current` の更新）は遷移確定後に即時行う。視覚的な強調は本コンポーネントの責務に含めない（Visual Semantics 参照）。
- 長時間の loading が想定される場合は呼び出し側の Route で対応。

### State Model

Sidebar.Item の state は、Figma（node 2999:14066）が定義する **enabled / hover / focused** の 3 つのみを共通語彙とする。`disabled` に相当する variant は Figma に存在しないため持たない。

- `current`（現在地）はこの 3 state とは独立した軸として提供する。視覚は伴わず、`aria-current="page"` と `data-current` 属性のみで表現する（Figma に Current variant が追加されるまでの暫定。詳細は Accessibility Notes / Visual Semantics）。
- `current` は enabled / hover / focused のいずれとも共存できる（排他ではない）。

### Visual Semantics

- Container は明るいサーフェス色を背景に持ち、境界線を引かない。内側余白は左右 24px・上下 32px（Figma node 2999:1955 実測）。
- 上部グループ（Top Slot + Main Slot）は gap 24px。Main Slot 内の Sidebar.Item 同士の間隔はなし（gap 0）（Figma node 2999:1955 実測）。
- Sidebar.Item は 40px 固定高・角丸 4px・Icon-Label 間 gap 8px・ラベルは本文中位の太字（14px）・前景は標準の本文色（Figma node 2999:14066 実測）。
- Enabled の背景は基本サーフェス色。
- Hover は Enabled の背景の上に dark-opacity-8 の state layer を重ねる合成として表現する（単純な色差し替えではない）。
- Focused は背景を変えず、共有の focus リング（アウトライン相当の視覚表現）を重ねて示す。
- `current` に対応する専用の視覚表現は無い（Figma に Current variant が無いため）。

### Variants And Options

- Sidebar 本体に variant は無い。見た目の違い（Sectioned / Flat 相当の構成など）はスロットへの組み合わせ方によって呼び出し側が実現する。
- Display mode（Expanded / Collapsed / Overlay）・density は Figma に定義が無いため持たない（Open Questions）。

### Open Questions

- Current / Disabled の視覚は Figma に variant が無いため未定義（current は aria-current のみ提供）。Figma 追加待ち。
- 折り畳み Group・badge 等の付加機能は Figma に存在しないため未提供。必要になったらデザイン定義から。
- Item が溢れた場合の挙動（スクロール等）は Figma に仕様なし。
- 長いラベルの折り返し・省略挙動（Figma に仕様なし）。
- Display mode（Expanded / Collapsed / Overlay）を本コンポーネントが持つか、外側のレイアウト責務とするか。
- ルーティング統合の前提（Link 抽象を渡す方式）。
- 実装着手時に `packages/react/src/ui/sidebar.notes.md` へ移送: スロット API の形、Sidebar.Item primitive の API、ルーティング統合。

### Acceptance Criteria

- AC-Sidebar-01: Container は landmark として識別され、アクセシブルネームを持つ。
- AC-Sidebar-02: Sidebar.Item は Figma の状態語彙（enabled / hover / focused）が区別できる。（検証: Storybook）
- AC-Sidebar-03: `current` は `aria-current="page"` によって支援技術に通知される。視覚信号は Figma の Current variant 確定後に定義する。
- AC-Sidebar-04: キーボードのみで各スロットの Sidebar.Item に到達・選択できる。
- AC-Sidebar-05: 任意要素を 3 スロットに配置でき、Sidebar 本体はその配置に関与しない。
