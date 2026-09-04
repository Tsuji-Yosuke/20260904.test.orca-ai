# Orca shadcn registry — 利用ガイド

Orca の React コンポーネントは、shadcn/ui と同じ方式（ソースを利用側リポジトリにコピー）で配布する。
コピーされたコードは利用側の所有物で、自由に編集できる。

## 前提

- **Tailwind CSS v4**（CSS-first。`tailwind.config.js` ベースの v3 は非対応）
- **React 19**
- **shadcn CLI v4**（以下の手順は 4.15 系で検証）

## セットアップ

配布は **raw.githubusercontent + GitHub トークン**。orca-ds/orca の read 権限があれば利用できる。

### 1. shadcn プロジェクトを初期化する

shadcn CLI v4 は `--yes` を付けても component library と preset の対話プロンプトを出す。
非対話環境（CI、コーディングエージェント）ではそこでハングするため、フラグを明示する:

```bash
npx shadcn@latest init --yes -b base -p nova
```

- `-b` はコンポーネントライブラリ（`base` / `aria` / `radix`）。orca は Base UI を使うため
  `base` を選ぶ（orca が入れる `@base-ui/react` と同一パッケージ）。
- `-p` は preset（テーマ + アイコン + フォント）。preset が globals.css に書き込むテーマは
  **orca のトークンと衝突するため、手順 6 で撤去する**。
- v3 の `--base-color` フラグは廃止されている（`components.json` の `tailwind.baseColor` は現存）。

### 2. 認証を用意する

`gh` CLI にログイン済みなら、そのトークンをそのまま使える（PAT の発行は不要）:

```bash
env GITHUB_TOKEN=$(gh auth token) npx shadcn@latest add @orca/button --dry-run
```

トークンをファイルに書き込めない環境（コーディングエージェント等）でも、この形なら通る。

`gh` を使わない場合は fine-grained PAT を発行する:

1. GitHub → 右上アイコン → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
2. 設定値:
   - **Resource owner**: `orca-ds`（自分のアカウントではなく org を選ぶ）
   - **Repository access**: Only select repositories → `orca-ds/orca`
   - **Permissions**: Repository permissions → **Contents: Read-only**（それ以外は不要）
   - **Expiration**: 90 日（切れたら再発行）
3. 生成されたトークン（`github_pat_...`）は環境変数 `GITHUB_TOKEN` として渡す。
   永続化したい場合はプロジェクト直下の `.env.local` に置く
   （`.gitignore` 対象であることを確認。コミットしないこと）:

```bash
# .env.local
GITHUB_TOKEN=github_pat_...
```

- 生成後に「pending approval」の場合は org の承認フローが有効。orca-ds の owner に承認を依頼する。
- fine-grained PAT が使えない場合のみ classic PAT（scope: `repo`）を使う。権限が広いので恒常利用しない。

### 3. トークンの疎通を確認する

```bash
curl -fsS -H "Authorization: token ${GITHUB_TOKEN:-$(gh auth token)}" \
  "https://raw.githubusercontent.com/orca-ds/orca/main/apps/registry/public/r/registry.json" | head -c 200
```

JSON が返れば疎通できている。404 ならトラブルシュートを参照。

### 4. registry を登録する

`components.json` に `@orca` namespace を追加する。`${GITHUB_TOKEN}` は shadcn CLI が
`.env.local` から実行時に展開する:

```json
{
  "registries": {
    "@orca": {
      "url": "https://raw.githubusercontent.com/orca-ds/orca/main/apps/registry/public/r/{name}.json",
      "headers": {
        "Authorization": "token ${GITHUB_TOKEN}"
      }
    }
  }
}
```

### 5. コンポーネントを追加する

```bash
npx shadcn@latest add @orca/button        # 単品
npx shadcn@latest add @orca/orca          # 全コンポーネント一括
```

`gh` のトークンを使う場合は `env GITHUB_TOKEN=$(gh auth token)` を前置する（手順 2）。

どのコンポーネントを追加しても、依存する共有ファイル（`lib/focus-ring.ts` 等）と
デザイントークン一式（`styles/orca/`）が `registryDependencies` 経由で自動的に入る。

アイテム一覧は `registry.json`（またはリポジトリの `apps/registry/public/r/`）を参照。
コンポーネント 14 種 + `tokens` + `orca`（一括用メタ）がある。

**このリポジトリを clone 済みの場合**はトークン不要で、ローカルパスから直接 add できる:

```bash
npx shadcn@latest add ~/src/github.com/orca-ds/orca/apps/registry/public/r/button.json
```

### 6. グローバル CSS を orca に寄せる

shadcn init は preset のテーマ（`@theme inline` / `:root` / `.dark` / `@layer base`）を
globals.css に書き込む。これは orca のトークンと**同じ変数名**（`--color-primary` /
`--color-secondary` / `--radius-sm` 等）を奪い合い、さらに `@layer base` の
`* { border-border }` / `body { bg-background }` / `html { font-sans }` が orca の
境界線色・面色・フォント（Noto Sans JP / Roboto）を上書きする。
どちらが勝つかは `@import` 順とレイヤ解決に依存するため、**削除して orca を単一の正にする**。

init 直後の globals.css を丸ごと以下で置き換える（パスは globals.css の位置に合わせて調整）:

```css
@import "tailwindcss";
@import "../styles/orca/orca.css";

/* orca は body の既定の面色を規定しないので利用側で指定する */
body {
  background-color: var(--color-surface);
  color: var(--color-on-surface);
}
```

orca のコンポーネントは shadcn の `cn` / tailwind-merge に依存しないため、撤去して困るものは無い。
shadcn の公式コンポーネント（`npx shadcn@latest add button` 等）を併用する場合は両方のテーマが
必要になるが、変数名が衝突するため名前空間の分離が必須。現状は非推奨。

## 配置されるもの

| 配置先 | 内容 |
|---|---|
| `components/ui/*.tsx` | コンポーネント本体（`"use client"` 付き） |
| `lib/focus-ring.ts`, `lib/option-row.tsx` | 共有プリミティブ |
| `styles/orca/*.css` | トークン CSS 4 ファイル（手編集しない。更新で上書きされる） |

npm 依存として `@base-ui/react`（stable。exact pin、更新は orca 側で検証してから配布）、
`clsx`、`@fontsource/noto-sans-jp`、`@fontsource/roboto` が入る。
shadcn init（`-b base`）が入れる `@base-ui/react` と同一パッケージなので二重には入らない。
shadcn の `cn` ユーティリティと tailwind-merge は使わない（コンポーネントは `clsx` のみ）。

## アイコン

Figma のデザインは **Lucide** を使っている。orca はアイコンライブラリを同梱せず、
`icon` / `leadingIcon` などのプロップは `ReactNode` を受けるため任意のライブラリを使えるが、
Figma と突き合わせる場合は `lucide-react` が最も摩擦が少ない:

```bash
pnpm add lucide-react
```

### 小さいアイコン操作の自作

`IconButton` の最小サイズは 40px（タッチターゲットの下限）で、トグル（on/off の保持）も
持たない。一覧内のお気に入りスターのような 40px 未満・トグル付きの操作は、
素の `<button>` で自作する。フォーカスリングは配布される `lib/focus-ring.ts` を流用すると
見た目の一貫性を保てる:

```tsx
<button
  type="button"
  aria-pressed={favorite}
  aria-label="お気に入りに追加"
  className={clsx(
    "inline-flex size-icon-lg items-center justify-center rounded-sm",
    "text-on-placeholder transition-colors hover:text-on-surface",
    FOCUS_VISIBLE_RING,
  )}
>
  <Star fill={favorite ? "currentColor" : "none"} />
</button>
```

## デザインを参照する（Figma MCP）

Figma のデザインを読むときは **Figma Desktop の Dev Mode MCP Server** を使う。
プロジェクト直下の `.mcp.json` に登録する:

```json
{
  "mcpServers": {
    "figma-desktop": { "type": "http", "url": "http://127.0.0.1:3845/mcp" }
  }
}
```

- リモートの Figma MCP プラグインは **Dev / Full seat が必要**で、View / Collab seat は
  plan を問わず月 6 コールに制限される。orca のデザインファイルが属する plan での
  自分の seat を確認すること。
- Dev Mode MCP Server は **Figma Desktop のアクティブタブに束縛される**。実装の途中で
  都度取りに行くと、タブ切替で取得不能になる。実装前に `get_metadata` /
  `get_variable_defs` / `get_screenshot` を必要なノード分まとめて取得しておく。

## テーマ切替

`<html>` の data 属性で切り替える（省略時は `:root` の既定値）:

```html
<html data-lang="ja" data-density="expressive" data-color-system="default">
```

