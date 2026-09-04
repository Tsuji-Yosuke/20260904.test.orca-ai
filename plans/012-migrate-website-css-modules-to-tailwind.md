# Plan 012: website のページスタイルを Tailwind ユーティリティへ統一する

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 8e2a688..HEAD -- apps/website plans/011-align-website-with-web-prototype.md`
> If an in-scope source file changed since this plan was written, compare the
> "Current state" below against the live code before proceeding. If the class
> ownership or visual baseline changed, stop and report instead of applying the
> mappings mechanically.

## Status

- **Priority**: P1
- **Effort**: M（実装 0.5〜1.5 日 + 視覚確認）
- **Risk**: MED（動作変更ではなくスタイル表現の移行だが、レスポンシブ差分を目視で検出する必要がある）
- **Depends on**: Plan 011（DONE）
- **Category**: tech-debt
- **Planned at**: commit `8e2a688`, 2026-08-24
- **Completed at**: 2026-08-24, PR #96
- **Review correction**: 数値 spacing utility は Tailwind の基準値を参照し、Orca の
  `--spacing-*` token を直接参照しないため、`p-[var(--spacing-8)]` 形式へ統一した。

## Why this matters

Plan 011 はプロトタイプの scoped CSS を CSS Modules へ移すことで見た目を再現したが、
`apps/website` と `@orca/react` が採用している Tailwind v4 から外れる理由はなかった。
今回の CSS Modules は合計 1,086 行あり、ページ固有の構造、状態、子孫セレクタを別ファイルへ
分離している。ページ固有性は JSX 内の Tailwind utilities でも保て、状態は `hover:`、
`aria-*`、`group-*` と `clsx` で表現できる。

この移行では見た目や動作を変更せず、スタイルの所有場所だけを JSX へ戻す。DOM を所有する
コンポーネントでは対象要素へ直接 utility を付け、子孫セレクタによる暗黙の DOM 依存を残さない。
タイポグラフィの raw value はユーザー裁定どおり website 専用ファイルに維持し、Tailwind の
theme variable として公開する。

## Target outcome

1. `apps/website/src/**/*.module.css` が 0 ファイルになり、CSS Modules import も残らない。
2. ページ、shell、navigation、card の見た目は JSX の Tailwind utilities が担う。
3. `typography.css` は font import、website 固有の raw typography token、Tailwind theme alias
   だけを持つ。タイポグラフィ値を JSX に直書きしない。
4. `layout.css` は website 固有 breakpoint/layout constant、custom variant、drawer animation
   だけを持つ。コンポーネントセレクタは置かない。
5. DOM を所有する箇所に子孫セレクタを作らない。`li`、`h2`、`h3`、`p`、`strong`、swatch は
   それぞれ自身の `className` でスタイルする。
6. 1440×900 と 375×812 の基準画面、mobile menu、section panel の見た目と挙動が
   Plan 011 完了時から変わらない。

## Current state

### Styling infrastructure

- `apps/website/src/app/globals.css:1-7` は Tailwind v4、生成済み Orca Tailwind tokens、
  `typography.css`、`layout.css` を読み込み、`packages/react/src` を source scan 対象にしている。
- `apps/website/src/styles/typography.css:12-42` は website 専用の font family、weight、size、
  line-height、letter-spacing を `--website-*` 変数として定義している。これは共有 Orca token
  へ移さない。
- `apps/website/src/styles/layout.css:1-14` は 60rem の `website-desktop` variant と、header、
  rail、sidenav、mobile section、hero の website 固有寸法を定義している。
- `packages/token-pipeline/generated/tailwind-tokens.css` は `bg-surface`、`text-tertiary`、
  `border-outline-dim`、`rounded-md`、`p-padding-lg`、`shadow-level-3` などの utilities を
  生成する。`p-8` などの数値 utility は Tailwind の基準 spacing なので、Orca の
  raw spacing scaleを忠実に使う箇所は `p-[var(--spacing-8)]` と明示する。この生成物は変更しない。
- `packages/react/src/ui/button.tsx:17-64` は、静的 utilities を空白区切りの文字列として置き、
  再利用する集合だけ配列 `.join(" ")` や定数へ分ける既存例である。website 側もこの粒度に
  合わせ、1回しか使わない構造 class を新しい抽象化へ隠さない。

### CSS Modules to remove

| File | Lines | Owners |
|------|------:|--------|
| `apps/website/src/app/home.module.css` | 375 | `app/page.tsx` |
| `apps/website/src/components/content-cards.module.css` | 117 | components / foundation / get-started index pages |
| `apps/website/src/components/document-shell.module.css` | 106 | `document-shell.tsx` |
| `apps/website/src/components/navigation.module.css` | 241 | global nav / section nav / components layout |
| `apps/website/src/components/section-index.module.css` | 61 | `section-index.tsx` |
| `apps/website/src/components/site-shell.module.css` | 186 | root layout / header / footer |

### Selector relationships that must not be reproduced as descendant CSS

- `home.module.css:186-192` (`.personaSteps li`) and
  `content-cards.module.css:71-76` (`.steps li`): put utilities directly on each mapped `<li>`.
- `home.module.css:217` (`.sectionHead .sectionHeading`): the heading inside `sectionHead` gets an
  explicit margin override; do not infer it from ancestry.
- `home.module.css:272` (`.typePreview strong`): put the weight class on `<strong>`.
- `home.module.css:276-284` (`.swatches > span` and `:first-child`): give every swatch the shared
  base class and use `first:ml-0` on the swatch itself.
- `content-cards.module.css:97-107` (`:first-child` and `.foundationItem p`): use `first:*` on each
  section and direct classes on its `<p>`.
- `document-shell.module.css:88-98` and `section-index.module.css:51-61`: remove generic heading/text
  descendants. The current callers own the rendered `h2`/`h3`/`p`, so they must style those nodes
  directly.
- `navigation.module.css:51-61`: use `group`/`group-hover` for the rail pill hover, and the already
  computed `active` boolean or `aria-current` variant for current state. Do not recreate
  `.railItem:hover .railPill`.
- `home.module.css:328-332`: express the stretched link with `after:absolute after:inset-0`; this is
  a pseudo-element variant on the element itself, not a descendant selector.

### State behavior that must remain unchanged

- `SiteHeader` closes the drawer on route change, Escape, and crossing to desktop; it restores focus
  after Escape and locks body scrolling while open.
- `SectionNavigation` closes on route change, outside pointer down, Escape, and link activation; it
  restores focus after Escape.
- `hidden` remains the source of truth for panel/drawer visibility. Existing global `[hidden]` behavior
  remains in place.
- `aria-current` and `aria-expanded` remain semantic state. Prefer Tailwind `aria-*` or
  `group-aria-*` when that removes a duplicate visual-state class without obscuring the markup.
- Do not change React state/effects while migrating classes.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Website typecheck | `pnpm --filter @orca/website typecheck` | exit 0, no TypeScript errors |
| Website build | `pnpm --filter @orca/website build` | exit 0; all current static routes generated |
| Token integrity | `pnpm tokens:check` | exit 0; generated token diff is empty |
| Repository build | `pnpm build` | exit 0 |
| Repository typecheck | `pnpm typecheck` | exit 0 |
| Repository tests | `pnpm test` | exit 0 |
| Patch hygiene | `git diff --check` | no output, exit 0 |

## Reference material

- Tailwind v4 theme variables and `@theme inline`:
  <https://tailwindcss.com/docs/theme#referencing-other-variables>
- Tailwind state, ARIA, group, and arbitrary variants:
  <https://tailwindcss.com/docs/hover-focus-and-other-states>
- Tailwind arbitrary values and custom properties:
  <https://tailwindcss.com/docs/adding-custom-styles#using-arbitrary-values>

## Scope

**In scope**:

- `apps/website/src/styles/typography.css`
- `apps/website/src/styles/layout.css`
- `apps/website/src/app/globals.css`
- `apps/website/src/app/layout.tsx`
- `apps/website/src/app/page.tsx`
- `apps/website/src/app/components/layout.tsx`
- `apps/website/src/app/components/page.tsx`
- `apps/website/src/app/components/[name]/page.tsx`
- `apps/website/src/app/foundation/page.tsx`
- `apps/website/src/app/get-started/page.tsx`
- `apps/website/src/components/global-nav.tsx`
- `apps/website/src/components/site-header.tsx`
- `apps/website/src/components/site-footer.tsx`
- `apps/website/src/components/section-navigation.tsx`
- `apps/website/src/components/document-shell.tsx`
- `apps/website/src/components/section-index.tsx`
- the six CSS Modules listed above (delete)
- `plans/README.md` and this plan's status only

**Out of scope**:

- Visual, copy, route, accessibility, interaction, or component API changes.
- `packages/token-pipeline/**`, `packages/react/**`, and generated token files.
- Search, AI, feedback, MCP, hosting, or framework migration work.
- Asset replacement or recompression under `apps/website/public/**`.
- Adding Tailwind plugins or runtime dependencies.
- Refactoring React effects, navigation data, or component page discovery.
- Replacing all global CSS resets. `globals.css` retains the global reset, theme, focus, and
  reduced-motion rules needed across the document.
- Adding JSDOM assertions for class names, colors, spacing, or layout. The repository instructions
  explicitly assign visual fidelity to Storybook/Figma/browser comparison, not CSS assertions.

## Git workflow

- Continue on `feat/website-prototype-parity`; this is a correction to draft PR #96, not a separate
  product change.
- Make one separate commit after all gates pass so review can distinguish the visual implementation
  from the style-system correction.
- Commit message: `WebサイトのスタイルをTailwindへ統一`
- Push the branch and keep PR #96 as draft until the visual comparison is accepted.

## Implementation rules

1. Use ordinary Tailwind utilities inline by default.
2. A utility string used once stays at its element. Do not create a semantic class merely to shorten JSX.
3. A genuinely identical group used multiple times in one component may become a local `const` string.
   Use the existing `BASE_CLASS` pattern in `packages/react/src/ui/button.tsx` as the reference.
4. Use `clsx` for actual dynamic branches. Do not retain `clsx` solely to mimic a CSS class name.
5. Do not add website-wide `@utility` recipes during the mechanical migration. First preserve the
   explicit utilities; extract a recipe later only when at least three call sites are demonstrably identical.
6. Keep exact token values. Prefer generated Orca semantic utilities (`bg-surface`, `border-sm`,
   `rounded-md`, `p-padding-lg`) where their semantics match. Prototypeの実測値をOrca raw spacingへ
   対応付ける箇所は `p-[var(--spacing-8)]` のように参照する。Tailwind既定の数値spacing
   utilityは、現在のpx値が一致してもtoken参照にはならないため使わない。
7. Do not replace website typography tokens with Tailwind defaults, even when the numeric value happens
   to match. Use the website-specific typography utilities introduced in Step 1.

## Steps

### Step 1: Publish website typography and motion constants to Tailwind

In `apps/website/src/styles/typography.css`, preserve all font imports and existing `:root`
`--website-*` raw tokens. Add a top-level `@theme inline` mapping so JSX can use named utilities:

- `--font-website-base` and `--font-website-code`
- `--font-weight-website-{regular,medium,semibold,bold}`
- `--text-website-{4xl,3xl,2xl,xl,lg,base,md,sm,xs,2xs}`
- `--leading-website-{solid,body,copy,tight}`
- `--tracking-website-{body,compact,number,eyebrow}`

Each alias must reference the existing `--website-*` variable via `var(...)`; do not duplicate raw
font names or numeric values inside `@theme inline`. This keeps typography independent from shared Orca
tokens while exposing `font-website-base`, `text-website-md`, `leading-website-tight`, etc.

In `apps/website/src/styles/layout.css`, retain `website-desktop` and all layout constants. Move the
existing `drawer-in` keyframes out of `site-shell.module.css` and expose only that motion through a
Tailwind `--animate-website-drawer-in` theme variable. Do not add component selectors.

**Verify**:

- `pnpm --filter @orca/website build` → exit 0 after at least one temporary use of every new namespace.
- Inspect the built CSS with `rg "font-website-base|text-website-4xl|animate-website-drawer-in" apps/website/.next`;
  each used utility appears in compiled output.

### Step 2: Convert the shared document shell and root site shell

Update `app/layout.tsx`, `site-header.tsx`, `site-footer.tsx`, `document-shell.tsx`, and
`section-index.tsx` to use Tailwind utilities directly and remove CSS Module imports.

- Preserve the exact header, rail offset, main flex layout, footer desktop/mobile switch, dark document
  hero, tabs, and content padding.
- Use `website-desktop:*` for every former `@variant website-desktop` declaration.
- Use typography utilities from Step 1 for all website font size/family/weight/leading/tracking values.
- Use `aria-expanded:bg-surface-container` for the menu button's open visual state. The hover state remains
  `hover:bg-surface-container`.
- Use `animate-website-drawer-in` on the drawer.
- Replace `visually-hidden` usages with Tailwind's `sr-only` where its semantics and layout are identical.
- Do not put `[&_h2]`, `[&_p]`, or a custom prose class on `DocumentShell`/`SectionIndex`. Remove those
  generic descendant rules and add direct text classes in their current callers during Step 4.

Only introduce a local string constant when a complete identical utility group is repeated in the same
file. Do not create `site-shell.ts` style registries.

**Verify**:

- `pnpm --filter @orca/website typecheck` → exit 0.
- `rg "site-shell\.module\.css|document-shell\.module\.css|section-index\.module\.css" apps/website/src`
  → no output.

### Step 3: Convert navigation and encode state at the owning element

Update `global-nav.tsx`, `section-navigation.tsx`, and `app/components/layout.tsx` and remove their
`navigation.module.css` imports.

- Global rail: mark each navigation link as a named or unnamed `group`; put `group-hover:bg-surface-container`
  on its pill. Apply current color/background with the already computed `active` boolean or ARIA variants.
  Current state must remain visible when hovered.
- Side navigation: use `clsx(base, active ? activeClasses : inactiveClasses)` if the active/inactive boxes
  have materially different structure. Keep the condition in the component; do not simulate it with a
  descendant selector.
- Mobile section toggle: use the button's `aria-expanded` as the state source. Either
  `group-aria-expanded:rotate-180` on the chevron or `clsx(open && "rotate-180")` is acceptable; prefer ARIA
  because the attribute already exists.
- Panel/drawer visibility continues to use `hidden`; do not replace it with duplicated `open ? "block"` logic.
- Preserve z-indexes 60/80/100/105 and sticky/fixed offsets exactly.

**Verify**:

- `pnpm --filter @orca/website typecheck` → exit 0.
- `rg "navigation\.module\.css" apps/website/src` → no output.
- In the browser, open/close both mobile controls, press Escape, navigate through an item, and cross the
  60rem breakpoint → behavior matches the Current state section.

### Step 4: Convert home and index content without descendant selectors

Update `app/page.tsx`, `app/components/page.tsx`, `app/components/[name]/page.tsx`,
`app/foundation/page.tsx`, and `app/get-started/page.tsx`.

- Translate every declaration from `home.module.css` and `content-cards.module.css` to the element that owns
  it. Preserve all responsive values and complex `calc()` values exactly.
- For shared home action link styles and repeated card bases, a local constant is allowed because the full
  group is duplicated in the same file. Keep visual variants at each link/card with `clsx`.
- Put list row utilities directly on mapped `<li>` elements.
- Put Foundation description utilities directly on its `<p>` and heading utilities directly on its `<h2>`.
- Put the component Overview heading and paragraph utilities directly in
  `app/components/[name]/page.tsx`; `DocumentShell` must not assume their element names.
- Put `first:*` on each repeated node instead of targeting it from a parent.
- Put the card stretched-link pseudo-element utilities directly on the link.
- Keep `@orca/react` `Button`; only pass the website font-family utility through `className`.

**Verify**:

- `pnpm --filter @orca/website typecheck` → exit 0.
- `rg "home\.module\.css|content-cards\.module\.css" apps/website/src` → no output.

### Step 5: Delete CSS Modules and trim globals

Delete all six `.module.css` files after their importers are converted. In `globals.css`, remove only global
helpers that have no remaining consumers after the migration, such as `.visually-hidden` if all call sites
use `sr-only`. Preserve reset, theme, body, global `:focus-visible`, skip link, `[hidden]`, and
reduced-motion behavior unless an exact Tailwind replacement is already applied at its sole owning element.

Do not move component CSS into `globals.css`, `typography.css`, or `layout.css` to satisfy the zero-module
check. Those files remain infrastructure, not a second component stylesheet.

**Verify**:

- `find apps/website/src -name '*.module.css' -print` → no output.
- `rg "\.module\.css|styles\.[A-Za-z]|cardStyles\." apps/website/src` → no output.
- `rg -n '^\.[A-Za-z].*\{' apps/website/src/styles apps/website/src/app/globals.css` may report only
  intentionally retained global helpers such as `.skip-link`; it must not report page/component classes.
- `git diff --check` → no output.

### Step 6: Run visual and repository verification

Before conversion, capture baseline screenshots from commit `8e2a688`. After conversion, capture the same
routes and viewport sizes:

| Route | Desktop | Mobile | Interaction |
|-------|---------|--------|-------------|
| `/` | 1440×900 | 375×812 | links hover/focus |
| `/get-started` | 1440×900 | 375×812 | — |
| `/foundation` | 1440×900 | 375×812 | anchor scroll |
| `/components` | 1440×900 | 375×812 | rail/current state |
| `/components/button` | 1440×900 | 375×812 | menu + section panel |

Compare at minimum: header 48px, desktop rail 80px, section navigation 240px, home hero 513px on desktop,
full-height mobile hero, typography, card grids, borders, colors, footer switching, horizontal overflow,
current/hover/focus states, and drawer/panel layering. No intentional visual delta is allowed. If a Tailwind
utility resolves differently from the original declaration, correct the mapping instead of accepting an
approximation.

Then run, in order:

1. `pnpm --filter @orca/website build`
2. `pnpm --filter @orca/website typecheck`
3. `pnpm tokens:check`
4. `pnpm build`
5. `pnpm typecheck`
6. `pnpm test`
7. `git diff --check`

All commands must exit 0. The existing dynamic filesystem tracing warning from `component-pages.ts` may
remain; no new warning attributable to this migration is acceptable.

### Step 7: Commit and update the existing draft PR

Confirm `git diff --stat` contains only the in-scope source files, deleted CSS Modules, and plan status.
Update this plan and `plans/README.md` to `DONE`, commit with
`WebサイトのスタイルをTailwindへ統一`, push `feat/website-prototype-parity`, and add a short PR comment
summarizing:

- six CSS Modules removed;
- website typography tokens retained in their independent file and exposed to Tailwind;
- descendant selectors eliminated in favor of classes on owned elements;
- visual comparison viewports and verification commands completed.

## Test plan

No new automated test is required. This change does not alter domain rules or state transitions, and JSDOM
class assertions would only mirror implementation details without validating layout. Preserve existing
behavioral tests and use the browser comparison in Step 6 for visual regression detection.

If implementation accidentally changes menu or section-panel state behavior, stop the migration and restore
the existing React logic. Do not add new tests merely to justify that accidental refactor; state refactoring is
out of scope.

## Implementation result

- 6つの CSS Modules（合計 1,086 行）を削除し、各DOMを所有する JSX へ Tailwind utilities を
  直接配置した。ページ／コンポーネント用セレクタはグローバルCSSへ移していない。
- website 固有の typography raw token は `styles/typography.css` に維持し、`@theme inline` の
  alias を通して Tailwind utilities から参照するようにした。drawer animation と website layout
  constant は `styles/layout.css` に維持した。
- commit `8e2a688` の旧CSS Modules版と、`/`、`/get-started`、`/foundation`、`/components`、
  `/components/button` を 1440×900 / 375×812 で比較した。主要矩形と computed style のDOM全体比較で
  差分はなく、mobile menu と section panel の Escape、outside click、focus return、breakpoint、
  body scroll lock も維持されていることを確認した。
- `pnpm test`、website typecheck、website の Webpack production build、website を除く全packageの
  typecheck、`pnpm tokens:check`、`git diff --check` は成功した。
- この実行環境では Turbopack production build が PostCSS worker 用プロセスの port bind を
  `Operation not permitted (os error 1)` で拒否される。これはソースエラーではなく実行環境制約で、
  `next build --webpack` では全20 static routesの生成まで成功している。

## Done criteria

- [x] `find apps/website/src -name '*.module.css' -print` returns no output.
- [x] `rg "\.module\.css|styles\.[A-Za-z]|cardStyles\." apps/website/src` returns no output.
- [x] No component/page selector has been moved into `globals.css`, `typography.css`, or `layout.css`.
- [x] Typography raw values remain only in `styles/typography.css` and are consumed through named Tailwind
      theme aliases, not duplicated in JSX.
- [x] Existing Orca token utilities are used for color, focus, spacing, border, radius, and elevation wherever
      generated utilities exist.
- [x] No descendant-selector replacement is introduced for markup owned by the same component.
- [x] Baseline and after browser comparisons match at the five routes and two viewport sizes in Step 6.
- [x] Mobile menu and section panel retain open, close, outside/Escape, route-change, breakpoint, focus-return,
      and body-scroll behavior where applicable.
- [x] Website typecheck and Webpack production build exit 0; Turbopack production build is blocked only by
      the runner's port-bind restriction recorded above.
- [x] `pnpm tokens:check`, non-website package typechecks, `pnpm test`, and `git diff --check` exit 0.
- [x] A separate correction commit is pushed to draft PR #96.

## STOP conditions

Stop and report instead of improvising if:

- A visual value cannot be expressed using an existing Orca token utility, a website typography utility,
  or the already-approved website layout constants without changing the computed value.
- Tailwind class ordering makes active/current state lose to hover and the issue cannot be resolved with a
  simple conditional class or documented variant.
- Converting a descendant selector requires changing the public API of a shared component beyond adding a
  direct `className` at an existing caller.
- Any change under `packages/token-pipeline/**` or `packages/react/**` appears necessary.
- A baseline screenshot cannot be reproduced from `8e2a688`, or the current branch has visually relevant
  uncommitted changes besides the known untracked `apps/website/.source/` directory.
- Visual parity requires a new raw typography, spacing, or layout value. Report the exact existing value,
  proposed value, element, route, and viewport for user adjudication.

## Maintenance notes

- Review should focus on computed-style equivalence, not whether utility strings are aesthetically short.
- Inline utilities are the default ownership mechanism. A future custom utility should be introduced only
  for a stable, genuinely repeated recipe, not for a one-off page region or to recreate CSS Module names.
- Keep `typography.css` website-local unless a later design-system decision explicitly promotes those tokens
  into `@orca/token-pipeline`.
- Keep the `website-desktop` breakpoint aligned with `--website-breakpoint-desktop`, because `SiteHeader`
  reads that custom property in JavaScript to close the drawer when crossing to desktop.
