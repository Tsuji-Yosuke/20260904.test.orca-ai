# Sidebar implementation notes

実装・原典とこのメモが食い違う場合は、実装・原典を正とし、このメモを直ちに修正または削除する。

`packages/design-language/components/Sidebar/Sidebar.md`（status: ready）を React へ写像するメモ。
仕様の正は design-language。

## React への写像

- `Sidebar` … `<nav>` ランドマーク。`aria-label` を必須（型で強制）。`h-full` の縦コンテナ。
- スロット: `Sidebar.Top` / `Sidebar.Main` / `Sidebar.Bottom`（`data-sidebar-slot`）。
  padding はコンテナ側 (`px-padding-lg` / `py-padding-xl`) に統一。Main は `flex-1` のみで
  `overflow-y-auto` は付けない — clip コンテキストが Item の focus リング（box-shadow）を
  左右で切る不具合が出たため撤去（ユーザー指摘 2026-07-14）。Item が溢れた場合の挙動は
  Figma に仕様が無く Open Questions（必要になったらスクロール方式を含めて設計する）。
- `Sidebar.Item` … ラベル必須 + 任意 `icon`（装飾, aria-hidden）。`href` ありで `<a>`、
  無しで `<button>`。`current` は `aria-current="page"` + `data-current` のみを付与し、
  視覚は enabled と同一（Figma に Current variant が無いため。ユーザー裁定 2026-07-14）。
- focus trap はしない（常設ナビ。Tab で本文へ自然に抜ける）。

## 実装判断（2026-07-14、ユーザー裁定を反映）

- 6 月実装で「暫定既定」として発明されていた以下は Figma に存在しないため全て撤去した:
  - `Sidebar.Group`（Base UI Collapsible による折り畳み）
  - `badge` prop
  - `disabled` prop（native disabled 分岐・`ITEM_DISABLED` 含む）
  - `current` の視覚（黒バー + 塗り、`ITEM_CURRENT`）
  - これに伴い、Sidebar から `@base-ui-components/react` への依存は無くなった
    （パッケージ全体としては Tabs/Chip/Search が引き続き使用するため依存自体は維持）。
- `current` prop 自体は維持するが、出力は `aria-current="page"` + `data-current` のみ。
  Figma に Current variant が追加された時点で視覚を定義する。
- スロットは 3 つ固定（Top/Main/Bottom）の subcomponent 構成を維持（Figma 構造と矛盾しないため）。
- ルーティング統合は `href` 受け渡し方式（Link 抽象の注入は将来課題）。

## 一時的な gap

- Item が Main Slot に収まらない場合の挙動（スクロール等）は Figma に仕様が無い
  （design-language の Open Questions を参照）。
- 長いラベルの折り返し・省略挙動は Figma に仕様が無い（Open Questions）。
- Display mode（Expanded / Collapsed / Overlay）を持つかどうかは未決定（Open Questions）。
