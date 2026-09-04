# Plan 011: web-prototype の視覚言語を Next.js ドキュメントサイトへ移植する

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 1504b18..HEAD -- apps/website pnpm-lock.yaml packages/token-pipeline/tokens/variables/color-system.json packages/react/src/ui/button.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L（実装 4〜7 日 + デザインレビュー。コンテンツ移行は含まない）
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `1504b18`, 2026-08-24

## Implementation result

- **Completed**: 2026-08-24 on `feat/website-prototype-parity`
- 1440×900 の `/` は header 48px、hero 513px、body/viewport 1440px で横 overflow なし。
- 375×812 の `/` は header 48px、hero 764px、rail hidden、body/viewport 375px。
- 1440×900 の `/components/button` は 80px rail + 240px section navigation、dark hero。
- 375×812 の同 route は 44px current section bar、body/viewport 375px。mobile menu と
  section panel は開閉、Escape close、trigger への focus 復帰を確認した。
- prototype との差は裁定どおり、現在地色と focus を Orca token にした点、および Search / AI /
  feedback を表示しない点。Typography / spacing / layout / TOYOTA 表示ブランドは移植した。
- `pnpm --filter @orca/website build`、`pnpm --filter @orca/website typecheck`、
  `pnpm tokens:check`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`git diff --check` は成功。
  Turbopack は既存 `component-pages.ts` の動的 filesystem tracing warning を出すが、20 route の
  static generation は成功した。

## Why this matters

`apps/website` は Next.js 16 のルート、`@orca/react`、生成済みトークンを接続する
骨格までは完成しているが、ドキュメントサイトとしての視覚設計とモバイル導線は未完成である。
実測では 375px 幅でも 80px のデスクトップレールが残り、ページの scroll width が
403px、本文幅が 295px になっていた。一方、デザイナー作成の
`/Users/nagayama/src/github.com/orca-ds/web-prototype` は同じ情報分類を持ち、1440px と
375px の双方でヘッダー、レール、セクションナビ、ドキュメントヒーロー、カード群まで
実装済みである。

Astro 固有の機能は薄く、主要部分は HTML、コンポーネントスコープ CSS、少量のブラウザ
スクリプトなので、Next.js App Router への移植は可能である。**TOYOTA Primitives は
Orca プロジェクトの表示ブランド**として扱い、prototype のロゴ、ブランド文言、ヒーロー
資産を移植する。一方、色、focus、spacing、component token と `@orca/react` は Orca 側を
正本にする。タイポグラフィだけは共有トークンとの区別を明確にするため、website 内に閉じた
独立 token file を設ける。

タイポグラフィ、余白、レイアウトの構成と実測寸法は prototype を忠実に再現する。ただし
タイポグラフィの raw value は専用 token file の一箇所だけに置き、利用側は必ずその token を
参照する。余白は Orca token へ対応付ける。レイアウトの構造値に対応 token がない場合は、
近似せず差分表を提示してユーザーに相談する。

## Target outcome

このプラン完了時に、現在存在する Orca のルート（`/`、`/get-started`、`/foundation`、
`/components`、`/components/[name]`）が次を満たすこと。

1. デスクトップは 48px ヘッダー + 80px グローバルレールを基準にし、セクション配下では
   240px セクションナビとドキュメント本文を組み合わせる。
2. 960px 以下ではデスクトップレールを消し、ヘッダー内メニューと現在地バーへ切り替える。
3. トップは黒いビジュアルヒーロー、職能別導線、Foundation / Components カードという
   プロトタイプの情報リズムと TOYOTA Primitives の表示ブランドを忠実に再構成する。
4. コンポーネント詳細は暗色ヒーロー、ページタブを置ける器、本文カラム、目次を置ける器を
   持つ。現時点で未実装の本文をプロトタイプから勝手にコピーしない。
5. 1440×900 と 375×812 の両方で横スクロールがなく、ナビゲーションの現在地、開閉状態、
   キーボード操作が成立する。

忠実に合わせる対象は、TOYOTA Primitives の表示ブランド、タイポグラフィの階層、余白、
レイアウト、レスポンシブ挙動である。次だけは意図的に一致させない。

- 実体のない Search、AI、フィードバック送信 UI は持ち込まない。
- prototype の Button 見本を CSS で再実装せず、コンポーネント見本は `@orca/react` を使う。
- prototype のページ本文、Changelog、Playground、URL 階層はこのプランでは移さない。
- リポジトリ名、package scope、import path は Orca のままにする。表示文言を移すために
  存在しない `@toyota/primitives` package を公開済みのように表示しない。

## Current state

### 正本と裁定ルール

