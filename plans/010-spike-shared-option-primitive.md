# Plan 010 (spike): Search / Select が共有する Option プリミティブの所属と依存方向を確定する

> **Executor instructions**: これは **design/spike プラン** — 成果物は設計メモで
> あり、プロダクションコードの変更は行わない。「STOP conditions」発生時は停止して
> 報告。完了したら `plans/README.md` の Status を更新する。
>
> **Drift check (最初に実行)**: `git diff --stat 73dd926..HEAD -- packages/design-language/components/Search/Search.md packages/design-language/components/Select/Select.md packages/react/src/Search`
> 差分がある場合は「Current state」の引用と現物を突合し、不一致なら STOP。

## Status

- **Priority**: P3
- **Effort**: M（設計判断 + API スケッチ。実装は含まない）
- **Risk**: MED（既出荷の Search の内部構造に影響する決定を含む）
- **Depends on**: none（ただし Select 実装（PR #15 系統）の**前**に完了しているべき）
- **Category**: direction (design/spike)
- **Planned at**: commit `73dd926`, 2026-07-07

## Why this matters

Select の design-language 原典と Search の原典が、同一の未決事項 —「候補リストの
Item / Option をどちらの所属にするか、依存方向をどうするか」— を互いに投げ合って
循環しており、どちらの文書単独でも解けない。これは Select 実装の実質的ブロッカーで
あり、放置すると Select 実装時に既出荷の Search サジェスト面を後追い改修する二度手間が
確定する。横断の設計判断を1本のメモで確定させる。

## Current state

- `packages/design-language/components/Search/Search.md` Open Questions（引用・確認済み）:
  > **Suggestion Surface のデザイン**（Search 本体に内蔵するか、Combobox 等の別コンポーネントに委ねるか）。… Select の Item / Option を共有プリミティブとして使う前提だが、Surface 自体の境界連続性・影・最大高さ等は未定。

  Search は `status: ready` で React 実装済み。Suggestion Surface は Base UI
  Autocomplete（実体は Combobox パーツ群）への委譲を「暫定の既定」として採用中。

- `packages/design-language/components/Select/Select.md` Open Questions（引用・確認済み）:
  > Item / Option を Select と Search のどちらの所属として実装上公開するか。design-language 上は共有プリミティブとして位置付けるが、パッケージ構造の置き場所は実装段階の判断。Search 側の依存方向（Search → Select.Item か、両者 → 共通 Option か）も合わせて決める必要がある。

  Select は `status: draft`、React 未実装。Select.md の Acceptance Criteria には
  既に「Item / Option は Select と Search の Suggestion Surface の双方で同じ視覚・
  振る舞いで再利用でき、所属パッケージが変わっても意味が変わらない」がある。

- React 側の現状（確認済み）: `packages/react/src/Search/Search.tsx` はサジェスト
  候補を `Autocomplete.Item`（Base UI の ComboboxItem の再 export）+ token クラスで
  直接描画している。共有 Option モジュールは存在しない。
- 関連する決定済み事項:
  - Base UI の採用は正式決定（複合コンポーネントはヘッドレスプリミティブ上に
    token スタイル）。Base UI では Autocomplete と Select が**別パーツ**であり、
    Item も別（`ComboboxItem` vs Select の Item）。
  - Figma 実データ: Search の component_set（node 1748-16971）の Active 状態には
    Select/Menu/MenuItem テンプレート由来の候補リストが置かれているが、その
    チェックボックス風装飾は**採用しない**とユーザーが明言済み（2026-07-07）。
  - design-language の原典編集には project skill `/orca-component-design-doc` を
    使う運用（ルート CLAUDE.md）。
- 命名規則の正本: `packages/design-language/README.md`（AC ID 規約・単複例外の記録
  など）。新しい共有プリミティブを原典化する場合はここに従う。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| 参照確認 | `grep -rn "Autocomplete.Item" packages/react/src/Search/Search.tsx` | 現状の使用箇所が見える |
| Base UI パーツ確認 | `cat packages/react/node_modules/@base-ui-components/react/select/index.parts.js` 等 | Select パーツ一覧 |

## Scope

**In scope**（作成してよいもの）:
- `plans/spike-notes/010-option-primitive-design.md`（新規 — 成果物）

