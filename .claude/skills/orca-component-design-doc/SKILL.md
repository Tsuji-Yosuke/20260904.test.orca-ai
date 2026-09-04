---
name: orca-component-design-doc
description: Orca のコンポーネント実装に先立ち、packages/design-language/components 配下の design-language 原典を作成・改善する。新規コンポーネント、大きな仕様変更、Figma や既存実装から意味仕様を抽出するときに使う。
argument-hint: "[component-name]"
---

# Orca コンポーネント design-language ドキュメント

`packages/design-language/components/<Name>/<Name>.md` は、コンポーネントの意味仕様の原典である。React API、Tailwind レシピ、現在の実装ログではない。

## 基本原則

- design-language 文書は、コンポーネントの役割、意味、構造、状態、アクセシビリティ、受け入れ条件を記述する。
- props、variant identifier、Tailwind class、DOM 構造は、意味仕様から各プラットフォームへ写像するときに決める。
- Figma、既存実装、Storybook、テスト、参考コンポーネントは根拠資料として読む。ただし、そのまま正とせず、意味に翻訳してから文書へ入れる。
- 見た目は Figma を優先する。寸法、余白、色、typography、radius、state の視覚表現は Figma を最初に確認する。齟齬の裁定は後述「根拠の優先順位」に従う。
- 推測した内容は要件として断定せず、前提または `Open Questions` として残す。
- 実装に進む場合は TDD を前提にする。期待される振る舞いを先に明確にし、実装パッケージ側で失敗するテストへ落とす。
- 消えて困る契約は design-language に置く。利用者に見える振る舞いはテストに置く。React 固有の一時的な写像メモだけを `packages/react/src/<Name>/<Name>.notes.md` に置く。

## 開始手順

1. `$ARGUMENTS` またはユーザーの依頼からコンポーネント名を正規化する。名前は単数形を基本とし、`ls packages/react/src` で既存実装名との衝突・単複不一致を確認する。不一致が必要な場合はユーザーに確認する（命名規則の正本は `packages/design-language/README.md`）。
2. 先にリポジトリ内の根拠を確認する。既存 design-language 文書、実装、テスト、Storybook、パッケージの `CLAUDE.md` を読む。
3. Figma を早めに確認し、構造、状態、密度、視覚的意味を抽出する。照合対象は published component の**全ノード**（`list_file_components_for_code_connect` で当該コンポーネントの Item 系と全体 symbol を列挙して両方見る。`Doc/<Name>` ページは空プレースホルダーのことが多い）。Figma の variant 名は、意味が説明できる場合だけ正式仕様へ取り込む。
   **Figma published に無い機能・状態・視覚を「暫定の既定」として仕様に書かない。** 必要だと考える場合も正式仕様にはせず、`Open Questions` に置いてユーザーの裁定を待つ（前例: Sidebar の折り畳み Group・badge・current 視覚は原典の「暫定既定」が実装まで波及し、後で全削除になった）。
4. `packages/design-language/components/<Name>/<Name>.md` があれば改善する。なければ仮説として作成する。
5. React や Web 固有の実装詳細は原則として文書に入れない。ただし、Web コンポーネントとして native 要素の意味が恒久契約になる場合は、アクセシビリティ上の契約として記述してよい。
6. 未決定事項は `Open Questions` に残す。実装を止める未決定事項がある場合は `ready` にしない。
7. `status` は保守的に設定する。

## 根拠の優先順位

1. Foundations: `packages/design-language/foundations/principles.md` / `accessibility.md`
2. 既存の design-language 文書
3. Figma design / component set
4. 既存実装、テスト、Storybook
5. ユーザー説明
6. 一般的な UI パターン知識

見た目については Figma を優先候補にする。意味仕様やアクセシビリティ契約と衝突する場合、または何を正とし、どこを更新するべきか判断が必要な場合は、齟齬を具体化してユーザーへ確認する（裁定ルールの正本はルート `CLAUDE.md`）。

## status の意味

- `draft`: 仮説段階。実装に影響する未決定事項が残っていてよい。
- `review`: 主要な意味仕様はあるが、ユーザーまたはデザイナーの確認が必要。
- `ready`: プラットフォーム実装が参照してよい。残っている `Open Questions` は依頼された実装をブロックしない。
- `deprecated`: 新規実装では使わない。後継を示す。

## ready チェックリスト

`status: ready` にするには、以下のセクションに実装可能な内容が必要
（文書は Guide / Spec の 2 部構成。割当と判断基準の正本は `packages/design-language/README.md`）。

- Guide: Purpose / Usage / User Mental Model / Anatomy / Content Model / Layout And Density / Accessibility Notes
- Spec: Interaction Model / State Model / Visual Semantics / Variants And Options / Acceptance Criteria