2026-08-24 のユーザー裁定を、このプランの前提として固定する。

- 色、focus、spacing、component token は Orca を優先する。
- タイポグラフィは `apps/website` 内の独立 token file を正本にし、Orca shared token と
  名前・配置・import 経路を分ける。
- hero 513px と breakpoint 960px は website 固有の layout constant として隔離し、Orca
  shared token へ追加しない。
- TOYOTA のロゴとブランド文言は prototype から移植する。これは Orca が TOYOTA の
  プロジェクトであることをサイト上で表現するためで、内部 package 名の rename ではない。
- Search、AI、feedback は保留し、UI も実装しない。
- タイポグラフィ階層は website typography token、余白は Orca token で prototype を忠実に
  再現する。レイアウト構造値に対応する Orca token がない場合は、実装せず差分を示して
  相談する。

- ルート `CLAUDE.md:3-12` は `@orca/design-language` を原典、`@orca/token-pipeline` を
  トークン供給元、`@orca/react` を React 実装と定める。
- ルート `CLAUDE.md:22-24` は見た目について Figma を優先し、Figma / design-language /
  実装 / Storybook の齟齬を勝手に裁定しないよう要求する。
- prototype `ABOUT.md:35-44` は白、黒、`#f5f5f5`、現在地の `#eb0a1e`、十分な余白を
  トーンとして定義する。
- prototype `ABOUT.md:48-53` は Figma の実測、1440px / 375px 検証、既存デザイン言語の
  再利用、アクセシビリティ判断の維持を要求する。
- prototype `ABOUT.md:77-85` はブランドとアクセシビリティのトレードオフ、トークン変更、
  URL 設計を人間が裁定する事項としている。

したがって、この実装で採用する優先順位は次の通り。

1. Orca の design-language / token-pipeline / `@orca/react`: 色、focus、spacing、
   component token、意味、状態、コンポーネント仕様
2. prototype と、その `ABOUT.md:43-50` から参照される最新 Figma: TOYOTA Primitives の
   表示ブランド、website typography token、余白、レイアウト、レスポンシブ挙動
3. 現行 `apps/website`: Next.js のルート、データ取得、ビルド境界

この順序で解けない視覚差は STOP して、ユーザーまたはデザイナーに裁定を依頼する。

### 現行 Next.js サイト

- `apps/website/package.json:6-28` — Next.js 16.3、React 19.2、Tailwind 4、
  `@orca/react` / token-pipeline / component-meta を既に接続している。
- `apps/website/src/app/layout.tsx:17-36` — 56px ヘッダー、80px レール、本文、フッターの
  最小構成。モバイル分岐はない。
- `apps/website/src/components/nav-rail.tsx:22-95` — Home / Get started / Foundation /
  Components の4分類。prototype と分類が一致するので、情報設計を捨てず視覚を移せる。
- `apps/website/src/app/page.tsx:6-43` — ヒーローと Button 接続確認だけの暫定トップ。
- `apps/website/src/app/get-started/page.tsx:5-10` と
  `apps/website/src/app/foundation/page.tsx:5-10` — 本文は「準備中」。
- `apps/website/src/app/components/[name]/page.tsx:18-30` — component-meta と
  design-language からタイトルと説明を取得するが、Overview 本文は未実装。
- `apps/website/src/lib/component-pages.ts:17-32` — コンポーネント一覧の正本。ナビやカードは
  prototype の固定配列ではなく、この関数の返り値を使う。
- `apps/website/src/app/globals.css:1-24` — fontsource と生成トークンを import するが body の
  `font-family` を指定していない。実測では system-ui が使われている。

2026-08-24 のブラウザ実測:

| URL / viewport | 現行 Orca | prototype |
|---|---|---|
| `/`, 1440×900 | header 56px、rail 80px、単純な白背景 | header 48px、rail 80px、hero 513px |
| `/`, 375×812 | rail が残る、body 403px、main 295px | rail 非表示、body 375px、モバイルヘッダー |
| component detail, 1440×900 | 56px header + 80px rail + 56px sidebar | 48px header + 80px rail + 240px sidebar + 1120px hero |
| component detail, 375×812 | 専用構成なし | 45px 現在地バー、522px hero、59px tabs、本文 311px |

### prototype の移植元

- `src/styles/global.css:61-141` — サイト用色、フォント、タイプスケール、48 / 80 / 240px の
  レイアウト変数。共有トークンへ直接コピーせず、Step 1 の対応表を作る入力にする。
- `src/layouts/BaseLayout.astro:41-137` — ヘッダー、グローバルレール、セクションナビ、本文、
  フッター、モバイル分岐の全体構造。