**Out of scope**:
- `packages/design-language/components/**` の編集（結論の反映は
  `/orca-component-design-doc` skill を使う後続作業 — このメモはその入力）
- `packages/react/src/**` の編集
- Select の実装そのもの

## Git workflow

- ブランチ: `spike/option-primitive-design`
- コミット: `docs(plans): option primitive design spike findings`

## Steps

### Step 1: Base UI 側の制約を実測する

`packages/react/node_modules/@base-ui-components/react/` の select / combobox /
autocomplete のパーツ実装（index.parts.js と各 Item 実装）を読み、以下を事実として
確定する:
1. Autocomplete.Item（=ComboboxItem）と Select.Item は同一実装か別実装か
2. 双方の Item が公開する data 属性（data-highlighted / data-selected 等）の異同
   （**属性名を仮定せず実ソースで確認** — Tabs で data-selected が存在しなかった
   前例がこのリポジトリの記録にある）
3. スタイル層だけを共有する場合に必要な最小インターフェース

**Verify**: メモに「Base UI 制約」節があり、上記3点が実ソースの根拠付きで書かれている

### Step 2: 3案を比較して1案を推す

少なくとも以下の3案を、Base UI 制約・design-language の意味論・既出荷 Search への
影響の3軸で比較する:
- **A: 共通 `Option` プリミティブ**（`packages/react/src/internal/` に視覚層のみの
  共有モジュールを置き、Search は Autocomplete.Item に、Select は Select.Item に
  それぞれ被せる。公開 API にしない）
- **B: Select.Item を正とし Search が依存**（Select 実装後に Search を改修）
- **C: 共有しない**（token クラス文字列の共有定数のみ。意味論の共有は design-language
  文書レベルに留める）
- 判断基準に「Select.md の AC『所属パッケージが変わっても意味が変わらない』を
  満たせるか」を必ず含める。
- 推し案を明記し、他案を捨てる理由を1〜2文ずつ書く。

**Verify**: メモに3案の比較表と推奨案がある

### Step 3: 推奨案の API スケッチと影響範囲

推奨案について:
1. モジュール配置（例: `packages/react/src/internal/option.tsx` — 公開/非公開の別）
2. props / 受け取る状態（highlighted / selected / disabled）と token クラスの対応表
3. 既存 Search.tsx の改修差分の見積もり（何行程度・どの部分か）
4. Search.md / Select.md の Open Questions をどう書き換えるかの文面案
   （適用は `/orca-component-design-doc` で行う旨を明記）
5. Surface（影・最大高さ・境界連続性）の決定は**含めない**なら、残る Open Question
   として明示する

**Verify**: メモに上記5点がある

### Step 4: 未解決事項と次アクションの列挙

- デザイナー確認が要る点（視覚仕様）と、実装判断で閉じられる点を分離する。
- 次アクション: (1) design-language 原典の更新（skill 使用）、(2) Select 実装
  プランへの引き継ぎ事項、を箇条書きにする。

**Verify**: メモが「次アクション」節で終わっている

## Test plan

- spike のためテストなし。成果物メモの完全性チェック（各 Step の Verify）が代替。

## Done criteria

- [ ] `plans/spike-notes/010-option-primitive-design.md` が存在し、Base UI 制約 /
      3案比較 / API スケッチ / 次アクションの4節を含む
- [ ] `git status` で design-language / react のソースに変更が無い
- [ ] `plans/README.md` の Status 更新

## STOP conditions

- Base UI の Select パーツがこのバージョン（1.0.0-rc.0）に存在しない、または
  Combobox と Item 実装を共有していて「依存方向の選択」自体が消滅する場合
  （前提が変わる — 発見内容を報告して判断を仰ぐ）。
- Search.md / Select.md の Open Questions が既に解消されている（誰かが先に決めた）。

## Maintenance notes

- この決定は Sidebar / Dropdown / Table 等、候補リストを持つ他コンポーネントの
  実装（open PR #14〜#20 の再整合）にも波及する。メモの結論はそれらのプラン作成時の
  入力になる。
- Base UI が RC 版である点に注意（監査 DEP-01）: 安定版で Item の data 属性が
  変わる可能性があるため、メモには「確認した Base UI バージョン」を明記すること。
