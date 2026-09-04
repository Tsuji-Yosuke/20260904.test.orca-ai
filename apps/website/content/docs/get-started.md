---
title: Get started
description: Orca のコンポーネントを自分のプロジェクトへ導入する手順。
---

Orca の React コンポーネントは、shadcn/ui と同じ方式（ソースを利用側リポジトリにコピー）で配布します。コピーされたコードは利用側の所有物で、自由に編集できます。

## 前提

- **Tailwind CSS v4**（CSS-first。`tailwind.config.js` ベースの v3 は非対応）
- **React 19**
- **shadcn CLI v4**

## インストール

### 1. shadcn プロジェクトを初期化する

```bash
npx shadcn@latest init --yes -b base -p nova
```

Orca は Base UI を使うため、コンポーネントライブラリには `base` を選びます。

### 2. 認証を用意する

配布は raw.githubusercontent + GitHub トークンです。`gh` CLI にログイン済みなら PAT の発行は不要です。

```bash
gh auth status
```

`gh` を使わない場合は、`orca-ds/orca` に対する Contents: Read-only 権限を持つ fine-grained PAT を用意し、プロジェクトルートの `.env.local`（gitignore 対象）へ `GITHUB_TOKEN=github_pat_...` として保存します。

### 3. registry を登録する

`components.json` に `@orca` namespace を追加します。

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

### 4. 認証の疎通を確認する

```bash
curl -fsS -H "Authorization: token ${GITHUB_TOKEN:-$(gh auth token)}" \
  "https://raw.githubusercontent.com/orca-ds/orca/main/apps/registry/public/r/registry.json" \
  | head -c 200
```

JSON が返れば準備完了です。404 の場合は、リポジトリ権限や org の承認状態を確認してください。

### 5. コンポーネントを追加する

```bash
env GITHUB_TOKEN="$(gh auth token)" npx shadcn@latest add @orca/button # 個別
env GITHUB_TOKEN="$(gh auth token)" npx shadcn@latest add @orca/orca   # 全件
```

どのコンポーネントを追加しても、共有ファイルとデザイントークン一式が依存として入ります。

### 6. グローバル CSS を Orca に寄せる

shadcn init が生成した preset のテーマは Orca の変数と衝突します。既存のテーマ定義を残さず、globals.css を次の形に置き換えます（import の相対パスは配置に合わせて調整してください）。

```css
@import "tailwindcss";
@import "../styles/orca/orca.css";

body {
  background-color: var(--color-surface);
  color: var(--color-on-surface);
}
```

## テーマ属性

`<html>` に以下の data 属性を指定できます（省略時は既定値）。

- `data-density` — `expressive` / `productive`
- `data-lang` — `ja` / `en`
- `data-color-system` — 省略（default）/ `corporate`

現状 light テーマのみ提供しています。

## 詳細

PAT の発行、Next.js App Router で compound component を使う場合の注意、更新とトラブルシュートは、リポジトリの [registry 利用ガイド](https://github.com/orca-ds/orca/blob/main/docs/registry.md) を参照してください。