- `src/components/SiteHeader.astro:16-176` — sticky 48px ヘッダーと 960px 分岐。
- `src/components/GlobalNav.astro:13-143` — 80px 固定レールと選択状態。
- `src/components/SectionNav.astro:28-203` — 240px セクションナビ、ページ / タブ / 目次の階層。
- `src/components/MobileNav.astro:14-106` と
  `src/components/MobileSectionBar.astro:25-112` — モバイルの2種類の開閉状態。
- `src/layouts/DocLayout.astro:40-114,278-495` — 暗色ヒーロー、タブ、本文、右目次、
  1200px / 960px ブレークポイント。
- `src/pages/index.astro:53-223,225-821` — トップのセクション構成とレスポンシブカード群。
- `src/components/DocSection.astro:10-47` — 文書セクションの見出しと縦リズム。

prototype は 15ページ、18コンポーネント、11個の `<script>` ブロック、約832KBの
ローカル資産で構成される。Astro Island を前提とする React コンポーネントは開発用
Agentation だけであり、視覚移植の障壁にはならない。インタラクションは Next 側で
必要な部分だけ小さな client component として書き直す。

### token と忠実度の既知の不一致

prototype は `global.css:64-89` で現在地色を赤 `#eb0a1e`、focus outline を青緑
`#0187a7` とする。一方、現行 Orca Light は
`packages/token-pipeline/tokens/variables/color-system.json:231-252` で Tertiary を
Cyan、`:675-696` で OutlineFocus を Toyota Red とする。**この差は Orca を優先する**と
ユーザーが裁定済みである。prototype の色を再現するために raw color やサイト限定 alias で
上書きしてはいけない。

spacing は現行 Orca に `--spacing-8: 32px`、`--spacing-12: 48px`、
`--spacing-16: 64px`、`--spacing-20: 80px`、`--spacing-60: 240px` があり、prototype の
主要寸法を exact に表現できる。

一方、タイポグラフィには既に具体的な差分がある。prototype の 32 / 18 / 16 / 14 / 12 /
11px は Orca に同じ size があるが、43 / 26 / 21 / 13px はない。また prototype の
Outfit / Noto Sans JP と IBM Plex Mono に対し、Orca の主要 typography token は
Noto Sans JP / Roboto である。この差は、**website typography を独立 token file に隔離して
prototype の値を再現する**とユーザーが裁定済みである。Orca shared typography token や
単に同じ px の legacy `doc-*` token へ混ぜない。

513px hero、960px breakpoint 等のサイト構造寸法にも、対応する Orca token は確認できない。
この差は、**513px と 960px を website 固有の layout constant に隔離する**とユーザーが
裁定済みである。その他の新しい raw 構造値が必要になった場合は、この裁定を自動的に
拡張せず相談する。

### 実装規約

- `apps/website/AGENTS.md` に従い、コードを書く前に
  `apps/website/node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`、
  `04-linking-and-navigating.md`、`05-server-and-client-components.md`、`11-css.md`、
  `13-fonts.md` の関連箇所を読む。学習済みの Next.js API を仮定しない。
- RootLayout とデータ取得は server component のまま保ち、`usePathname`、メニュー開閉、
  scroll spy の境界だけを `"use client"` にする。
- prototype の Astro scoped CSS は CSS Modules へ写像する。ページ固有の長い class 群を
  JSX の Tailwind utility 列へ機械的に展開しない。
- `@orca/react` の実装は token class を利用する。サイト側の見た目合わせのために
  `packages/react/**` を変更しない。
- 見た目だけの class 名、色、余白を JSDOM で検査しない。1440 / 375 のブラウザ比較で守る。
- unrelated な未追跡 `apps/website/.source/` はユーザーの既存ファイルとして保持し、
  add / delete / edit しない。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| prototype 状態 | `cd /Users/nagayama/src/github.com/orca-ds/web-prototype && pnpm astro dev status` | running または stopped が表示される |
| prototype 起動 | `cd /Users/nagayama/src/github.com/orca-ds/web-prototype && pnpm astro dev --background` | `http://localhost:4321` と PID が表示される |
| prototype 停止 | `cd /Users/nagayama/src/github.com/orca-ds/web-prototype && pnpm astro dev stop` | stopped が表示される |
| Website font deps | `pnpm --filter @orca/website add @fontsource/outfit@^5.1.0 @fontsource/ibm-plex-mono@^5.1.0` | package.json と lockfile が更新される |
| Website 起動 | `pnpm --filter @orca/website dev` | `http://localhost:3100`、Ready |
| Website build | `pnpm --filter @orca/website build` | exit 0、全ルート生成成功 |
| Website typecheck | `pnpm --filter @orca/website typecheck` | exit 0、エラーなし |
| Token drift | `pnpm tokens:check` | exit 0、生成差分なし |
| Repository gates | `pnpm build && pnpm typecheck && pnpm test` | 全 task 成功 |
| Changed files | `git status --short` | Scope 内 + `plans/README.md` のみ。既存 `.source/` はそのまま |

