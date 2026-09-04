# Dropdown implementation notes

`packages/design-language/components/Dropdown/Dropdown.md`（status: ready）を React へ写像するメモ。
仕様の正は design-language。実装が安定したら削除してよい。

## 採用した実装プリミティブ

- **Base UI Menu**（`@base-ui-components/react/menu`）。Menu Button Pattern（開閉・矢印・Home/End・
  type-ahead・Esc・選択後のフォーカス復帰・role=menu/menuitem 系）を委譲。[[project_base_ui_allowed]]

## React への写像

- `Dropdown`（Root: open/defaultOpen/onOpenChange/modal、`Menu.Root` のそのままの薄いラップ）。
- `Dropdown.Trigger`（`Menu.Trigger` を Figma 実測の固定構成でラップ。size sm/md/lg 既定 md、
  leadingIcon/trailingIcon 任意、children を必須ラベルとして扱う）。`render` /
  `disabled`（Figma component set に無く Open Questions）/ `openOnHover` / `delay` /
  `closeDelay` / `handle` / `payload` は公開しない（Anatomy「Trigger を素通しの任意コンテナに
  しない」・ユーザー裁定 2026-07-20 #2「素通し API は廃止」を型レベルで強制するため）。
- `Dropdown.IconTrigger`（Trigger の代替形態。`Menu.Trigger` の `render` に IconButton を
  合成して IconButton の見た目・寸法・label 必須要件をそのまま使う。issue #47 裁定。
  素通し `render` の非公開方針は維持し、IconButton に限定した合成として提供する）。
- `Dropdown.Menu`（Menu Surface。`Menu.Portal > Menu.Positioner(sideOffset=4, side="bottom",
  align="start") > Menu.Popup`。幅は `w-[var(--anchor-width)]` でトリガーに追従、内側 padding
  無し、影無し、1px `border-outline-bright` + `rounded-md`）。
- `Dropdown.Item`（`Menu.Item` を leadingIcon/trailingIcon 任意 + label 必須のみでラップ）。
  `closeOnClick` は公開しない（Menu Item は常に閉じる、という Interaction Model の不変条件を
  型で守るため）。

## 状態 → CSS の写像

- Trigger の Hover/Active(押下中) は Base UI の `data-pressed` / `data-popup-open`（Menu.Trigger
  実ソース `MenuTriggerDataAttributes` で確認）で判別。Expanded（`data-popup-open`）中は
  Hover/Active レイヤーを重ねない。
- Menu Item の Hover/Focused の判別は `internal/option-row.tsx` と同じパターン
  （`:hover` で state layer、`:hover` でない `data-highlighted` で focus リング）。
  ただし Menu Surface は Figma 実測どおり padding 無し + `overflow-y-auto` のため、
  共有 `shadow-focus-outline`（外向き 2px）は縁で切られて破綻する。項目のリングだけ
  内向き（inset の box-shadow、同じ `--border-width-md` / `--color-outline-focus`）に
  している。項目自体の角丸 8px（`rounded-md`）も Figma MenuItem 実測どおり。
  Base UI `Menu.Item` の data 属性は `highlighted` / `disabled` のみ（`MenuItemDataAttributes`
  実ソースで確認、`data-pressed` は存在しない）ため、Active（押下瞬間の一時的フィードバック）は
  `:active` 疑似クラスで表現している。

## 実装判断

- ユーザー裁定（2026-07-20）により CheckboxItem / RadioGroup / RadioItem / Group / Label /
  Separator / destructive / submenu を全削除した。Menu Item は単一種類のみ。
- Trigger は Figma 定型スタイルを実装コンポーネント自身が持つ（Button のような別コンポーネントへの
  委譲・render 差し替えはしない）。

## テスト環境の既知の gap（実装バグではない）

- このバージョンの Base UI（`1.0.0-rc.0`）+ jsdom + RTL では、同一テストファイル内で複数回
  Menu を開閉すると、Trigger にフォーカスが残ったまま最初に送るナビゲーションキー
  （ArrowDown/Home/End/type-ahead）が「Trigger → Menu へのキーボード中継」を経由せず
  no-op になることがある（実行順序に依存して再現）。Menu Surface 自体（role=menu）への
  `fireEvent.keyDown` は毎回確実に届くため、`Dropdown.test.tsx` では最初の 1 打鍵のみ
  `fireEvent.keyDown(menu, …)` を使い、以降（実項目にフォーカスが移った後）は
  `userEvent.keyboard` に委ねている。ブラウザ実機・Storybook 上の手動操作では発生しない
  テストハーネス固有の問題と判断した。
