> 注: この文書は独立リポジトリ時代の実装計画を保存したものです。コマンドと Workflow のパスは
> 現在の `packages/figma-linter-plugin` およびルートの `CLAUDE.md` を優先してください。

All ground truth confirmed, and the judges' gap-6 (false-premise) finding is verified true: the `(deprecated) Dimension` collection's top segments are `Padding`, `Border radius`, `Border`, `Icon stroke width` — it has ZERO `Sizing/*` or `Spacing/*` paths. So the "names span Reference AND deprecated" rationale is factually false; the real ambiguity is structural (two raw-float collections). The drift delta matches: `Radius/md`→`Sizing/sm` (table says `Sizing/2xl`), `Radius/2xs` absent (ghost), `Radius/3xl`/`Padding/3xs`/`Padding/3xl` present (adds), `Margin/none`→`Spacing/0`.

I have everything verified. Producing the full improved plan.

---

# Winning Plan: Figma Collection as Master via Generated Token Artifact + Two-Tier Reset Anchor

## 0. What I verified against ground truth (re-checked live this session; corrections from prior drafts flagged ⚠FIXED)

Run against `/Users/yahiro/Downloads/common/6:17/export.json` (84,471 bytes) and `src/main/code.ts` (1142 lines):

- **12 collections, name is the object KEY (no `name` field).** Confirmed live: the export is a 12-element array where each element is `{ "<CollectionName>": { modes: {…} } }`. `"name" in el` is `false` for all 12; `Object.keys(el)[0]` IS the collection name. Indices: 0 `(deprecated) Dimension`, 1 Color References, 2 Color System, 3 Corporate, 4 Dimension Reference, 5 Dimension System, **6/7 both `Expressive`**, **8/9 both `Productive`**, 10 Typography References, 11 Typography System. **The generator MUST iterate array elements and read `Object.keys(el)[0]`; it must NOT name-key into an object/Map, or one of each duplicate preset pair is silently dropped** (resolves gaps 8 & 11). Dedup-by-name is forbidden.
- **Mode keys non-uniform** (per-collection selection mandatory; there is no universal mode name). Confirmed live: Dimension System → `Default` (single). Dimension Reference → `Mode`. Typography References → `Value`. Typography System → `JP`/`EN`. Color collections → `Light`. `(deprecated) Dimension` → `Mode 1`. Preset pairs → `Default` (dim-parent: indices 6/8) and `JP`/`EN` (typo-parent: indices 7/9).
- **`$type` values are LOWERCASE in this export: `"float"`, `"color"`, `"string"`.** Confirmed live: Dimension System leaf type histogram = `{"float":37,"string":1}`; the one string is `{path:"mode", value:"expressive"}`. The Variables API live path uses UPPERCASE `resolvedType` (`"FLOAT"`/`"STRING"`/`"COLOR"`) and `value.type === "VARIABLE_ALIAS"`. **The shared core must normalize case at each adapter boundary**, not assume one casing. Alias values in the export are dotted strings, e.g. `Sizing/Component/Full/sm → "{Sizing.5xl}"` (confirmed).
- **⚠FIXED — `$type` is NOT a reliable alias-vs-raw discriminator in the export.** Confirmed live: the `Label/font-family` leaf has `$type:"string"` but `$value:"{FontFamily.JP}"` (a dotted ALIAS). So a leaf's *encoding* (dotted-`{…}` string) — not its declared `$type` — is the source of truth for "is this an alias." **`fromExport` must classify a leaf as an alias iff `typeof $value === "string" && /^\{.+\}$/.test($value)`, regardless of `$type`; raw floats are `typeof $value === "number"`.** The plan's alias-purity assertions and `TYPO_SYS_ALIAS` filter rely on this, not on `$type`.
- **Proven drift, EXACT and isolated:** diffing `DEFAULT_SYS_ALIAS` (code.ts:614-657) against the export's Dimension System aliases yields **11 retargeted, 3 added, 1 ghost**, and **drift is confined entirely to `DEFAULT_SYS_ALIAS`.** `DEFAULT_TYPO_SYS_ALIAS` (15 entries) and `DEFAULT_REF_SIZING` (17 entries) are byte-identical to the export (0 diffs each). Spot-verified this session: `Sizing/Radius/md → Sizing/sm` (table says `Sizing/2xl`), `Sizing/Radius/2xs` ABSENT (ghost), `Sizing/Radius/3xl → Sizing/4xl` (add), `Spacing/Padding/3xs → Sizing/2xs` (add), `Spacing/Padding/3xl → Sizing/8xl` (add), `Spacing/Margin/none → Spacing/0`, `Spacing/Padding/2xs → Sizing/xs` (table says `Sizing/2xs`). Exact delta:
  - **Retargeted (11):** `Sizing/Component/Half/sm` lg→xl, `…/md` xl→2xl, `…/lg` 2xl→3xl; `Sizing/Radius/xs` xs→2xs, `…/sm` sm→xs, `…/md` 2xl→sm, `…/lg` 4xl→md, `…/xl` 2xl→lg, `…/2xl` 4xl→2xl; `Spacing/Padding/2xs` 2xs→xs, `…/xs` xs→sm.
  - **Added (3):** `Sizing/Radius/3xl`→`Sizing/4xl`, `Spacing/Padding/3xs`→`Sizing/2xs`, `Spacing/Padding/3xl`→`Sizing/8xl` — all DO exist in this export.
  - **Ghost (1):** `Sizing/Radius/2xs` (in table, gone from export/live).
  - **Reset today corrupts the design** by writing 11 stale targets + the ghost and silently skipping the 3 new tokens.