## Suggested executor toolkit

- ブラウザ操作が使える場合、localhost:4321 と localhost:3100 を別タブで開き、viewport を
  1440×900 / 375×812 に固定して比較する。
- Figma 接続が使える場合も、公式ページへ書き込まず、ABOUT.md:44 の該当ノードを
  read-only で実測する。
- Next.js の API は `apps/website/AGENTS.md` が指定する同梱ドキュメントを先に読む。
- Tailwind の custom variant / CSS Modules `@reference` は、公式
  `https://tailwindcss.com/docs/adding-custom-styles` と
  `https://tailwindcss.com/docs/functions-and-directives` の構文に従う。

## Scope

**In scope**（変更してよいもの）:

- `apps/website/package.json` — website 専用 font package の追加だけ
- `pnpm-lock.yaml` — 上記 dependency 追加の結果だけ
- `apps/website/src/app/globals.css`
- `apps/website/src/styles/typography.css`（新規）— website typography token の唯一の定義元
- `apps/website/src/styles/layout.css`（新規）— website layout constant の唯一の定義元
- `apps/website/src/app/layout.tsx`
- `apps/website/src/app/page.tsx`
- `apps/website/src/app/get-started/page.tsx`
- `apps/website/src/app/foundation/page.tsx`
- `apps/website/src/app/components/page.tsx`
- `apps/website/src/app/components/layout.tsx`
- `apps/website/src/app/components/[name]/page.tsx`
- `apps/website/src/components/**` — サイトシェル / ナビ / 文書プリミティブと CSS Modules
- `apps/website/src/lib/navigation.ts`（新規）
- `apps/website/src/lib/component-pages.ts` — 表示用情報の追加が本当に必要な場合だけ
- `apps/website/public/top-logo.svg`（新規）
- `apps/website/public/hero-logo.svg`（新規）
- `apps/website/public/footer-logo.svg`（新規）
- `apps/website/public/hero-visual.png`（新規）
- `apps/website/public/favicon.svg`（新規）
- `plans/README.md` — Status 更新だけ

**Read-only reference**:

- `/Users/nagayama/src/github.com/orca-ds/web-prototype/**`
- `packages/token-pipeline/**`
- `packages/react/**`
- `packages/design-language/**`

**Out of scope**（変更禁止）:

- `packages/token-pipeline/**` のトークン値・生成物
- `packages/react/**` と `packages/design-language/**`
- prototype リポジトリの全ファイル
- repository / package scope / import path の `orca` → `toyota` rename
- 存在しない `@toyota/primitives` package、URL、配布物を公開済みと見せる表示
- Search、AI assistant、feedback endpoint、MCP server の実装
- Fumadocs / MDX / CMS の導入
- `/get-started/designer`、`/foundation/color`、Playground、Changelog 等の新規ルート
- コンポーネント原典の本文レンダリング
- framework の変更、デプロイ設定の変更
- `apps/website/.source/**`

## Git workflow

- Branch: `feat/website-prototype-parity`
- 構造と見た目を分け、少なくとも「shell/responsive」「home」「doc shell」の論理単位で
  コミットする。
- コミットメッセージ例: `feat(website): プロトタイプ準拠のレスポンシブシェルを追加する`
- オペレーターの依頼がない限り push / PR 作成はしない。

## Steps

### Step 0: 視覚契約を固定し、差分表を作る

実装前に prototype を localhost:4321、現行 website を localhost:3100 で起動する。
次の4画面を同じ viewport で比較し、PR 本文または作業メモにスクリーンショットと実測値を
残す。

1. `/` at 1440×900
2. `/` at 375×812
3. prototype `/components/button` と website `/components/button` at 1440×900
4. 同じ詳細ページ at 375×812

次の対応表を埋める。右辺は推測せず、生成 CSS と Figma / prototype 実測から確定する。

