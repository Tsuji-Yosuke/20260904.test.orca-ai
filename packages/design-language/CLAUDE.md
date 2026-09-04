# CLAUDE.md — @orca/design-language

orca DS のデザイン言語の原典。コンポーネント文書は、React や Tailwind の実装詳細ではなく、どのプラットフォームにも先行する意味仕様として書く。

## コンポーネント文書

`components/<Name>/<Name>.md` はそのコンポーネントの SSOT。利用者向けの `## Guide` と実装者向けの `## Spec` の 2 部構成で記述する（セクション割当・frontmatter フィールド定義の正本は `README.md`）。

- Guide: 役割、使う場面、使わない場面、ユーザーのメンタルモデル、anatomy、content model、layout / density、accessibility notes
- Spec: interaction model、state model、visual semantics、variants/options の意味、open questions、acceptance criteria

props、React 型、native DOM 属性、Tailwind クラス、Storybook の暫定事情はここに置かない。React 固有の判断は `packages/react/src/<Name>/<Name>.notes.md` に残す。

## 進め方

Figma、既存実装、Storybook、参考コンポーネントは根拠資料として読む。ただし、それらをそのまま正とせず、意味に翻訳してから design-language 文書に入れる。意味が説明できない variant や state は正式仕様にせず、`Open Questions` に残す。

詳細な作成手順は `.claude/skills/orca-component-design-doc/SKILL.md` を参照。