加えて、frontmatter の `description`（利用者向けの 1 文要約）が必要。

Foundations で定義済みの一般要件だけを繰り返さない。コンポーネント固有の追加、例外、適用範囲を書く。

Acceptance Criteria の各基準には `AC-<Name>-NN` 形式の ID が付き、ユニットテストで検証できない基準には
検証区分（`（検証: …）`）が付いていること。ready にした時点で CI の突合対象になる。

`Open Questions` は残っていてもよいが、依頼された実装をブロックしないものに限る。

## テンプレート

`packages/design-language/components/<Name>/<Name>.md` にはこの形を使う。すべてのセクションを置く。該当しない場合でも、設計判断として `Not applicable` と短く書く。

`sources` の各キーは、空なら `[]`、値があれば `- <URL またはパス>` のブロックリストで書く（実例: `components/Button/Button.md`）。

```md
---
name: ComponentName
status: draft
layer: component
description: <利用者向けの 1 文要約。variant やサイズ展開など一覧で見分けるための情報を優先（ready で必須）>
sources:
  figma:
    - <Figma design / component set の URL>
  implementations: []
  storybook: []
---

# ComponentName

## Guide

### Purpose

このコンポーネントが担う責務、解決するユーザー/プロダクト上の問題、明示的に担わないこと。

### Usage

使うべき文脈と使うべきでない文脈。**Use when** / **Do not use when** の 2 見出しで書き、
隣接コンポーネントや誤用しやすいケースは「代わりに X を使う」として示す。

### User Mental Model

ユーザーがどう認識すべきか。意図、階層、期待される結果、周辺 UI との関係。

### Anatomy

必須要素、任意要素、禁止要素。順序と各要素の責務。

### Content Model

ラベル、補助文、アイコン、値、空表示、長い内容、ローカライズ、動的内容の扱い。

### Layout And Density

密度、配置、余白意図、狭い領域での振る舞い。S / M / L や最小ターゲットなど共通語彙は、追加・例外がある場合だけ書く。

### Accessibility Notes

Foundations からの追加・例外。WAI-ARIA pattern 名、コンポーネント固有の注意、Web 実装で native 要素が意味契約になる場合の要件を書く。

## Spec

### Interaction Model

コンポーネント固有の pointer / keyboard / touch / focus / activation。Foundations の共通語彙を繰り返すのではなく、このコンポーネントで追加・例外になることを書く。

### State Model

このコンポーネントが持つ状態、遷移、優先度。共通状態を持つだけなら繰り返し説明しない。状態の有無、組み合わせ、優先度、見え方がコンポーネント固有の契約になる場合は明記する。

### Visual Semantics

色、形、強調、階層、危険、成功、選択、motion などの視覚的意味。具体 token 名より意味を優先する。

### Variants And Options

サポートする意味上の分岐。見た目だけではなく、目的や使い分けの違いを書く。

### Open Questions

未決定事項と実装への影響。

### Acceptance Criteria

プラットフォーム実装がこの文書に沿っていると言える条件。
各基準は `- AC-<Name>-NN: <本文>` の形式で安定 ID を付ける（`<Name>` は frontmatter の `name`）。
ID は永続で、基準を削除しても番号を再利用しない。
ユニットテストで検証できない基準には行末に `（検証: Storybook）` / `（検証: Foundations）` / `（検証: 対象外）` を付ける。
検証区分の無い基準は、`status: ready` になった時点で `@orca/react` のテスト名との突合が CI で強制される
（詳細は `packages/design-language/README.md`）。
```

frontmatter に `wcag.reviewed`（例: `"2.2 AA"`）を置けるのは、アクセシビリティレビューを完了した文書だけ。
フィールド定義の正本は `packages/design-language/README.md`。

## 既存文書の整理

既存文書を改善するとき:

- 既存の設計意図は保つ。
- React 型名、native props、`forwardRef`、`ReactNode`、Tailwind class、実装進捗表を design-language 原典から取り除く。
- 消えて困る意味仕様は design-language に残す。利用者に見える振る舞いは実装パッケージのテストに落とす。
- React 固有の調査ログや暫定判断だけ、必要なら `packages/react/src/<Name>/<Name>.notes.md` に短く残す。notes は恒久保管場所ではない。
- 実装へのリンクは参照として残してよいが、原典として扱わない。
- design-language、Figma、実装の不一致は `Open Questions` または実装側の既知 gap として記録し、見た目の齟齬はユーザーに確認する。
- 原典を更新したら、対応する `packages/react/src/<Name>/<Name>.notes.md` に矛盾が生じていないか確認し、stale な記述は直すか消す。

## 完了時の報告

最後に以下を報告する。

- design-language 文書のパス
- `status`
- 主な `Open Questions`
- プラットフォーム実装へ進めるか