| Website role | Prototype value | Mapping policy |
|---|---|---|
| base surface | `#fff` | `var(--color-surface)` |
| primary text / dark CTA | `#000` | 既存 Primary / OnSurface 系から選ぶ |
| secondary surface | `#f5f5f5` | SurfaceContainer 系から選ぶ |
| light divider | `#e8e8e8` | OutlineBright / Outline 系から選ぶ |
| current location | `#eb0a1e` | Orca Tertiary token を使う（見た目の差は裁定済み） |
| focus ring | `#0187a7` | Orca OutlineFocus token を使う（見た目の差は裁定済み） |
| body font | Outfit + Noto Sans JP | `--website-font-family-base` |
| code font | IBM Plex Mono | `--website-font-family-code` |
| type scale | 43 / 32 / 26 / 21 / 18 / 16 / 14 / 13 / 12 / 11px | `--website-font-size-*` の独立 scale |
| common spacing | 32 / 48 / 64 / 80 / 240px | `--spacing-8/12/16/20/60` |
| structural size | hero 513px / breakpoint 960px | website layout constant（裁定済み） |
| visible brand | TOYOTA Primitives + 3 logo SVG | prototype asset / wording を移植 |

TOYOTA Primitives の top / hero / footer logo と favicon を移植する。内部 package 名、repo 名、
import path は Orca のままにし、表示ブランドと技術識別子を混同しない。

513px hero と 960px breakpoint は website 固有値として承認済みである。これ以外の raw
structural value が必要になった場合だけ、用途と画面影響を示して追加承認を得る。

**Verify**: 差分表の全行に「exact Orca token」「website typography token」「Orca 優先の
裁定済み差分」「STOPして相談」のいずれかが記録されている。未裁定の raw value を実装して
いない。4画面の baseline がある。

### Step 1: website typography / layout token と視覚基盤を作る

`apps/website/src/styles/typography.css` を新設し、website 固有の typography token と font import
をここだけに集約する。共有 token と区別できるよう、custom property は必ず `--website-` で
prefix する。

- family: `--website-font-family-base`、`--website-font-family-code`
- weight: 400 / 500 / 600 / 700 を意味名付き property にする
- size: 43 / 32 / 26 / 21 / 18 / 16 / 14 / 13 / 12 / 11px を
  `--website-font-size-4xl` 〜 `--website-font-size-2xs` に対応付ける
- body metrics: `--website-line-height-body: 1.8`、
  `--website-letter-spacing-body: 0.25px`、
  `--website-font-feature-settings-base: "palt" 1`
- font files: Outfit 400 / 500 / 600 / 700、Noto Sans JP 400 / 500 / 600 / 700、
  IBM Plex Mono 400。Orca component typography 用の既存 Roboto import は維持する

`@fontsource/outfit` と `@fontsource/ibm-plex-mono` は `@orca/website` の dependency に追加し、
Google Fonts への runtime request は作らない。`globals.css` はこの専用 file を import し、
body に base family / size / line-height / letter-spacing / feature settings を適用する。
CSS Modules や TSX へ上記の font family / size の raw value を再記述しない。

`apps/website/src/styles/layout.css` も新設し、Orca spacing token で表現できる寸法の alias と、
承認済みの website 固有値をここだけに置く。

- `--website-header-height: var(--spacing-12)`（48px）
- `--website-rail-width: var(--spacing-20)`（80px）
- `--website-sidenav-width: var(--spacing-60)`（240px）
- `--website-home-hero-height: 513px`（承認済み website 固有値）
- `@custom-variant website-desktop` 内の `(width > 60rem)`（960px までは mobile、承認済み）
- mobile section bar は 44px content + border token の合計として表現できるか確認する
- surface / text / divider / current-location / focus は Orca semantic color token を直接参照する

CSS custom property は media query 条件には使えないため、breakpoint は `layout.css` の
Tailwind 4 custom variant として一度だけ定義する。各 CSS Module は `globals.css` を
`@reference` し、mobile-first の class 内で `@variant website-desktop` を使う。CSS Modules や
TSX に `960px` / `60rem` を再記述しない。長い utility class 列へ展開せず、responsive style も
各 module の class 内に留める。

続いて `apps/website/src/app/globals.css` で reset を整え、typography / layout file と既存の
Orca token CSS import を維持する。

website shell / page のフォント、size、line-height、letter-spacing は専用 typography token を
使う。`@orca/react` の内部 typography class は変更せず、Orca component token のまま保つ。

CSS Modules を次の責務単位で用意する（名前は統合してもよいが、責務を混ぜない）。

- `src/components/site-shell.module.css`
- `src/components/navigation.module.css`
- `src/components/doc-layout.module.css`
- `src/app/home.module.css`
- `src/app/section-index.module.css`

**Verify**:

