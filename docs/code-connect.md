# Figma Code Connect — マッピング運用

Figma のコンポーネントと `packages/react` の実装を Code Connect で対応づける。
これにより、エージェントや Dev Mode 利用者が Figma インスタンスから実装ファイルを
推測ではなく解決できる（issue #49）。

## 現在のマッピング

Figma ファイル: Common UI Kit Web（`dhuY0Fs1irfTaxTRbTCd1h`）。
マッピングは component set の variant 1 つに登録すると set 全体に伝播する。

| Figma component set | 登録ノード | componentName | source |
|---|---|---|---|
| Button（`1186:1331`） | `1186:1332` | `Button` | `packages/react/src/ui/button.tsx` |
| Search（`1748:16971`） | `1748:16969` | `Search` | `packages/react/src/ui/search.tsx` |
| Select（`393:268`） | `393:269` | `Select` | `packages/react/src/ui/select.tsx` |
| Select/Menu（`1688:26547`） | `1688:26671` | `Select` | `packages/react/src/ui/select.tsx` |
| Avatar/AvatarUnit（`9005:9563`） | `9005:9563` | `AvatarUnit` | `packages/react/src/ui/avatar-unit.tsx` |
| Chips（`1162:10352`） | `1162:10351` | `Chip` | `packages/react/src/ui/chip.tsx` |
| Pagination（`1487:6999`） | `1487:6998` | `Pagination` | `packages/react/src/ui/pagination.tsx` |
| Sidebar/Item（`2999:14066`） | `2999:11585` | `Sidebar.Item` | `packages/react/src/ui/sidebar.tsx` |
| Tabs/TabItem（`1161:3903`） | `1161:3902` | `Tab` | `packages/react/src/ui/tabs.tsx` |

## 未マッピング（Figma 側が library に publish されていない）

Code Connect は published component にしか登録できない。以下は同一ファイル内の
インスタンスとしては機能しているが未 publish のため登録できない（#58 で publish を依頼中）。

IconButton / Checkbox / Avatar / Dialog / Dropdown（Menu / MenuItem / MenuUnit）/
Sidebar（本体） / Table（Header 系） / Card

publish され次第、下記の手順で追加登録する。

## 登録・更新の手順

Figma Desktop の Dev Mode MCP Server（`http://127.0.0.1:3845/mcp`）の
`add_code_connect_map` / `send_code_connect_mappings` を使う（対象ファイルを
アクティブタブで開いておくこと）。

- 対象ノードは **component（variant symbol）または component set**。インスタンスは不可
- 1 variant に登録すれば set 全体に伝播する
- 登録済みの確認は `get_code_connect_map`（set ノードを渡すと配下の全登録が返る）

```
add_code_connect_map {
  "nodeId": "<variant symbol の node id>",
  "source": "packages/react/src/ui/<kebab>.tsx",
  "componentName": "<export 名>",
  "label": "React"
}
```

コンポーネントを追加・リネームしたときは、この文書の表とあわせて更新する。

## 未対応（今後の課題）

- **variant → props のテンプレート**（`.figma.ts`）: 単純マッピングは「どのファイルか」までを
  解決する。Figma の variant（`Type=Primary, Size=Small`）を React props（`variant="primary"
  size="sm"`）へ変換するにはテンプレート登録が要る。`get_context_for_code_connect` が
  Dev Mode MCP に無いため、変換表は component set の実測（`get_metadata` の variant 名）から
  起こす。publish 待ちのコンポーネントが揃ってからまとめて行う
- アイコン（Lucide / Remix の Figma コンポーネント）は orca の実装を持たないため対象外。
  利用側は `lucide-react` を直接使う（`docs/registry.md` の「アイコン」参照）