- `data-lang`: `ja` | `en`
- `data-density`: `expressive` | `productive`
- `data-color-system`: `corporate` ほか

**light テーマのみ**。ダークモードはトークン整備後に `tokens` の再 add で配布する。

## Next.js App Router での注意

compound API（`Dialog.Trigger` / `Dialog.Content` 等のドット参照）は、React Server Component から
直接使うと `Element type is invalid ... got: undefined` になる（client 参照のプロパティアクセスは
RSC 境界を越えられない）。compound コンポーネントを使うファイルには `"use client"` を付けること。
`<Button>` など単一エクスポートの利用は Server Component からでも動く。

## フォント

`styles/orca/orca.css` 先頭の `@fontsource` 4 行が Noto Sans JP / Roboto を読み込む。
`next/font` などで自前管理する場合はこの 4 行を削除する
（トークンは "Noto Sans JP" / "Roboto" というファミリー名だけを参照する）。

## 更新

インストール済みコードは自動更新されない。更新したいときに再 add する:

```bash
npx shadcn@latest add @orca/button --dry-run   # 何が変わるか先に確認
npx shadcn@latest add @orca/button --diff      # ファイル diff 表示
npx shadcn@latest add @orca/button --overwrite # 上書き適用
```

ローカルで編集したコンポーネントに `--overwrite` すると編集は失われる。
diff を見て手動マージする。`styles/orca/` は常に上書きする。

特定時点に固定する場合は、`components.json` の URL の `main` を tag / commit SHA に
差し替える（例: `.../orca-ds/orca/<sha>/apps/registry/public/r/{name}.json`）。

## トラブルシュート

| 症状 | 原因と対処 |
|---|---|
| `init` / `add` が応答なしで止まる | shadcn CLI v4 は `--yes` でも対話プロンプトを出す。`init` は `-b` / `-p` を明示する（手順 1）。非対話環境では必須 |
| curl / add が **404** | private repo では認証失敗も 404 になる。`gh` ログイン済みなら `env GITHUB_TOKEN=$(gh auth token)` でまず切り分ける。PAT の場合は Resource owner が `orca-ds` か、Repository access に `orca-ds/orca` が含まれるか、org の承認が済んでいるか（pending approval のままでないか）を確認 |
| add で **401 / Bad credentials** | トークンの期限切れ、または環境変数 / `.env.local` の値のミス。curl（手順 3）で切り分ける |
| `${GITHUB_TOKEN}` が展開されない | 環境変数として渡すのが確実（`env GITHUB_TOKEN=... npx shadcn ...`）。`.env.local` を使う場合は **shadcn CLI を実行するディレクトリ**（プロジェクトルート）に置く |
| 色やフォントが orca にならない | shadcn preset テーマの撤去漏れ。globals.css を手順 6 の形に置き換える |
| add 後にスタイルが当たらない | globals.css への `@import "../styles/orca/orca.css";` 追加漏れ（`@import "tailwindcss";` の後に置く）。パスが globals.css からの相対になっているかも確認 |
| `Element type is invalid ... undefined` | compound API を Server Component から使っている。「Next.js App Router での注意」を参照 |

## registry の開発（このリポジトリ側）

- ルート `registry.json` と `apps/registry/public/r/*.json` は **生成物**（コミット対象）。
  `pnpm --filter @orca/registry build` で再生成し、CI の `registry:check` が drift を検出する。
- アイテム定義は `apps/registry/src/registry-meta.ts`、生成ロジックと原本の registry-ready
  検査は `apps/registry/src/catalog.ts` + `test/registry.test.ts`。
- 原本側の規約（`src/ui/<kebab>.tsx`、`@/registry/orca/*` alias、`"use client"`）は
  `packages/react/CLAUDE.md` を参照。
- `ORCA_REGISTRY_BASE_URL=<url>` を与えてビルドすると registry 依存が絶対 URL になる
  （公開配信へ切り替える場合に使う）。

### 公開配信へ切り替える場合

- `tokens.css` にはブランド由来トークン（`--color-toyota-red`、`[data-color-system="corporate"]` 等）が
  含まれる。公開の前にブランド情報の公開可否を確認する。
- ライセンスを選定し LICENSE を追加する（現状未定・ファイル無し）。
- 公開する場合は repo public 化 + GitHub registry 形式
  （`npx shadcn@latest add orca-ds/orca/button`。ルート registry.json をそのまま使い、ビルド済み JSON は不要になる）。