- `pnpm --filter @orca/website typecheck` → exit 0
- browser console で `getComputedStyle(document.body).fontFamily` → Outfit が先頭
- browser console で body の font-size / line-height / letter-spacing → 16px / 28.8px / 0.25px
- `rg -n --glob '*.css' '43px|26px|21px|13px|Outfit|IBM Plex Mono' apps/website/src` →
  `src/styles/typography.css` 以外に token 定義の重複なし
- `rg -n --glob '*.css' '513px|960px|60rem' apps/website/src` →
  `src/styles/layout.css` 以外に定義の重複なし
- 960px では mobile layout、961px では desktop layout
- 375px で `document.documentElement.scrollWidth === window.innerWidth` → `true`

### Step 2: responsive site shell を Next の server/client 境界で実装する

prototype の `BaseLayout.astro`、`SiteHeader.astro`、`GlobalNav.astro`、`MobileNav.astro` を
次の Next コンポーネントへ写像する。

- `src/components/site-header.tsx` — TOYOTA Primitives top logo、任意 breadcrumb、mobile menu button
- `src/components/global-nav.tsx` — 4分類の desktop rail と pathname による現在地
- `src/components/mobile-navigation.tsx` — 960px 以下の drawer
- `src/components/site-footer.tsx` — TOYOTA Primitives footer logo 版へ更新
- `src/lib/navigation.ts` — serializable なグローバル分類、label、href、icon のみ

`RootLayout` は server component のまま保ち、pathname と開閉状態が必要な部品だけを client
component にする。`usePathname()` のために全 layout を client 化しない。メニューは最低限、
次を満たす。

- button に `aria-expanded` / `aria-controls`
- 開くと drawer が表示され、Escape、リンク選択、viewport が desktop に戻ったとき閉じる
- 開閉後の focus を toggle に戻せる
- desktop rail と mobile drawer を同時に accessibility tree へ露出しない
- dead Search button は置かない

既存の `nav-rail.tsx` は責務を `global-nav.tsx` へ移して削除してよい。TOYOTA の brand logo
は prototype asset を使う。ナビゲーションの UI icon は brand logo と別物なので、Orca の
既存 icon または prototype と同じ UI Kit icon を token color で描画する。

**Verify**:

- 1440px: header 48px、rail 80px、rail は viewport 下端まで固定、現在地に
  `aria-current="location"`
- 375px: desktop rail が `display:none`、menu button が表示、body scroll width 375px
- 375px: menu click → `aria-expanded="true"` + drawer visible、Escape → false + hidden
- `pnpm --filter @orca/website typecheck` → exit 0

### Step 3: トップページを prototype の構成で Orca データから再構成する

`src/app/page.tsx` を server component のまま保ち、prototype `src/pages/index.astro` の
視覚構成を次の順で再現する。

1. prototype の hero visual + TOYOTA Primitives hero logo + version/status + 2 CTA の dark hero
2. Designer / Engineer の persona cards
3. Foundation cards
4. Components preview cards
5. 実在する Resources のみ

`/Users/nagayama/src/github.com/orca-ds/web-prototype/public/hero-visual.png` と
`src/assets/{top-logo,hero-logo,footer-logo}.svg`、`public/favicon.svg` を対応する
`apps/website/public/` へコピーする。hero visual は装飾なので empty alt、logo はページ内の
可視文言と重複する箇所では `aria-hidden` + visually hidden text、単独の link では適切な
accessible name を付ける。表示文言は prototype の TOYOTA Primitives を採用するが、
存在しない package やリンクを追加しない。

Components preview は `componentPages()` の先頭 N 件など安定した明示ルールで生成し、
prototype の固定 `components` 配列をコピーしない。CTA は navigation なので `next/link` を
使い、button appearance が必要でも `@orca/react` の `<button>` を Link に偽装しない。
実コンポーネントの showcase だけ `@orca/react` を使う。

375px では hero を `calc(100dvh - header)`、CTA を縦並び、カードを1列にする。1440px では
hero 513px、persona 2列、Foundation / Components は利用可能幅に応じて2〜4列にする。

**Verify**:

- `/` at 1440×900: hero x=80、width=1360、height およそ513px、横スクロールなし
- `/` at 375×812: hero x=0、width=375、CTA 2件が縦並び、横スクロールなし
- すべてのカード link に可視 focus があり、リンク先は現存ルートまたは明示的な外部 URL
- `pnpm --filter @orca/website build` → exit 0

### Step 4: セクションナビと document shell を作る

prototype の `SectionNav.astro`、`MobileSectionBar.astro`、`DocLayout.astro`、
`DocSection.astro`、`OnThisPage.astro` を、次の構成へ移す。

