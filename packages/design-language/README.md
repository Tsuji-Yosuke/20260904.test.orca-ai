# @orca/design-language

orca デザインシステムの SSOT。人間にも AI にも読めるように、自然言語で書かれた原典（`DESIGN.md`、`foundations/`、`components/<Name>/<Name>.md`）を提供します。

## コンポーネント文書の構成（Guide / Spec 2 部構成）

コンポーネント文書は、読者の違いに合わせて 2 部で構成します。

- `## Guide` — **利用者向け**。コンポーネントを使う開発者・デザイナーが「使うかどうか」「どう使うか」を判断するために読む。
- `## Spec` — **実装者向け**。プラットフォーム実装とテストが準拠を検証するための契約。

セクションの割当は次のとおり固定とします（順序も含む）。各セクションは `###` 見出しで置き、該当しない場合でも `Not applicable` と短く書きます。

```md
# <Name>

## Guide

### Purpose
### Usage            ← **Use when** / **Do not use when** の 2 見出しを含む
### User Mental Model
### Anatomy
### Content Model
### Layout And Density
### Accessibility Notes

## Spec

### Interaction Model
### State Model
### Visual Semantics
### Variants And Options
### Open Questions
### Acceptance Criteria
```

文書全体にかかる前提（例外的な構成の理由など）が必要な場合に限り、`# <Name>` 直後・`## Guide` の前に前提を述べる `##` セクションを 1 つだけ置けます（既成例: Table の「本原典の前提（重要）」）。

割当の判断基準は「そのコンポーネントを**使う人**が読む価値のある記述は Guide、**実装・検証する人**だけが読む契約は Spec」。境界事例は次の理由で確定済みです。

- Content Model / Layout And Density は Guide。ラベル文言・ローカライズ・密度の使い分けは利用者が守るルールのため。
- Interaction Model / State Model / Visual Semantics は Spec。DOM・状態遷移・token への写像契約のため。
- Accessibility Notes は Guide。利用側の実装（ラベル指定など）に影響する注意を含むため。実装契約となる要件は Acceptance Criteria にも AC ID として現れる。
- Open Questions は Spec。仕様の未決事項であり利用判断の材料にしないため。

## frontmatter のフィールド定義

```yaml
---
name: Button                 # 必須。単数形。ディレクトリ名・AC ID・React 実装名と一致（命名規則は後述）
status: ready                # 必須。draft / review / ready / deprecated
layer: component             # 必須。現状 component のみ
description: primary / secondary / ghost と 3 サイズ、前後アイコンを備えたボタン。
                             # ready では必須。用途がわかる日本語 1 文（句点まで）。
                             # ドキュメントサイトのページヘッダーと registry の説明文の正本
wcag:                        # 任意。WCAG レビューを実施済みの場合のみ置く
  reviewed: "2.2 AA"         #   レビュー基準（バージョン + 適合レベル）
sources:                     # 必須。各キーは空なら []、あればブロックリスト
  figma:
    - <URL>
  implementations: []        # 命名不一致がある場合は実装パスを記録（命名規則を参照）
  storybook: []
---
```

- `description` は「何ができるコンポーネントか」を要約する。Purpose の言い換えではなく、variant やサイズ展開など利用者が一覧で見分けるための情報を優先する。
- `wcag.reviewed` は、アクセシビリティレビューを完了した文書にだけ記載する。未記載はレビュー未実施を意味し、ドキュメントサイトはバッジを表示しない。レビューをやり直したら値を更新する。
- フィールドの追加はこの README への定義追記とセットで行う。定義の無いフィールドを文書へ足さない。

## Acceptance Criteria の契約（AC ID）

`status: ready` のコンポーネント文書の Acceptance Criteria（`## Spec` 配下の `### Acceptance Criteria`）は、機械可読な契約として扱います。

- 各基準は `- AC-<Name>-NN: <本文>` の形式で安定 ID を持つ。`<Name>` は frontmatter の `name` と一致させる。
- ID は永続とし、基準を削除しても番号を再利用しない。
- ユニットテストで検証できない基準には、行末に検証区分 `（検証: Storybook）` / `（検証: Foundations）` / `（検証: 対象外）` を付ける。
- 検証区分の無い基準は、`@orca/react` のテスト名に同じ ID が現れることを CI（`@orca/react` の contracts テスト）が検証する。ID がテストに無い、テスト側に未知の ID がある、ready 文書の基準に ID が無い、のいずれも CI が落ちる。

## 命名規則

- コンポーネント名（frontmatter の `name`、`components/<Name>/` ディレクトリ、AC ID の `<Name>`）は単数形を基本とし、React 実装のコンポーネント名・ディレクトリ名と一致させる。
- やむを得ず不一致にする場合（既成例: 原典 `Chips` / 実装 `Chip`）は、ユーザー確認の上、原典 frontmatter の `sources.implementations` に実装パスを記録する。AC ID は原典 `name` 基準のまま維持する。

## 関連

- トークン管理: `@orca/token-pipeline`
- Figma 同期: `@orca/token-bridge-figma`
- 同期仕様の正本: [`@orca/token-bridge-figma/docs/sync-spec.md`](../token-bridge-figma/docs/sync-spec.md)