- **Dual scale in Dimension Reference: 53 floats = `Sizing/*` (17) + `Spacing/*` (36).** Confirmed live (`DimRef tops: {"Sizing":17,"Spacing":36}`). `SHIPPED_BASE` (scalable set) = the 15 t-shirt `Sizing/*` minus `none`/`full`. "All FLOATs minus sentinels" would wrongly sweep 36 `Spacing/N` into the scalable base — confirmed landmine.
- **Sentinels: `Sizing/none`=0, `Sizing/full`=99999, `Spacing/0`=0** (`SWAP_SENTINELS = new Set(["Sizing/none","Sizing/full","Spacing/0"])`, code.ts:825). Two tokens have value 0 → value-only detection ambiguous; sentinels MUST be name-anchored. `Spacing/0` exists (=0); `Spacing/Margin/none → {Spacing.0}` resolves.
- **Swap candidate set is a FLAT list shared by every group — there is NO "band" today.** RE-CONFIRMED live (code.ts:858-878): `options` is built once as every Reference `FLOAT` whose name `startsWith("Sizing/")` and is not a sentinel (the 15-token scalable set), sorted by value; then the SAME `options` array is attached to EVERY dimension group (code.ts:910). `lib/swap.ts` offset-shifts against that flat list. **Any "scale band" wording is wrong and is removed** (resolves gap 1, see §2 candidate rule).
- **`section` is derived per-GROUP from the System leaf-name prefix, not the collection.** RE-CONFIRMED live (code.ts:908): `section: /^Spacing\//.test(sysName) ? "spacing" : "sizing"`. The generator must key section per-group off the System leaf-name prefix (resolves gap 16a).
- **⚠FIXED — UI display order is decoupled from group iteration today, via three hardcoded `filter` blocks.** RE-CONFIRMED live: `TokenPanel.tsx` (175 lines) does NOT loop over a derived tuple — it hardcodes `groups.filter(g => g.section==='spacing')` then `'sizing'` then `'typography'` (lines 136-138) and renders three fixed `<Subsection title="Spacing"/Sizing/Typography">` blocks **in that literal order** (lines 150/157/164). So **today's display order is `[spacing, sizing, typography]` and is independent of `DEFAULT_SYS_ALIAS` iteration order.** A naive Stage-3 `SECTION_IDS.map(...)` rewrite WOULD couple display order to the generator's first-encounter order over `DEFAULT_SYS_ALIAS`, which hits `Sizing/Radius/*` first → would emit `[sizing, spacing, typography]` and **silently reorder the UI.** Resolved by pinning a hand-authored `SECTION_DISPLAY_ORDER` tuple + an assertion test (§1.6, §3 Stage 3; resolves gap 16/SECTION_IDS-ordering).
- **`runMutation` is a single-flight re-entry guard** (code.ts:25-37): if `mutating` it `figma.notify`s and returns without posting an error; `reset-defaults` runs inside it (code.ts:70-72). A blocking confirm mid-mutation would have to release/re-acquire this flag — the plan instead does the confirm UI-side BEFORE sending (resolves gap 4, see §3 Stage 4).
- **⚠FIXED — `resetSizingDefaults`/`resetTypographyDefaults` iterate the TABLE KEYS unconditionally and resolve targets by NAME, silently skipping on miss.** RE-CONFIRMED live: `resetSizingDefaults` (code.ts:718-733) does `for (const [name, targetName] of Object.entries(DEFAULT_SYS_ALIAS))`, looks up `refByName.get(targetName)`, and `if (!variable || … || !target) continue` — so (a) reset writes the **entire** anchor alias graph every time (all-or-nothing; there is no per-token retarget-vs-anchor branch today), and (b) **a renamed Reference target silently drops** (`!target → continue`), producing a partial restore reported as success. `resetTypographyDefaults` (code.ts:781-790) has the identical structure over `DEFAULT_TYPO_SYS_ALIAS`. This is the root of gaps 1 and 15; both are resolved by §1.7's explicit write semantics + identity-by-id anchor + reconciliation pass.
- **`resetSizingDefaults` builds `refByName` over the FULL Reference collection** (`mapVariablesByName(reference)`, code.ts:717), so `Spacing/Margin/none → {Spacing.0}` and all `Spacing/*` targets resolve. There is no "Sizing-only lookup" bug; the real bugs are stale table data (gap-1 corruption) and name-based resolution (gap-15 rename fragility).
- **`resetDefaults` clears `ACTIVE_PRESET_KEY` before writing** (code.ts:579, `storeActivePreset("")`). This is why the §1.3 Adopt gate must NOT lean on the active-preset record alone (resolves gap 12 — the active-preset half of the gate is dropped to advisory; alias-purity does the real work).
- **`sendPresets` is already 100% live-driven; I read it (code.ts:174-206).** It calls `classifyCollections()`, takes the LIVE `extensions` (Extended Collections whose `parentVariableCollectionId` ∈ the System-layer parents, code.ts:155-161), groups them by `ext.name.trim().toLowerCase()` (so the two same-name `Expressive`/`Productive` collections fold into one preset whose `collectionIds` holds BOTH ids), and posts `{presets, activeId}`. `applyPreset` (code.ts:313-394) resolves each ext's `parentVariableCollectionId`, maps `ext.modes`→parent modes via `parentModeId` (code.ts:273-275 / 350-353), and flattens override values into the parent. **The export carries 0 preset leaves and no parent linkage** — confirmed live: `Expressive[6]`/`Expressive[7]`/`Productive[8]`/`Productive[9]` all have `leaves=0`, modes `Default` (dim-parent) and `JP/EN` (typo-parent). So presets are structurally unrepresentable from the export and are 100% live — and `fromLive`'s preset derivation IS the existing `classifyCollections` + `sendPresets` logic, unchanged (resolves gap "preset derivation never grounded": §3 Stage 2 cites these exact handlers/lines and routes presets through them, not through `deriveSchema`'s alias core).
- **Typography System [JP] = 30 leaves**: 15 `/FontSize` (`{FontSize.*}`), 4 `…/FontFamily` + **1 `Label/font-family`** (`{FontFamily.JP}`, encoded as `$type:"string"` but a dotted alias — see ⚠FIXED above), 5 `/FontWeight`, 5 `/LetterSpacing`. So `path.endsWith("/FontSize")` is the *only* thing separating FontSize from other leaves — the filter is load-bearing.
- **Naming anomaly: `Label/font-family`** (lowercase, hyphenated) sits beside the 4 `Display/Headline/Title/Body` `…/FontFamily`. `endsWith("/FontSize")` correctly excludes it; any *role-keyed* derivation would trip on it. Key the typo map by the `/FontSize` suffix, never by reconstructing role names.
- **EN/JP:** FontSize aliases are byte-identical across JP/EN (15 each). FontFamily differs (`{FontFamily.JP}` vs `{FontFamily.EN}`). `resetTypographyDefaults` writes to all `typographySystem.modes` (JP+EN) but iterates ONLY `DEFAULT_TYPO_SYS_ALIAS` keys (all `/FontSize`) → touches zero FontFamily/FontWeight/LetterSpacing → JP fonts never overwritten. Mechanized invariant (test below).
- **Typography References = 20 leaves: 11 `FontSize/*`, 2 `FontFamily/*` (string), 2 `FontWeight/*` (string), 5 `LetterSpacing/*` (float).** `REF_FONT_SIZE` = 11 entries (matches `SHIPPED_FONT_SIZE` exactly), NOT 16. `DEFAULT_TYPO_SYS_ALIAS` is a separate 15-entry table (5 roles × 3 sizes in Typography System).
- **`(deprecated) Dimension`**: 32 raw-float leaves; marker `廃止_` is the **leaf-name (last-segment) prefix** (`Padding/廃止_0`), confirmed 32/32. **⚠FIXED — its top segments are `Padding`, `Border radius`, `Border`, `Icon stroke width`; it has ZERO `Sizing/*` or `Spacing/*` paths** (verified live: `deprecated has Sizing/*? false Spacing/*? false`). So the prior "`Sizing`/`Spacing` names span Reference AND deprecated" rationale is FACTUALLY FALSE and is corrected (resolves gap 6/false-premise): the real ambiguity between Dimension Reference (53 raw float) and `(deprecated)` (32 raw float) is **purely structural** (two raw-float collections), disambiguated by a **name-deny-list**, not by a path-name collision. **Corporate**: 0 tokens (confirmed live).
- **Color System has 8 raw COLOR leaves** + 40 aliases; Color References 83 raw color. Out of scope, but generator/classifier must tolerate raw-in-System without choking.
- **tsconfig: TWO configs.** Root (`include: ["src/ui","src/shared"]`) and `src/main/tsconfig.json` (extends root, `include: ["./","../shared"]`, `@figma/plugin-typings`). Both `verbatimModuleSyntax:true`, `isolatedModules:true`, `noUncheckedIndexedAccess:true`, strict. **`resolveJsonModule` is NOT set.** A generated **`.ts`** under `src/shared/` is in scope for BOTH configs and the correct choice (sidesteps `resolveJsonModule` + verbatim friction).
- **`pluginData` used in exactly ONE place: `figma.root` `setPluginData`/`getPluginData(ACTIVE_PRESET_KEY)`** (code.ts:407/416). No filesystem in the sandbox. Governs the Adopt-from-live decision (§1.2, §5.2). Practical pluginData ceiling ≈100KB/entry — the snapshot must be size-bounded and version-tagged (§5.2; resolves gap 17).
- **`messages.ts`** (read in full, 140 lines): `ScaleGroup='base'|'font-size'`, `ResetDomain='size'|'typography'`, `SwapperSection='spacing'|'sizing'|'typography'`. **`SwapperGroup.label` already exists (non-optional, line 97), `SwapperStep.step` already exists (line 83).** Only union to loosen is `SwapperSection`. Init messages: `get-collections`/`get-presets`/`get-base-tokens`/`get-swapper-groups`.
- **No test runner** (only Storybook). One CI workflow: `.github/workflows/release.yml` — triggers **only on push to main**, runs typecheck+build. **There is no `pull_request` trigger today** (resolves gap 6/CI — Stage 1 ADDS a `pull_request`-triggered job so drift is blocked on the PR, not post-merge).
- **Duplication surface:** heavy schema duplication is **code.ts tables + `.storybook/fixtures.ts`** (FontSize/Sizing value tables + `sampleSwapperGroups`). `App.tsx`/`RangeSlider.tsx`/`lib/swap.ts`/`*.stories.tsx` are mostly comments + section-id strings, not duplicated token tables. Stage 3's UI-dedup payoff is smaller than "4 places"; the real consolidation is code.ts + fixtures. **`TokenPanel.tsx` has NO generic section loop** — hand-written `<Subsection>` blocks with fixed titles; Stage 3 is a render-loop rewrite + a section→title map + a pinned display-order tuple (resolves gap 16b, see §3 Stage 3).

---

## 1. Chosen architecture and the central-dilemma answer (resolved once, consistently, across all stages)

**Backbone:** *Live-derived structure + a committed generated snapshot as the reset anchor*, generated as `.ts` (not `.json`) to avoid `resolveJsonModule`.

Two masters, split strictly by **data availability** — made non-contradictory by the rules in §1.3–§1.7:

| Concern | Master | Why |
|---|---|---|
| **What the file currently IS** (token lists, System→Reference alias map, swapper groups/options, preset linkage, classification) | **LIVE Variables API**, derived at runtime per read | Correct-by-construction; the 11/3/1 drift becomes structurally impossible. Presets only exist live (export carries 0 preset leaves + no `parentVariableCollectionId`). |
| **What reset RESTORES to** (Reference raw values + System→Reference alias graph + sentinels + section/group structure) | **Committed generated `.ts` snapshot** (`src/shared/tokens.generated.ts`), overridable by a gated pluginData snapshot | Once a designer scales/swaps, the shipped state is gone from live. The baseline must be stable, diffable, code-reviewed — OR a deliberately-captured, version-tagged local override. |

### 1.1 Why generated `.ts` not `.json`
`resolveJsonModule` is off and `verbatimModuleSyntax` is on. A typed `.ts` module (`export const … as const`) gives compile-time exhaustiveness (loosened unions stay checked via `typeof X[number]`), bundles through esbuild with zero config, and satisfies BOTH tsconfigs (it lives in `src/shared`, in scope for root and `src/main`).

### 1.2 The reset baseline lives in TWO tiers — and the second tier is REQUIRED, not optional (resolves gaps 1 & 7)
The user's literal loop is "I edit Figma, it keeps up with zero source changes." Live derivation delivers that for all observable structure. But the reset anchor cannot be re-derived from a mutated live file. So:

- **Tier A — committed `tokens.generated.ts`** (seed + CI-diffable record). Produced by `node scripts/gen-tokens.mjs <export.json>`. The engineer / re-export path.
- **Tier B — a `figma.root` pluginData snapshot** written by an in-plugin **"Adopt current Figma as baseline"** action. The non-engineer re-anchor path — the ONLY mechanism that moves the reset target with zero terminal access.

**At reset time, the anchor is: pluginData snapshot if present AND valid (§5.2 validity predicate), else the committed `tokens.generated.ts`.** Tier B is promoted to a **Stage 1 requirement**, the keystone of "Figma is master."

I explicitly own the tradeoff the prior plan tried to dodge: the pluginData snapshot is undiffable. Acceptable *because* Tier A (committed file) remains the reviewable record and the snapshot is a per-file override, not canonical history. CI diffs Tier A; the drift banner reconciles Tier B (§5).

### 1.3 WHEN "Adopt from live" is permitted — the rule that makes Tier B safe (resolves gaps 12 & 13; baseline corrected per §1.3.2-fix)
"Adopt from live" captures the current alias graph. If a designer scaled (baked raw values) or swapped (retargeted aliases) and *then* adopts, the snapshot captures the mutated state, destroying recoverability. Adopt is therefore **gated**, with THREE conditions — the prior two-condition gate is replaced because the active-preset record is cleared by reset (code.ts:579) and is misleading on its own (resolves gap 12):

> **Adopt-from-live is permitted ONLY when ALL hold:**
> 1. **Alias-purity (the real gate):** for every System variable, read `valuesByModeForCollectionAsync`; assert every value is a `VariableAlias`, none is a number (no scaling residue). This is the load-bearing check. Implemented against the live encoding (`value.type==="VARIABLE_ALIAS"`), the dual of `fromExport`'s dotted-`{…}` test.
> 2. **No-retarget-vs-EFFECTIVE-ANCHOR (resolves gaps 7 & the §1.3.2-baseline gap):** compare the live alias graph to **the current effective reset anchor** (= valid Tier-B snapshot if one exists, else committed Tier-A) — NOT to Tier-A unconditionally. Adopt accepts **ADD** (a live token absent from the effective anchor) and **RENAME**, but **REFUSES a pure RETARGET** of an existing token unless the user explicitly confirms a second "yes, capture retargets" affordance. **Why effective-anchor, not Tier-A:** after a first Adopt that captured an ADD, the user's mental baseline IS Tier B; comparing against stale Tier-A would re-flag the already-adopted ADD as a delta on every subsequent Adopt and anchor the swap-laundering check to a stale reference (the exact noise the judge flagged). Comparing against the effective anchor means a second Adopt sees only changes *since the last Adopt*, so legitimately-captured ADDs are silent and only genuinely-new retargets trip the gate.
> 3. **Active-preset advisory (NOT a hard gate):** if `ACTIVE_PRESET_KEY` is non-empty, surface a warning ("a preset is recorded as active") but do not block — purity (1) already catches baked values, and reset clears this key anyway. Informational only.

If (1) fails → refuse with `baseline-adopt-refused` reason "Live file has applied scaling — reset or undo before adopting." If (2) detects retargets and the user has not opted in → refuse with reason listing the retargeted tokens. This makes Tier B capture only *structural* change relative to the active baseline (new/renamed aliases), never a mutated/swapped working state, and never re-flags prior adoptions.

**The common-case decision the judge demanded (resolves gap 13):** a designer's legitimate Figma-side retarget of `Radius/md` is the *normal* case the user champions. Policy: **the swapper/lists/drift banner reflect that retarget LIVE with zero friction** (Stage 2 — it is just the current alias graph). The retarget only meets a gate when the designer chooses to **move the reset baseline** to include it (Adopt). At that one moment we ask a **single explicit one-click confirm** ("capture N retargeted tokens into the baseline?"), not a refusal-by-default wall — refusal only happens if they decline the confirm. This is consistent with "Figma is master": Figma is always the live truth; the *only* gated act is overwriting the recovery point, and that gate is one click, not a block.

### 1.4 Preset baseline & "is the shipped file Expressive-applied?" (resolves gap 14, both halves)
The `mode="expressive"` leaf in Dimension System is a **string flag**, not evidence of flattening — verified live: Dimension System is **37 aliases + 1 string**, all sizing leaves still aliases, none baked. So the export's alias graph IS a neutral, un-flattened baseline; the snapshot is NOT "Expressive-applied." Reset restores that neutral alias graph; presets re-flatten on top.

**Two distinct assertions, because alias-purity ≠ raw-value-neutrality (resolves gap 14's second half):**
- **(a) Alias-graph neutrality (provable):** `gen-tokens.mjs` asserts the export's System leaves (Dimension System sizing leaves + all Typography System leaves) are **100% aliases** (excluding the `mode="expressive"` flag and any `廃止_` leaf, detected by the dotted-`{…}` test, NOT `$type`); if a System leaf is a baked raw number, generation **fails nonzero** ("export appears preset-applied/scaled — regenerate from a neutral file"). This proves the System layer is not flattened.
- **(b) Reference raw-value baseline (NOT provable from structure — acknowledged on faith):** scaling bakes magnitudes into the **Reference** raw floats, and the alias-purity check says NOTHING about whether `Sizing/md`'s raw value is the shipped 12 or a scaled 15. The plan **does not claim to prove** Reference values are shipped-default. Instead: the generator emits a `REF_SIZING`/`REF_FONT_SIZE` checksum into the committed header comment, and the **golden-diff test asserts `REF_SIZING` is byte-identical to the OLD `DEFAULT_REF_SIZING` (0 diffs — verified true this session)** — i.e. the magnitudes are pinned against the known-good shipped table at seed time. Beyond that seed, "the Reference raw baseline is correct" is **explicitly taken on faith from whoever regenerates from a neutral file**, and this is stated in the regen doc + the generator's failure message. Honest position: assertion (a) is by-construction; (b) is golden-pinned at seed and trust-based thereafter.

### 1.5 What is zero-source vs what still needs a commit (resolves gap 8 — quantified and SCOPED HONESTLY)
- **Zero source change, from Stage 2 on (the bulk):** all token *lists*, swapper *groups/options*, *classification*, *presets*, every *read*, *swap*, *scale*. New/renamed/retargeted tokens flow through live with no edit.
- **Requires a commit OR a one-click Adopt:** moving the **reset target**. Engineer path = re-export + `node gen-tokens` + git commit (reviewable). Non-engineer path = one-click gated "Adopt from live" → pluginData snapshot (no terminal).
- **⚠EXPLICIT SCOPE HONESTY (resolves gap 18/effort-boundary):** the user's literal "routine Figma edits need ZERO source changes" for the **swapper** is delivered by **Stage 2**, not Stages 0–1. Stage 0 rebinds the swapper *grouping* to the generated `SYS_ALIAS` table, so a Figma-added `Sizing/Radius/4xl` will NOT appear in the swapper until Stage 2 lands (or a re-export+regen+commit). **Therefore Stage 2 is promoted INTO the committed deliverable** (Stages 0–2), and the plan does NOT tell the user that Stages 0–1 alone satisfy "Figma is master for the swapper." Stages 0–1 fix the *corruption* and give a terminal-free re-anchor; **Stage 2 is what makes Figma the live master for all observable structure**, and it is committed, not optional follow-on. Stages 3–4 (UI generalization + drift-surface hardening) remain explicit follow-on. The plan never lets the user believe the corruption fix alone is "Figma is master."

### 1.6 SECTION_IDS ordering — pinned, not iteration-derived (resolves the SECTION_IDS-ordering gap)
Display order today is `[spacing, sizing, typography]`, hardcoded in TokenPanel's three filter blocks (verified §0). The generator's first-encounter order over `DEFAULT_SYS_ALIAS` would yield `[sizing, spacing, typography]` (Radius first) — a silent reorder. **Resolution:** the generated module exports BOTH:
- `SECTION_IDS` — the *set* of distinct section ids that exist (membership), derived per-group from the System leaf-name prefix.
- `SECTION_DISPLAY_ORDER` — a **hand-authored `as const` tuple** `["spacing","sizing","typography"]` baked into the generator as a constant (NOT derived from iteration), with any section id present in `SECTION_IDS` but absent from `SECTION_DISPLAY_ORDER` appended at the end (so a future section is never dropped). TokenPanel iterates `SECTION_DISPLAY_ORDER`, never `SECTION_IDS`.
- A **vitest assertion** that `SECTION_DISPLAY_ORDER` filtered to currently-present ids `=== ["spacing","sizing","typography"]` (the current panel order), so an implementer cannot silently reorder.

### 1.7 Reset write semantics — non-corrupting by construction, including under rename (resolves gaps 1 & 15)
The judge's gap 1 (all-or-nothing vs selective) and gap 15 (rename-fragility) are resolved by a **single explicit write algorithm** replacing the current unconditional name-keyed loop (code.ts:718-733 / 781-790):

1. **Anchor stores target IDENTITY, not just name.** At Adopt time (Tier B) the snapshot records, per System token, the target Reference variable's **`id` AND `name`**. The committed Tier A stores names only (no live ids exist at generation), so for Tier A the reset path resolves names→ids against the *current live Reference* exactly as today — but with the reconciliation in step 3.
2. **Diff-aware classification before writing.** Reset computes, per anchor entry, one of: `IDENTICAL` (live target already equals anchor target), `RETARGET` (live target differs), `GHOST` (anchor token missing from live System), `UNRESOLVABLE` (anchor's target name/id no longer resolves in live Reference). This is the per-token branch the judge said was missing.
3. **Rename reconciliation (resolves gap 15).** For each anchor target, resolve in this order: (a) Tier-B stored `id` via `getVariableByIdAsync` (survives rename — an id is stable across a Reference rename); (b) if null or Tier A, resolve by stored `name`; (c) if name also misses, run the live derivation's name-reconciliation (the anchor target name is matched against current Reference names; a pure rename `Sizing/2xl→Sizing/xxl` is detected when exactly one live Reference token is unaccounted-for and value-matches). If a target STILL cannot be resolved → it is `UNRESOLVABLE`, and reset **does NOT silently skip**: it collects these and **hard-warns** ("N baseline targets no longer exist in Reference — reset restored M of N; review renamed/deleted Reference tokens"), so a partial restore can never masquerade as success.
4. **Write decision — selective, gated, and reported (resolves gap 1's explicit question):**
   - `IDENTICAL` → write (idempotent, safe; cheap).
   - `RETARGET` → this is the only destructive case. It is **gated behind the UI-side confirm (§3 Stage 4)**: the full set of `RETARGET` tokens is shown before any send; on confirm, reset retargets ALL of them to the anchor; on decline, **none** of the retargets are written but `IDENTICAL`/`GHOST`/`UNRESOLVABLE` handling still proceeds (so declining the retarget-restore does NOT block resetting the non-drifted tokens — the judge's (a)-vs-(b) concern). **Stated explicitly: reset is selective per-token, not all-or-nothing; the confirm gates only the `RETARGET` subset.**
   - `GHOST` → skipped (can't write a deleted var), reported as "no longer in file."
   - Live tokens absent from the anchor → left untouched (never deleted/zeroed), reported as "not covered by baseline; Adopt to include."
5. This same algorithm runs for both `resetSizingDefaults` and `resetTypographyDefaults` (the typo path additionally preserves the verified invariant that only `/FontSize` leaves are ever written, so JP/EN FontFamily survive).

---

## 2. Data flow (target state)

```
                 ┌─────────────────────────────────────────────┐
   Figma file ──▶│ LIVE: deriveSchema() (src/main/schema.ts)   │──▶ token lists, alias map,
   (Variables    │   runs on every get-*/swap/scale call,       │    swapper groups/options,
    API)         │   memoized across the call via a shared cache│    classification, presets
        │        └─────────────────────────────────────────────┘
        │  engineer:  node scripts/gen-tokens.mjs <export.json>     → Tier A (committed .ts)
        │  designer:  "Adopt current Figma as baseline" (gated §1.3) → Tier B (figma.root pluginData)
        ▼
   reset anchor = valid pluginData snapshot (Tier B) ?? tokens.generated.ts (Tier A)
        │   (anchor stores target id+name; reset reconciles renames, §1.7)
        ├─(import)──▶ resetSizingDefaults / resetTypographyDefaults  (selective, gated, §1.7)
        ├─(import)──▶ .storybook/fixtures.ts        (collapses the duplicate)
        └─(typeof)──▶ messages.ts SwapperSection union (exhaustiveness preserved)

   get-drift handler: deriveSchema() (live)  vs  anchor  ──▶ DriftReport ──▶ DriftBanner
```

**One shared core** (`src/shared/token-derive.ts`) holds pure flatten / normalize / classify / sentinel / group logic, with **two thin adapters**:
- `fromExport(json)` — Node, DTCG tree, **collection name from `Object.keys(el)[0]`**, lowercase `$type`, alias = dotted-`{…}` string (NOT `$type`-driven, per §0 ⚠FIX).
- `fromLive({collections, variablesByName, valuesByMode, resolveAliasName})` — sandbox, UPPERCASE `resolvedType`, alias = `value.type==="VARIABLE_ALIAS"` resolved to target name/id (algorithm in §3 Stage 2).

Both **normalize type-casing to UPPERCASE and alias-detection at the boundary** and produce the same `TokenSchema` (defined in §2.1). A vitest equivalence test (`fromExport deepEqual fromLive`) is the hard guarantee — and the live mock is **generated from the same export.json** (§3 Stage 2; resolves gap 5).

### 2.1 The `TokenSchema` data contract — the single most-reused artifact, now DEFINED (resolves gap "TokenSchema never defined")
One canonical type in `src/shared/token-derive.ts`, imported everywhere (core, both adapters, generated `.ts` shape, pluginData blob, `DriftReport`, validity predicate). **One naming convention — the generated module re-exports the same fields as named `const`s for ergonomics, but their TYPES are these fields.** No more `REF_SIZING`-vs-`refSizing` drift:

```ts
// src/shared/token-derive.ts — THE contract
export type TokenType = "FLOAT" | "STRING" | "COLOR";          // normalized UPPERCASE
export interface AliasTarget { name: string; id: string | null } // id null in Tier A / export
export interface TokenSchema {
  refSizing:    Record<string, number>;   // Dimension Reference Sizing/* (incl none/full)
  refSpacing:   Record<string, number>;   // Dimension Reference Spacing/* (36)
  refFontSize:  Record<string, number>;   // Typography References FontSize/* (11)
  sysAlias:     Record<string, AliasTarget>;   // Dimension System leaf -> target
  typoSysAlias: Record<string, AliasTarget>;   // Typography System .../FontSize -> target
  sentinels:    string[];                  // ["Sizing/none","Sizing/full","Spacing/0"]
  baseScaleOrder: string[];                // 15 Sizing/* minus sentinels, file order
  sectionIds:   string[];                  // distinct section ids present (membership)
}
```

The generated module (`tokens.generated.ts`) exports `export const SCHEMA: TokenSchema = {…} as const`-ish plus convenience aliases `export const REF_SIZING = SCHEMA.refSizing` etc. and the pinned `export const SECTION_DISPLAY_ORDER = ["spacing","sizing","typography"] as const`. The validity predicate (§5.2), `deepEqual` equivalence test, and `DriftReport` all reference `TokenSchema`'s fields by these exact names. **`DriftReport` is a separate, also-defined type** (§2.3) — it is a *comparison result*, not a `TokenSchema`.

### 2.2 Swap-option candidate set — preserve TODAY's capability verbatim (resolves gap 1/band)
**There is no "band."** Candidates for every dimension group = **ALL `Sizing/*` Reference FLOAT tokens minus `sentinels`** — the exact 15-option flat list code.ts:861-877 builds today, attached identically to every group (code.ts:910). Concrete rule: "every Reference variable where `resolvedType==="FLOAT"` && `name.startsWith("Sizing/")` && `!sentinels.includes(name)`, sorted by value." No narrowing, no per-group filtering — zero capability regression, and the 36 `Spacing/N` stay excluded. For typography groups, candidates = all 11 `FontSize/*`. The only change vs today is the list is derived from the LIVE Reference collection (so a newly-added `Sizing/Radius/4xl` appears automatically) instead of being gated through the table.

### 2.3 Message types & the one loosened union
- Keep `ScaleGroup` and `ResetDomain` as **closed literal unions**; `ResetDomain` gates the reset write-path branch — do not widen.
- Loosen **only** `SwapperSection` to `typeof SECTION_DISPLAY_ORDER[number]` (NOT `SECTION_IDS` — display order is the pinned tuple, §1.6). tsc exhaustiveness preserved; a new Figma section flows in via regeneration and renders last.
- `SwapperGroup.label` and `SwapperStep.step` already exist — no change. Add only a `SwapperSection`→title label-map (§3 Stage 3).
- Add: `UIMessage` `'get-drift'`, `'adopt-baseline'`, `'adopt-baseline-confirm-retargets'`; `PluginMessage`:
  - `'drift'` carrying `DriftReport`;
  - `'classification-error'` (ambiguous collection names + remap affordance, §6);
  - `'baseline-adopted'` / `'baseline-adopt-refused'` (with reason, §1.3).

```ts
export interface DriftReport {
  added:        string[];                                  // live tokens absent from anchor
  removed:      string[];                                  // anchor tokens absent from live (ghosts)
  retargeted:   { token: string; from: string; to: string }[];
  unresolvable: string[];                                  // anchor targets that no longer resolve (§1.7)
  classification: { collection: string; layer: string; confidence: "high" | "low" }[];
  unclassified: string[];                                  // momentarily-unresolvable leaves (§ Stage 2)
  anchorSource: "pluginData" | "committed";
}
```

---

## 3. Staged roadmap

**Committed deliverable = Stages 0, 1, 2** (corruption fix + tests/CI + terminal-free Adopt + the live engine that actually makes Figma the master for observable structure). **Stages 3–4 = explicit follow-on** (UI generalization + drift-surface hardening). Each stage independently shippable.

### Stage 0 — Apply the new export NOW + executable proof of the corruption fix (the user's literal "please update")
Goal: stop reset from corrupting; minimal structural refactor; **prove it with code, not by hand**.

**Files:**
- NEW `scripts/gen-tokens.mjs` — Node generator (consumes `fromExport` from `token-derive.ts`, extracted here as the core's first consumer).
- NEW `src/shared/token-derive.ts` — pure core + `TokenSchema` (§2.1) + `fromExport`.
- NEW `src/shared/tokens.generated.ts` — generated, committed (Tier A).
- EDIT `src/main/code.ts` — delete the 6 literal tables; `import { SCHEMA, REF_SIZING, REF_SPACING, REF_FONT_SIZE, SYS_ALIAS, TYPO_SYS_ALIAS, SENTINELS, BASE_SCALE_ORDER, SECTION_DISPLAY_ORDER } from "../shared/tokens.generated"`. `classifyCollections()` + `RE_*` stay (live path still needs them until Stage 2).
- EDIT `package.json` — `"gen-tokens"`, `"check:tokens": "node scripts/gen-tokens.mjs --check"`.
- EDIT `.storybook/fixtures.ts` — import `REF_*` and derived groups from the generated module (collapses that duplicate now).
- UPDATE memory `token-tables-source-of-truth.md`.

**Honest scope note for Stage 0's code.ts consumers (resolves gap 18 — scope-bleed):** the rebind is NOT a pure "tables→constants, loops untouched" drop-in:
- `sendBaseTokens` (code.ts:480-505) keys on `SHIPPED_BASE` (`if (!(name in SHIPPED_BASE)) continue`, line 500; `shipped: SHIPPED_BASE[name]`, line 505) — rebinding to `BASE_SCALE_ORDER`/`REF_SIZING` is mechanical (same shape).
- The swapper grouping loop (code.ts:884) does `for (const [sysName, refName] of Object.entries(DEFAULT_SYS_ALIAS))` — rebinding to `SYS_ALIAS` means the **live swapper UI immediately reflects the corrected 11/3/1 graph in Stage 0** (gains the 3 new tokens, drops the ghost, shows corrected targets). This is GOOD and IS the user's "please update" — but it is explicitly acknowledged as Stage-0 behavior: the swapper *grouping* is corrected by the static table swap, while a Figma-added token still won't appear until Stage 2. Stage 0's contract is precisely: "delete tables, import generated constants, the table-keyed grouping/base loops now reflect the corrected graph; classification + option derivation stay live/untouched." No `fromLive` engine is required for Stage 0.

**Generator algorithm (`gen-tokens.mjs` → `fromExport`):**
1. **Schema-shape guard:** assert the parsed value is a **12-element array**; assert each element has **exactly one own key** whose value is an object with a `modes` object (`Object.keys(el).length === 1 && el[Object.keys(el)[0]].modes`). **Derive the collection name as `Object.keys(el)[0]`.** Iterate positionally; never collapse into a name-keyed object (both `Expressive`/`Productive` pairs must survive even though they carry 0 leaves).
2. **Per-collection mode selection with a TOLERANT fallback:** single-mode → use the sole mode (no name assertion). Multi-mode (Typography System JP/EN) → documented preference `JP` first (FontSize is JP==EN, verified) with a **warning, not a hard fail**, on an unexpected mode name. A mode *rename* warns; only a *missing/zero* mode fails.
3. Recursively flatten below the mode wrapper; a node is a leaf iff it has `$value`. Path = slash-joined keys. **Normalize `$type` to uppercase**, and **detect alias by the dotted-`{…}` value form, not `$type`** (per §0 ⚠FIX — `Label/font-family` is `$type:"string"` yet a dotted alias).
4. **Skip rules:** the `mode="expressive"` leaf (path `mode`, value `expressive`); any leaf whose **last segment** starts with `廃止_`; zero-leaf collections (Corporate); preset collections (0 leaves); Color collections excluded from dim/typo logic (raw COLOR tolerated, not classified).
5. **`refSizing`** = `Sizing/*` FLOAT leaves of Dimension Reference (17, incl. `none`=0/`full`=99999), name→value, file order. **`refSpacing`** = the 36 `Spacing/*`. **`baseScaleOrder`** = `Sizing/*` minus sentinels (15; explicitly excludes all `Spacing/*`).
6. **`refFontSize`** = the 11 `FontSize/*` of Typography References (matches `SHIPPED_FONT_SIZE` exactly).
7. **`sysAlias`** = each Dimension System alias leaf, normalize `{Sizing.sm}`→`{name:"Sizing/sm", id:null}` (strip braces; **assert exactly one `.`**; fail on multi-level).
8. **`typoSysAlias`** = Typography System leaves whose path **ends `/FontSize`** ONLY (15). Explicitly excludes `/FontFamily`, `font-family` (the anomaly), `/FontWeight`, `/LetterSpacing` — all also aliases. Single-valued (JP==EN verified).
9. **`sentinels`** = name-anchored `["Sizing/none","Sizing/full","Spacing/0"]` with value cross-check (assert `none`==0, `full`==99999, `Spacing/0`==0; warn if not).
10. **`sectionIds`** = distinct sections derived **per-group from the System leaf-name prefix** (`/^Spacing\//`→`spacing`, FontSize-bearing→`typography`, else `sizing`) — keyed exactly like code.ts:908. **`SECTION_DISPLAY_ORDER`** is the hand-pinned `["spacing","sizing","typography"]` constant (§1.6), with any extra present id appended.
11. **Alias-graph-neutrality assertion (§1.4a):** assert all Dimension System sizing leaves + all Typography System leaves are dotted-`{…}` aliases (ex the `expressive` flag / `廃止_` leaves); fail nonzero if any is a baked number.
12. **Reference-resolution assertions (fail nonzero):** every `sysAlias` target ∈ `refSizing ∪ refSpacing`; every `typoSysAlias` target ∈ `refFontSize`; targets resolve **only within the chosen Reference layer**, never global-by-name. **⚠FIXED rationale (gap 6):** the reason is NOT that `Sizing`/`Spacing` names span Reference and deprecated (verified FALSE — deprecated has only `Padding`/`Border radius`/`Border`/`Icon stroke width`). The reason is a **structural collision: Dimension Reference (53 raw float) and `(deprecated) Dimension` (32 raw float) are BOTH raw-float collections**, indistinguishable by structure alone; the deny-list (name `/(deprecated)/i` + `廃止_` leaf marker) is what scopes resolution to the real Reference. An implementer must guard the structural collision, not a nonexistent path-name collision.
13. **`REF_SIZING`/`REF_FONT_SIZE` checksum** emitted into the committed header comment (§1.4b).
14. `--check`: regenerate to buffer, compare to committed file, exit nonzero if stale.

**Verification (executable, IN Stage 0 — resolves gaps 10 & the Stage-0-CI gap):**
- A committed **golden-diff fixture** + a **standalone `node scripts/verify-tokens.mjs`** (run in Stage 0, ahead of vitest) asserts: generated `sysAlias` differs from the OLD `DEFAULT_SYS_ALIAS` by **exactly 11 retarget + 3 add + 1 ghost** (the §0 list), AND `typoSysAlias` + `refSizing` are byte-identical to the old tables (0 diffs).
- **⚠FIXED — Stage-0 CI wiring (resolves the Stage-0-shippability gap):** the prior plan shipped the corruption fix in Stage 0 with NO CI guard for the golden diff (release.yml runs only typecheck+build, and vitest doesn't exist until Stage 1). Resolution: Stage 0 **adds a `check:tokens` + `verify-tokens.mjs` step to the existing release.yml** (the push-to-main job), so the 11/3/1 golden diff and `--check` staleness ARE CI-enforced from Stage 0 on the only trigger that exists. (Stage 1 adds the *PR-path* job; Stage 0 ensures the fix is not unguarded on main.) The "shippable alone with executable proof" claim is now true on the actual toolchain.
- `npm run typecheck` (both configs) `&& npm run build`.
- Manual-in-Figma (secondary): open on corrected file → reset → `Radius/md`→`Sizing/sm`, `Radius/3xl` present, no `Radius/2xs`, `Margin/none`→`Spacing/0` resolves.

**Stage 0 is shippable alone, fully fixes the corruption, and is CI-enforced on main.**

### Stage 1 — Test harness + Tier-B "Adopt from live" + selective reset + drift contract + PR-blocking CI
Promotes "Adopt from live" + the selective/identity-aware reset to requirements; adds vitest + PR-path CI.

**Files:** add `vitest`; EXTEND `src/shared/token-derive.ts`; NEW `src/shared/token-derive.test.ts`; EDIT `src/main/code.ts` (add `adopt-baseline` handler per §1.3/§5.2; rewrite `resetSizingDefaults`/`resetTypographyDefaults` to the §1.7 selective/identity-aware algorithm; reset reads anchor = valid pluginData ?? committed); NEW `src/ui/components/DriftBanner.tsx` (minimal: anchorSource + "Adopt" button); CI changes below.

**CI (resolves gap 6/CI):** the only workflow today triggers on push to main. Stage 1 **adds an `on: pull_request` job** running `npm run check:tokens && npm run typecheck && npm test`. This blocks a stale `tokens.generated.ts` or a failing `fromExport`/`fromLive` equivalence test **before merge**. Push-to-main keeps build+typecheck+`check:tokens` (from Stage 0).

**`adopt-baseline` handler (concrete, resolves gaps 7, 12, 13, 17):**
- Runs the §1.3 three-condition gate (alias-purity + no-retarget-vs-**effective-anchor** + active-preset advisory).
- If condition 2 finds retargets and the user has not opted in, posts `baseline-adopt-refused` listing them; UI offers the one-click `adopt-baseline-confirm-retargets` (§1.3 common-case decision).
- If permitted, serializes a **version-tagged blob**: `{ schemaVersion: SCHEMA_VERSION, generatedAt: ISO, contentHash: <hash of schema>, schema: TokenSchema }` — and the schema's `sysAlias`/`typoSysAlias` carry **both target name AND live id** (§1.7 identity) — written via `figma.root.setPluginData(BASELINE_KEY, JSON.stringify(blob))`. **Size bound:** assert `json.length < 90_000`; the schema is structure-only (names + dotted targets + ids), well under the ~100KB pluginData ceiling; if ever exceeded, refuse with reason "snapshot too large."
- **The committed `.ts` is written ONLY by the Node generator** — no sandbox filesystem write is ever attempted (the prior "write tokens.generated.ts from the sandbox" idea is impossible and absent).
- **Reset reads (validity predicate, §5.2):** `getPluginData(BASELINE_KEY)` → `JSON.parse` → valid IFF the §5.2 predicate holds; else fall back to committed Tier A + advisory.

**Tests (vitest):**
- Golden snapshot of `tokens.generated.ts` from the committed export.
- Edge cases: `expressive` skipped; `廃止_` last-segment skipped (32/32); `Label/font-family` excluded from `typoSysAlias` AND correctly treated as an alias despite `$type:"string"`; Corporate excluded; both `Expressive`/`Productive` pairs survive array iteration (no dedup); `{X.y}`→`X/y`; multi-level alias fails; every alias resolves; sentinel name+value cross-check; `baseScaleOrder` == 15 `Sizing/*` and excludes all 36 `Spacing/*`; lowercase-vs-uppercase `$type` normalization.
- **SECTION_DISPLAY_ORDER assertion (§1.6):** `SECTION_DISPLAY_ORDER` filtered to present ids `=== ["spacing","sizing","typography"]` (locks UI order).
- **Drift-isolation assertion:** generated `sysAlias` carries the 11 retargets, 3 adds, drops the ghost; `typoSysAlias` + `refSizing` byte-identical (0 diffs).
- **Alias-graph-neutrality assertion (§1.4a):** generation fails on a baked-number System leaf; snapshot alias graph equals the export's un-flattened System aliases.
- **Reset selectivity + rename (§1.7):** (i) declining the retarget confirm still resets `IDENTICAL` tokens; (ii) a Tier-B anchor whose target was renamed resolves via stored `id` (survives rename); (iii) an unresolvable target produces a hard-warn, never a silent partial-success.
- **Reset touches ZERO FontFamily/FontWeight/LetterSpacing:** the planned reset variable set ∩ {any path not ending `/FontSize`} = ∅ (lets EN/JP fonts survive).
- **Snapshot validity:** mismatched `schemaVersion` / stale `contentHash` rejected → falls back to Tier A (§5.2).

**Verification:** `npm test` green; **PR CI fails on stale `tokens.generated.ts`**; designer loop closed: edit Figma → one-click gated Adopt (no terminal) OR re-export + `gen-tokens` + reviewable diff (PR-CI-enforced).

### Stage 2 — Live structure derivation engine (`fromLive`) — IN the committed deliverable (§1.5)
**Files:** NEW `src/main/schema.ts` exposing `deriveSchema(): Promise<TokenSchema>` (via `fromLive`); NEW `scripts/build-live-mock.mjs`; EDIT `src/main/code.ts` to route `sendBaseTokens`/`sendSwapperGroups`/swap-option building/classification through `deriveSchema()` instead of `RE_*` + tables. **Presets stay on the existing `sendPresets`/`applyPreset`/`classifyCollections` path (cited below), NOT through the alias core. Reset still reads the snapshot anchor.**

**`fromLive` alias-resolution algorithm — correctness + cost (resolves gaps 2 & 3):**
- **Resolution:** for each System leaf, read its mode value; if `value.type==="VARIABLE_ALIAS"`, resolve `value.id` via `getVariableByIdAsync(value.id)` → `.name` (and keep the `.id`). That `.name` is the current target name (correct even if the *target token was renamed* — resolve by id, never stale name). Assert the resolved var's `variableCollectionId` === the chosen Reference collection's id; if outside the chosen Reference layer, flag in `DriftReport` rather than silently accepting.
- **Forward-reference / momentarily-unresolvable:** if `getVariableByIdAsync` returns null (alias points at a deleted/not-yet-created token during a two-step edit) → **treat the leaf as still-System with a warning** in `DriftReport.unclassified`, exclude only that leaf from the alias map; do NOT drop the collection's System classification, do NOT emit a hard classification-error.
- **Cost / caching (resolves gaps 2 & the invalidation gap):** volume per `deriveSchema()` ≈ 53+36 Reference + 37 Dimension System + 30 Typography System leaf reads + ~52 `getVariableByIdAsync` alias resolutions ≈ a couple hundred awaited calls. **Caching:** (a) within one `deriveSchema()` call, memoize `getVariableByIdAsync` + per-collection `valuesByModeForCollectionAsync` in one `Map`. (b) Cache the whole derived `TokenSchema` keyed by an invalidation token. **⚠FIXED invalidation-token (resolves the alias-retarget-misses-the-token gap):** a count-only token (collections length + mode/variable counts) does NOT change on an alias retarget — the exact drift this plan exists for. So the token MUST include an **alias-target component**: a cheap rolling hash of `(System leaf id → resolved target id)` pairs, computed once per derive and stored with the cache; the cache is valid only if BOTH the count token AND the alias-target hash match. In-plugin writes bump a generation counter (invalidate immediately). **External edits during an open session:** the alias-target hash catches an external retarget on the NEXT derive (e.g. when the drift banner or swapper refetches), but to bound staleness the plan **documents that `get-drift` always recomputes (never served from cache)** and the DriftBanner offers a manual "refresh" — so an external master edit is surfaced on the next drift check or refresh, not masked. This is stated as a known bound, not hidden behind "cheap."

**Classification algorithm — concrete precedence (resolves gaps 9 & 6/false-premise):**
For each base (non-extension) collection, bucket leaves by `{alias, rawFloat, string, color}` using UPPERCASE `resolvedType` + alias detection. **Precedence is name-regex FIRST, structure as confirmation/fallback** (structure alone cannot separate Dim Reference's 53 raw from `(deprecated)`'s 32 raw — verified):
1. **Hard deny** any collection whose name matches `/(deprecated)/i` OR has any leaf whose last segment starts with `廃止_`. (Removes the 32-raw-float deprecated collection regardless of structure — this is the deny-list that resolves the **structural** raw-float collision, not a path-name collision.)
2. **Name-regex pass (primary):** today's `RE_REFERENCE`/`RE_SYSTEM`/`RE_TYPOGRAPHY` select candidates.
3. **Structure confirms (not replaces):** Reference = `aliasRatio == 0 && rawFloat > 0`; System = `aliasRatio > 0.8 && targets land in the chosen Reference`. **Forward-reference tolerance:** a momentarily-unresolvable alias counts as an alias (still-System) and does NOT lower confirmation below threshold. Typography vs Dimension by dominant top segment. If structure contradicts the name pick, prefer the name pick + emit a low-confidence flag in `DriftReport.classification`.
4. **Fallback:** if name-regex yields nothing (a rename), fall back to pure structure with the deny-list still applied. Only if *two* collections both pass as Reference → `classification-error` to UI **with a manual remap affordance** (§6).

Degrades to today's behavior on a rename (zero intervention); deny-list does the heavy lifting on the Dim-Ref-vs-deprecated structural collision.

**Preset derivation — grounded in the existing handlers (resolves the preset gap):** `fromLive` does NOT walk presets through the alias core. Stage 2 routes `get-presets`/`apply-preset` through the **already-live** `sendPresets` (code.ts:174-206) and `applyPreset` (code.ts:313-394), which I read this session:
- Preset *membership* = `classifyCollections().extensions` (code.ts:155-161: Extended Collections whose `parentVariableCollectionId` ∈ the System-layer parents), grouped by `ext.name.trim().toLowerCase()` so the two same-name collections per preset fold into one `PresetSummary.collectionIds` holding both ids. This is exactly how the export's `Expressive`×2/`Productive`×2 (verified: indices 6/7 and 8/9, modes `Default` and `JP/EN`, 0 leaves each) pair to their two parent layers.
- Preset *apply/flatten* = `applyPreset`'s existing parent resolution via `ext.parentVariableCollectionId` + `ext.modes`→parent `parentModeId` mapping (code.ts:273-275 / 350-353). Stage 2 does NOT change this; it only ensures `deriveSchema`'s classification feeds the same `system`/`typographySystem`/`extensions` set. The export carrying 0 preset leaves is precisely why this is live-only and is left on the proven code path rather than re-derived.

**Swap-option candidate set:** as §2.2 — all `Sizing/*` Reference FLOAT minus `sentinels` per dimension group (verbatim today, 15 options, no band), all 11 `FontSize/*` for typography. Now sourced live so added Reference tokens appear automatically (THIS is the Stage-2 delivery of "Figma is master for the swapper," §1.5).

**Idempotent scaling anchor — fallback specified:** `sendBaseTokens` reports `shipped` from the **anchor** (`refSizing` in valid pluginData ?? committed). Live derivation supplies token *membership*. When a live token has no anchor baseline (designer added `Sizing/10xl`): excluded from scaling, flagged in `DriftReport.added`, UI shows "new token — adopt baseline to make it scalable." NEVER `shipped=0`. Tested.

**Typo classification in `fromLive`:** iterate live variables whose `.name` IS the System path. The `typoSysAlias` filter uses `variable.name.endsWith("/FontSize")` — identical to `fromExport`. A test asserts FontFamily aliases (incl. the `Label/font-family` anomaly) do NOT leak into `typoSysAlias`.

**Live mock is GENERATED, not hand-built (resolves gap 5):** `scripts/build-live-mock.mjs` (its own work item) reads the same export.json and emits the mocked live graph — collections with synthetic mode ids, `variablesByName`, `valuesByMode` with `VariableAlias{id}` (id↔name table from the export), a `resolveAliasName(id)` stub backing `getVariableByIdAsync`, `resolvedType` upcased, the `expressive` STRING leaf preserved, and the `Label/font-family` dotted-string-alias preserved. Because both adapters consume the same file in two encodings, the deepEqual genuinely proves agreement.

**Verification:** equivalence test `fromExport(export) deepEqual fromLive(mockGeneratedFromSameExport)`; forward-reference test (alias→missing id → still-System + warning, no hard error); cross-call cache test (two derives on unchanged mock resolve aliases once; an alias-retarget in the mock DOES invalidate the cache — proves the §2 invalidation fix); typecheck; Storybook stories per derived shape; manual-in-Figma: add `Sizing/Radius/4xl` → appears in swapper/lists with zero code change.

### Stage 3 — UI generalization + the single loosened union (follow-on)
**Files:** EDIT `src/shared/messages.ts` (loosen `SwapperSection` to `typeof SECTION_DISPLAY_ORDER[number]`; add drift/adopt/classification-error messages); EDIT `src/ui/panels/TokenPanel.tsx`; EDIT `src/ui/panels/PresetPanel.tsx` (tolerate unknown preset names; `PRESET_DESCRIPTIONS` presentation-only).

**TokenPanel is a render-loop REWRITE driven by the PINNED order (resolves gap 16b + SECTION_IDS-ordering):** today TokenPanel has three hand-written `<Subsection>` filter blocks in fixed order `spacing,sizing,typography` (verified §0). Stage 3 replaces them with `SECTION_DISPLAY_ORDER.map(...)` — **iterating the hand-pinned tuple, NOT `SECTION_IDS`** — each rendering `groups.filter(g => g.section === id)` inside the existing `<Subsection>` body. A section→title map preserves the three titles exactly:
```ts
const SECTION_TITLES: Record<string, string> = { spacing: "Spacing", sizing: "Sizing", typography: "Typography" };
// unknown future section id: title-case the id (renders LAST, never dropped, per §1.6)
```
Existing remount keys (`swapKey` = `${resetNonce}-${presetNonce}`, line 135) MUST be preserved on the mapped elements. The vitest order-assertion (§1.6) guards against silent reorder.

**Scope honestly:** `App.tsx`/`RangeSlider.tsx`/`swap.ts` are mostly comments + section-id strings — touched only where a literal section id must come from the tuple; no large dedup there. The real consolidation already happened in Stage 0 (fixtures) and here (TokenPanel loop).

**Verification:** typecheck (exhaustiveness via `as const`); Storybook unknown-section fallback story + a story asserting the three existing titles render in order `spacing,sizing,typography`; manual-in-Figma section ordering + reset/preset remount intact.

### Stage 4 — Drift surface hardening + non-corrupting reset guard (follow-on)
**Files:** EDIT `src/main/code.ts` (`get-drift` read-only `deriveSchema()` vs anchor, always recomputed per §2); EDIT `DriftBanner.tsx`; EDIT `.storybook/figma-messaging.mock.ts`.

**Reset guard — confirm UI-SIDE BEFORE sending, never mid-mutation (resolves gap 4):** the `runMutation` re-entry guard (code.ts:25-37) makes a mid-mutation round-trip fragile. So **no mutation-lock change**:
1. UI requests `get-drift` (read-only `deriveSchema()` vs anchor; runs OUTSIDE `runMutation`; always recomputed). Main posts `drift` with the `DriftReport`.
2. UI inspects the report. If `retargeted.length > 0` (the only destructive case, §1.7), UI shows a **blocking confirm** listing the N retargeted tokens ("reset will retarget these to the baseline — Adopt current Figma first to keep them, or proceed to restore baseline"). Entirely UI-side; protocol unchanged.
3. Only after confirm does UI send `reset-defaults` → runs once inside `runMutation`. The §1.7 selective algorithm then writes `IDENTICAL` always, `RETARGET` only because the user confirmed, skips `GHOST`, hard-warns `UNRESOLVABLE`, leaves un-anchored live tokens untouched. Declining the confirm still lets the user reset the non-drifted subset (the judge's (a)/(b) resolution).

Sequence: `get-drift` → `drift` → (UI dialog) → `reset-defaults` → (single mutation). `mutating` acquired exactly once.

CI catches committed-vs-generated staleness (PR path, Stage 1); in-plugin drift+confirm catches live-vs-anchor staleness (which CI cannot see). "Adopt current Figma as baseline" remains the one-click gated re-anchor (§1.3).

**Verification:** Storybook drift/unclassified/unresolvable/refused-adopt/classification-error stories; manual-in-Figma: edit a token → drift banner → adopt (clean) → reset restores new state; swap a token → Adopt one-click-confirm for retarget (§1.3); scale a token → Adopt refused (purity, §1.3.1); rename a Reference target → reset resolves via id (Tier B) or warns (Tier A), never silent partial.

---

## 4. Edge cases (all handled, all verified)

| Case | Handling |
|---|---|
| Element keyed by collection NAME, no `name` field; 12-element array | `Object.keys(el)[0]`; iterate positionally; never dedup (both `Expressive`/`Productive` pairs survive — verified indices 6/7, 8/9). Shape guard asserts exactly-one-key + `.modes`. |
| `mode="expressive"` STRING leaf | Skipped (path `mode`, value `expressive`); ignored by alias-neutrality assertion. |
| Lowercase `$type` export vs UPPERCASE `resolvedType` live | Each adapter normalizes to UPPERCASE; core casing-agnostic. |
| **`Label/font-family` = `$type:"string"` but dotted ALIAS value** | Alias detection uses the dotted-`{…}` value form, NOT `$type`; excluded from `typoSysAlias` by `/FontSize` suffix anyway. **(⚠FIXED.)** |
| `(deprecated) Dimension` (32 `廃止_` raw floats; tops Padding/Border radius/Border/Icon stroke width) | `廃止_` last-segment (32/32) + name `/(deprecated)/i` → hard-denied. **NOT a `Sizing`/`Spacing` path collision (verified absent); a STRUCTURAL raw-float collision resolved by deny-list.** **(⚠FIXED — gap 6.)** |
| `Corporate` (0 tokens) | Zero-leaf rule (verified 0). |
| Same-name preset pairs (Expressive×2, Productive×2) | 0 leaves + no parent linkage in export → never snapshotted; driven 100% live via existing `sendPresets`/`applyPreset` (`parentVariableCollectionId`/`parentModeId`). Both array elements survive iteration. |
| EN/JP modes | FontSize JP==EN → single-valued `typoSysAlias` to all modes. FontFamily (incl. `Label/font-family`) EXCLUDED → JP/EN fonts never overwritten. Tested. |
| `Label/font-family` anomaly (role-name reconstruction) | Excluded by `/FontSize` suffix; typo map keyed by suffix, never reconstructed roles. |
| Dotted vs id aliases | `fromExport`: `{Sizing.sm}`→`{name:"Sizing/sm",id:null}` (assert single `.`). `fromLive`: `VariableAlias{id}`→`getVariableByIdAsync`→`{name,id}` (resolve by id, correct under target rename). Same `TokenSchema`. |
| Alias target momentarily unresolvable (two-step edit) | `fromLive` → leaf still-System + warning in `DriftReport.unclassified`; never drops classification, never hard error. |
| Anchor target RENAMED in Reference | Reset resolves Tier-B stored `id` (stable across rename) → name → live-derivation reconcile → else `UNRESOLVABLE` hard-warn; never silent skip. **(⚠FIXED — gap 15.)** |
| Reset retarget vs anchor | Per-token `IDENTICAL`/`RETARGET`/`GHOST`/`UNRESOLVABLE`; `RETARGET` gated by UI confirm; declining still resets the rest. **(⚠FIXED — gap 1, selective not all-or-nothing.)** |
| `Spacing/0` / `Spacing/Margin/none`→`{Spacing.0}` | `Spacing/0` exists (=0); `refByName` spans full Reference (code.ts:717) → resolves; sentinel name-anchored. Verified `Margin/none → Spacing/0`. |
| Dual scale `Sizing/*` (17) vs `Spacing/*` (36) | Scalable base = 15 `Sizing/*` (`baseScaleOrder`); 36 `Spacing/N` NOT scalable; test asserts exclusion. Verified `DimRef tops {Sizing:17, Spacing:36}`. |
| Swap options | ALL `Sizing/*` minus sentinels (15), one flat list per group, verbatim today — no band. |
| Value-0 ambiguity (`Sizing/none`=0, `Spacing/0`=0) | Name-anchored sentinels + value cross-check. |
| Live token with no anchor baseline | Excluded from scaling, flagged in `DriftReport.added`; never `shipped=0`. Tested. |
| Raw-in-System (Color System 8 raw COLOR) | Tolerated; Color not classified for dim/typo; generator fails loudly only on an unrecognized raw leaf in a *classified* dim/typo System. |
| Mode rename (routine edit) | Tolerant selection: single→sole mode; multi→preference + warning; only missing/zero fails. |
| Scaling applied then Adopt | Refused (alias-purity, §1.3.1). |
| Swap / Figma-side retarget then Adopt | One-click explicit confirm to capture retargets vs effective anchor (§1.3.2 + common-case §1.3); prevents silent laundering while honoring legitimate Figma-side retargets. **(⚠FIXED — gaps 7 & 13.)** |
| Second Adopt after a first Adopt captured an ADD | Compared vs **effective anchor (Tier B)**, not stale Tier A → prior ADD is silent, only new deltas flagged. **(⚠FIXED — §1.3.2 baseline.)** |
| Stale-shaped / older-plugin Tier-B snapshot | `schemaVersion` mismatch OR `contentHash`-vs-committed staleness → fall back to Tier A + advisory. **(⚠FIXED — gaps 17 & precedence.)** |
| Cache stale after external retarget | Invalidation token includes an alias-target hash; `get-drift` always recomputed; manual refresh. **(⚠FIXED — invalidation gap.)** |
| Ambiguous classification (two Reference candidates) | `classification-error` + pluginData-backed manual remap (§6) — no engineer round-trip. |

---

## 5. Source-of-truth / drift contract

1. **Live = current truth** for everything observable (lists, alias map, groups, options, presets, classification). Zero source edits from Stage 2 on.
2. **Reset anchor = two tiers:** valid version-tagged pluginData snapshot (Tier B, designer one-click, gated §1.3, stores target **id+name** for rename-safety) ?? committed `tokens.generated.ts` (Tier A, engineer/re-export, CI-diffable). Every intentional schema change is a reviewable two-artifact git diff (Tier A) or a gated one-click re-anchor (Tier B).
3. **CI guard on the PR path** (`check:tokens` + vitest equivalence/golden, `on: pull_request`) fails BEFORE merge if Tier A is stale or `fromExport`/`fromLive` disagree; **push-to-main also runs `check:tokens` from Stage 0** (not just typecheck+build).
4. **In-plugin drift banner** surfaces live-vs-anchor divergence (always recomputed) on open and before reset; reset **confirms UI-side before sending (never silently overwrites, never mid-mutation), is selective per-token, resolves renames by id, and hard-warns on unresolvable targets** (§1.7). One-click Adopt re-anchors Tier B.
5. **The undiffability tradeoff is owned:** Tier B (pluginData) is undiffable; acceptable because Tier A remains the auditable record and Tier B is a local override reconciled by the drift banner.

### 5.2 Tier-B snapshot format + precedence (resolves gaps 17 & schemaVersion-precedence)
`BASELINE_KEY` blob = `{ schemaVersion: number, generatedAt: ISOstring, contentHash: string, schema: TokenSchema }`, JSON via `figma.root.setPluginData`. **Write-time:** size-bounded (`< 90_000` chars; schema is structure-only, well under). **Read-time validity predicate — valid IFF ALL hold:**
- `schemaVersion === SCHEMA_VERSION` (bump on any `TokenSchema` shape change), AND
- `schema` passes a key/type shape check (has `refSizing`/`refSpacing`/`refFontSize`/`sysAlias`/`typoSysAlias`/`sentinels`/`baseScaleOrder`/`sectionIds` of the §2.1 types), AND
- **recency/precedence (resolves the schemaVersion-precedence gap):** the committed Tier-A module also carries a `generatedAt`/`contentHash` in its header. **If the committed Tier-A `generatedAt` is NEWER than the Tier-B `generatedAt` (i.e. the team shipped a fresh re-anchor after this designer's last Adopt), Tier A WINS** and the UI advises "team baseline updated since your last Adopt — using committed baseline; re-Adopt to keep your local capture." This prevents a stale Tier-B from masking an intentional team re-anchor at the SAME schemaVersion (the judge's common case). Otherwise (Tier-B newer or equal, and valid) Tier B wins.

Invalid/mismatched/older → fall back to committed Tier A + advisory. A stale-shaped OR superseded snapshot can never feed `resetSizingDefaults`.

---

## 6. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Classification misfires on a future ~50/50 collection | Name-regex **primary** + deny-list (the real fix for the Dim-Ref-vs-deprecated **structural** raw-float collision) + structure as confirmation + forward-ref tolerance + `classification-error` on true ambiguity + fallback to today's behavior on rename. |
| **Ambiguous rename bricks the plugin** | `classification-error` carries candidate names + a **pluginData-backed manual override** ("pin this collection as Reference/System/Typography"), read by `classifyCollections` before regex. No engineer source change for the migration window. |
| `fromExport`/`fromLive` diverge | Single `token-derive.ts` core + `TokenSchema` (§2.1) + two casing/alias-normalizing adapters + vitest equivalence on a mock **generated from the same export**. |
| `fromLive` alias-resolution cost | Per-call memo + a main-thread schema cache invalidated by a token that **includes an alias-target hash** (not count-only) + generation counter; `get-drift` always recomputed → one full derive per file-change, external retargets surfaced on next drift/refresh. **(⚠FIXED.)** |
| Anchor goes stale after a Figma edit | Drift check (always recomputed) + UI-side **blocking confirm on retarget** (no lock juggling) + selective write + rename-by-id + untouched-on-new-tokens + one-click gated Adopt + PR-path CI for Tier A. |
| pluginData snapshot captures mutated/swapped state | Adopt gated: alias-purity (scaling) + no-retarget-vs-**effective-anchor** (swap, §1.3.2) + size bound + version+hash tag; one-click confirm honors legitimate Figma-side retargets. **(⚠FIXED — gaps 7, 12, 13.)** |
| Stale/superseded Tier-B snapshot | `schemaVersion` + shape + **generatedAt recency vs committed Tier A** → fall back to Tier A. **(⚠FIXED — gap 17 + precedence.)** |
| Reference raw values silently scaled in a regenerated export | Alias-neutrality assertion proves the System layer; Reference magnitudes are **golden-pinned at seed** + checksum'd in the header; beyond seed, explicitly trust-based on whoever regenerates from a neutral file (documented). **(⚠FIXED — gap 14b, honestly scoped.)** |
| Loosening `SwapperSection` loses exhaustiveness | `SECTION_DISPLAY_ORDER as const`; `type SwapperSection = typeof SECTION_DISPLAY_ORDER[number]`. `ResetDomain`/`ScaleGroup` stay closed. |
| `resolveJsonModule` off / verbatim friction | Generate `.ts` (`export const … as const`), in scope for both tsconfigs; no config change. |
| TokenPanel refactor reorders UI | Drive order from the **hand-pinned `SECTION_DISPLAY_ORDER`** (NOT iteration-derived `SECTION_IDS`); `SECTION_TITLES` preserves titles; preserve `swapKey`/`resetNonce`/`presetNonce`; vitest order-assertion; Storybook stories. **(⚠FIXED — SECTION_IDS ordering.)** |
| Preset derivation under-grounded | Routed through the EXISTING live `sendPresets` (code.ts:174-206) + `applyPreset` (code.ts:313-394) — read this session — not the alias core; export's 0 preset leaves is why it's live-only. **(⚠FIXED — preset gap.)** |
| Live-mock fidelity | Mock generated from export.json (own work item), reproduces id-alias resolution, per-collection modes, `expressive` leaf, `Label/font-family` dotted-string alias, upcased types, forward-ref null case. |
| Stage 0 scope-bleed / effort-boundary | Stage 0's table rebind corrects swapper *grouping* (acknowledged = "please update"); **Stage 2 is promoted INTO the committed deliverable** as the actual "Figma is master for the swapper"; the plan never claims Stages 0–1 alone satisfy the goal. **(⚠FIXED — gaps 8 & 18.)** |
| Stage 0 ships unguarded | Stage 0 adds `check:tokens` + `verify-tokens.mjs` to release.yml (push-to-main); Stage 1 adds the PR-path job. **(⚠FIXED — Stage-0-CI gap.)** |
| `TokenSchema` undefined | Defined once in §2.1, single naming convention, imported everywhere; generated module re-exports convenience consts but their type IS `TokenSchema`. **(⚠FIXED — TokenSchema gap.)** |

---

**Files touched (absolute paths):**
- NEW `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/scripts/gen-tokens.mjs`
- NEW `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/scripts/verify-tokens.mjs`
- NEW `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/scripts/build-live-mock.mjs`
- NEW `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/src/shared/tokens.generated.ts`
- NEW `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/src/shared/token-derive.ts`
- NEW `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/src/shared/token-derive.test.ts`
- NEW `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/src/main/schema.ts`
- NEW `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/src/ui/components/DriftBanner.tsx`
- EDIT `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/src/main/code.ts`
- EDIT `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/src/shared/messages.ts`
- EDIT `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/src/ui/panels/TokenPanel.tsx`
- EDIT `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/src/ui/panels/PresetPanel.tsx`
- EDIT `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/.storybook/fixtures.ts`
- EDIT `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/.storybook/figma-messaging.mock.ts`
- EDIT `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/package.json`
- EDIT `/Users/yahiro/working/orca/test-projects/orca-variables-figma-plugin/.github/workflows/release.yml` (Stage 0: add `check:tokens`+`verify-tokens`) + NEW or EDIT `.github/workflows/ci.yml` (Stage 1: `on: pull_request` running `check:tokens && typecheck && test`)
- EDIT `/Users/yahiro/.claude/projects/-Users-yahiro-working-orca-test-projects-orca-variables-figma-plugin/memory/token-tables-source-of-truth.md`

**Ship order:** Stage 0 (fixes corruption today + executable proof + CI-on-main) → Stage 1 (tests + PR-blocking CI + selective/identity-aware reset + designer one-click gated Adopt) → Stage 2 (live engine + generated mock + alias-target-aware cache + preset routing). **Stages 0–2 are the committed deliverable** — they fix the immediate corruption AND make Figma the live master for all observable structure (including the swapper), while giving non-engineers a terminal-free, gated, rename-safe re-anchor. **Stages 3–4** (UI loop rewrite with pinned ordering + UI-side-confirm non-corrupting reset surface) are explicit follow-on that harden the experience without being required to satisfy "Figma is master."