- `src/components/section-nav.tsx` — desktop 240px section navigation
- `src/components/mobile-section-bar.tsx` — mobile current location + collapsible page list
- `src/components/doc-layout.tsx` — hero、optional meta / Figma link / tabs、本文、optional TOC
- `src/components/doc-section.tsx` — id、見出し、children
- `src/components/on-this-page.tsx` — TOC。scroll spy は TOC がある場合だけ hydrate

components セクションでは `componentPages()` を server 側で呼び、serializable な
`{name,title}` にして client navigation へ渡す。prototype の準備中 component 一覧は
コピーしない。`/get-started` と `/foundation` は現在ルートが1つしかないため、存在しない
子ページへの dead link は作らない。

`apps/website/src/app/components/layout.tsx` で components section nav を組み、
`[name]/page.tsx` では現存する title / description / source path を document hero と
placeholder body へ載せる。Overview 本文を prototype の Button ページからコピーしない。
将来 MDX / design-language renderer を `doc-layout` の children に差し込める境界にする。

モバイル current section bar は `aria-expanded`、outside click、Escape、anchor click で
閉じる。複雑な prototype の scroll-settle 再駆動ロジックは、実際に複数 section を持つ
本文が入るまでコピーしない。scroll spy は単純な IntersectionObserver で十分かを実測し、
着地不良が再現したときだけ別プランで扱う。

**Verify**:

- `/components/button` at 1440px: header 48px、rail 80px、sidenav 240px、hero は x=320
- 同 URL at 375px: desktop nav 2種が hidden、current section bar 45px、本文左右32px、
  right TOC hidden、横スクロールなし
- `/components/<存在しないname>` → 404 のまま
- `/components` の一覧件数と navigation 件数が `componentPages()` と一致
- `pnpm --filter @orca/website typecheck` → exit 0

### Step 5: accessibility と interaction を仕上げる

見た目を合わせる過程で prototype の既知 WCAG 例外を無断で持ち込まない。現在地、focus、
surface、text は Orca token を優先する裁定済みであり、prototype の raw color で上書きしない。
次をキーボードだけで確認する。

- skip link で `#main-content` へ移動できる
- header / global nav / section nav / page TOC の `aria-label` が重複せず役割を説明する
- current page は `aria-current="page"`、current global section は `location`
- menu と mobile section panel は Enter / Space で開閉し、Escape で閉じる
- focus indicator が暗色 hero、白 surface、`#f5f5f5` surface のすべてで見える
- 200% zoom と 320px CSS viewport でも操作要素と本文が欠けない
- motion は短く、`prefers-reduced-motion` で不要な transition / smooth scroll を抑える

Search / AI / feedback を表示したくなっても、この段階では追加しない。機能契約と送信先が
決まった後の独立 plan にする。

**Verify**: 上の keyboard checklist を 1440px / 375px の両方で完了し、browser console の
error が0件。`pnpm --filter @orca/website build` と typecheck が成功。

### Step 6: visual acceptance と repository gate を通す

Step 0 と同じ4画面で after screenshot を採る。比較時は以下を数値で記録する。

- header / rail / sidenav / mobile section bar の bounding rect
- `document.documentElement.scrollWidth` と `window.innerWidth`
- body の computed font family
- hero / doc content の left / width / height
- active nav の computed color と `aria-current`

差分は次の3分類にする。

1. **忠実に合わせる**: website typography token、spacing、layout、responsive behavior、カード密度、TOYOTA 表示ブランド
2. **Orca を優先**: color、focus、spacing / component token、実コンポーネント、design-language 由来情報
3. **裁定待ち**: 513px / 960px 以外で新たに必要になる website structural value、URL / content IA

見た目だけを理由に snapshot/JSDOM class test を追加しない。挙動に複数分岐を追加した場合も、
既存の website test harness がないため、新規 harness をこのプランへ持ち込まず browser の
state check で検証する。自動化が継続的に必要になった場合は、Playwright/VRT 導入を独立
plan にする。

**Verify**:

```bash
pnpm --filter @orca/website build
pnpm --filter @orca/website typecheck
pnpm tokens:check
pnpm build
pnpm typecheck
pnpm test
git diff --check
git status --short
```

期待結果: 全 command exit 0。token generated 差分なし。変更は Scope 内だけで、既存の
`apps/website/.source/` は未追跡のまま内容不変。

## Test plan

この作業の主対象は視覚なので、新規 JSDOM test は書かない。守るべき仕様は次の browser
behavior matrix と build gates で検証する。

| Viewport | Route | Essential assertions |
|---|---|---|
| 1440×900 | `/` | 48px header、80px fixed rail、513px hero、no horizontal overflow |
| 375×812 | `/` | rail hidden、menu opens/closes、hero/CTA/cards fit in 375px |
| 1440×900 | `/components/button` | 80px + 240px nav、active page、dark doc hero、optional TOC area |
| 375×812 | `/components/button` | 45px current bar、nav panel opens/closes、32px content inset、no aside |
| both | unknown component | Next 404 |

もし実装中に website の test harness が別作業で導入済みなら、見た目の class ではなく次の
状態分岐だけをその harness で検査する。

- global current route（`/` の完全一致と section prefix の分岐）
- mobile menu の `aria-expanded` と Escape close
- mobile section panel の current page / close behavior

## Done criteria

- [x] Step 0 の token / visual 差分表に未裁定項目がない。差分がある値はユーザー裁定を記録した
- [x] TOYOTA Primitives の top / hero / footer logo、favicon、表示文言が反映されている
- [x] repository / package scope / import path は Orca のままで、存在しない package / URL を表示していない
- [x] `@orca/react` / token-pipeline / design-language に変更がない
- [x] color と focus は Orca semantic token を使い、prototype の raw color override がない
- [x] typography の raw value は `src/styles/typography.css` だけにあり、website shell / page は
      `--website-*` token を参照している
- [x] spacing は Orca token 参照で、未承認の raw spacing value がない
- [x] 513px と 60rem は `src/styles/layout.css` だけにあり、960px では mobile、961px では
      desktop layout になる
- [x] `/` が prototype の hero + persona + Foundation + Components の情報リズムを持つ
- [x] `/components/[name]` が reusable document shell を使い、実データを表示する
- [x] 1440×900 と 375×812 の behavior matrix が全件成功
- [x] 375px で `document.documentElement.scrollWidth === window.innerWidth`
- [x] dead Search / AI / feedback controls がない
- [x] `pnpm --filter @orca/website build` と typecheck が exit 0
- [x] `pnpm tokens:check` が exit 0、生成差分なし
- [x] `pnpm build && pnpm typecheck && pnpm test` が exit 0
- [x] `git diff --check` が exit 0
- [x] Scope 外に新規変更がない。既存 `apps/website/.source/` は保持されている
- [x] before / after の4画面と既知の意図的差分がレビュー可能な形で残っている
- [x] `plans/README.md` の Plan 011 Status が更新されている

## STOP conditions

次のどれかに当たったら停止し、発見内容、対象 file / Figma node、推奨案を報告する。

- prototype と最新 Figma のタイポグラフィ、余白、寸法、構造が一致しない。
- prototype / Figma の typography が、専用 `typography.css` に固定した family / weight / size /
  line-height / letter-spacing では表現できない。
- prototype の実測 spacing value に対応する Orca token がない、または候補 token の値が
  異なる（未承認の近似値を作らず相談する）。
- 513px hero / 960px breakpoint 以外の raw structural value が必要になる。
- TOYOTA logo / hero asset の現物が prototype と Figma で一致しない。
- URL / IA 変更なしでは要求された見た目を成立させられない。
- `@orca/react` の公開 API や design-language を変えないとサイト shell を作れない。
- Fumadocs / MDX の別作業が同じ layout / route を先に変更している。
- Current state の route / component-pages / token 抜粋が drift している。
- 検証失敗を解くために Scope 外のファイル変更が必要になる。
- 同じ検証が合理的な修正後も2回失敗する。

## Maintenance notes

- prototype は完成コードの vendor source ではなく比較対象である。後日 prototype が更新されても
  自動同期せず、Figma と Orca の正本を含めて差分レビューする。
- website typography token は `src/styles/typography.css` だけで管理する。共有 Orca token と
  同じ property 名を使わず、CSS Modules へ raw typography value を分散させない。
- website の spacing alias は Orca token への名前付き参照に限る。承認済みの 513px hero と
  960px breakpoint は `src/styles/layout.css` だけに置く。その他の構造寸法を website 固有値に
  する必要が出た場合は、ユーザーの承認を記録してから同 file に隔離する。
- 将来の MDX / Fumadocs 導入は `doc-layout` の children と navigation data provider を置換し、
  shell CSS や responsive interaction を書き直さずに済む設計をレビューする。
- Search、AI、feedback、MCP は見た目だけ先に置かない。機能契約、データ送信、hosting が
  決まってから別コンポーネントとして追加する。
- VRT が必要になった場合は screenshot baseline の ownership、更新ルール、Figmaとの差の
  裁定者まで含む独立 plan にする。単純な class snapshot で代替しない。
- レビューでは 375px の横 overflow、sticky の積み重なり、focus / 現在地色が Orca token を
  参照していること、server/client boundary の広がりを重点的に見る。
