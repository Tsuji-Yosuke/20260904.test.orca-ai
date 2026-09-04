# Implementation Plans

improve スキルによる監査（2026-07-07、standard 深度、基準コミット `73dd926` =
branch `feature/search-implementation`）から生成。依存関係が許す限り下表の順に実行
する。各 executor はプラン全文を読み、STOP conditions を尊重し、完了時に自分の行の
Status を更新すること。

**基準ブランチについての注意**: プランは `feature/search-implementation`（PR #13、
main + Search 再整合）時点のコードに対して書かれた。Plan 006 が引用する
`Search.tsx` の行は PR #13 マージ後の main にのみ存在する。他のプランの引用箇所は
main と同一。各プランの Drift check が乖離を検出する。

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 012 | website のページスタイルを Tailwind ユーティリティへ統一 | P1 | M | 011 | DONE（PR #96） |
| 011 | web-prototype の視覚言語を Next.js ドキュメントサイトへ移植 | P1 | L | — | DONE（`feat/website-prototype-parity`） |
| 001 | figma-to-repo の削除が PR から欠落するバグ修正 | P1 | M | — | DONE（PR #31、マージ待ち） |
| 002 | PAT 永続化のオプトイン化と削除手段の追加 | P1 | S | — | TODO |
| 004 | token-bridge 純粋関数の単体テスト追加 | P1 | S | —（001 の後が楽） | TODO |
| 005 | token-bridge 同期の堅牢性4点修正 | P2 | S×4 | 001, 002（同一ファイル、順に） | TODO |
| 003 | Biome 導入（lint の実体化） | P1 | M | —（実行タイミング要調整） | TODO |
| 007 | CI に Turbo キャッシュ永続化 | P2 | S | — | TODO |
| 008 | stale docs 3点の是正 | P2 | S | — | TODO |
| 006 | focus リング定数と SVG アイコンの集約 | P2 | S〜M | PR #13 マージ後 | TODO |
| 009 | (spike) ダークモード最小トークン集合の確定 | P3 | M | — | TODO |
| 010 | (spike) Search/Select 共有 Option プリミティブの設計 | P3 | M | —（Select 実装より前） | DONE（PR #34 マージ済み） |

Status values: TODO | IN PROGRESS | DONE | BLOCKED（1行の理由付き） | REJECTED（1行の根拠付き）

## Dependency notes

- **012 は 011 のスタイル表現だけを修正**: 見た目・動作・トークン裁定は変更せず、6つの
  CSS Modules を Tailwind utilities へ移す。website typography token file と layout constants
  は維持し、DOM を所有する箇所の子孫セレクタは要素自身の class へ置き換える。PR #96 上で
  別コミットにして、1440×900 / 375×812 の基準画面を移行前後で比較する。
- **011 は既存プランから独立**: `apps/website/**` のサイト固有レイアウトだけを対象にし、
  design-language / token-pipeline / React コンポーネントは read-only とする。色・focus は
  Orca token を優先し、タイポグラフィは website 内の独立 token file に隔離する裁定済み。
  513px hero / 960px breakpoint も website layout file へ隔離する裁定済み。その他の余白・
  レイアウトに exact token がない場合や URL 設計に差が出た場合は、近似せず STOP condition
  に従う。
- **001 → 004 → 005 の順を推奨**: 3プランとも token-bridge の同じ領域に触れる。
  001 が export.test.ts を変更し、004 のフィクスチャは 001 のものを参考にでき、
  005 は code.ts の行番号が 002 適用で動く（005 の Drift check は内容ベース突合を
  指示済み）。
- **003（Biome）は全ファイルに触れる一括整形を含む**: open 中のコンポーネント
  再整合 PR（#14〜#20）と激しく衝突するため、実行タイミングをオペレーターと
  合意してから着手する。他プランより先に走らせる場合、後続プランは rebase 後に
  `pnpm format` を一度かける。
- **006 は PR #13（Search）マージ後**: 引用行が PR #13 の内容を前提とする。
- **010 は Select 実装（PR #15 系統の再整合）より前に完了させる**: 結論が Select
  実装プランの入力になる。
- 009 / 010 の成果物は `plans/spike-notes/` に置く（ソースツリーを汚さない）。

## Findings considered and rejected

（再監査防止のための記録。監査 finding ID は監査レポート由来）

- **TEST-05**（preprocess-tokens.mjs の一部 export に単体テストが無い）: CI の
  `tokens:check` がゴールデン差分として実質的な特性テストになっており、退行は
  generated/ 差分で捕捉される。単体粒度の投資は今は見送り。
- **PERF-02**（applyDiffSelections の O(n·m) 走査）: トークン数が数百オーダー、
  適用は対話的・低頻度のため実害なし。コレクションが数千規模になったら再訪。
- **PERF-03**（Storybook DocsRenderer の 884kB チャンク警告）: Storybook 本体の
  ベンダーチャンクであり自前コードではない。対処しても得るものが薄い。

## Backlog（finding として確定済みだが今回はプラン化しなかったもの）

- **CORRECT-02**: PR 生成がコレクションファイル自体の削除を表現できない（Plan 001 と
  同根の上位問題）。v1 スコープの判断が必要 — sync-spec.md に削除粒度の明記が無い。
  Plan 001 完了後にオペレーターと要否を判断。
- **DEBT-04**: size 命名の分裂（`sm|md|lg` vs `small|medium|large`）。公開 API の
  破壊的変更を伴うため、design-language 側の語彙確認とユーザー判断が先。
- **DEBT-05**: 契約テストが「ready 原典 ⇔ React 実装の存在」を検証しない。S 効あり、
  次回サイクルの有力候補。
- **DEP-01**: Base UI 1.0.0-rc.0 の exact pin。安定版リリースの追跡手段（issue 等）を
  置き、リリース後に移行プランを起票。
- **DEP-02/03**: Vite メジャー分裂（5/7）と Storybook 8.6→9 移行。連動して1つの
  移行プランにすべき。急ぎではない。
- **TEST-01/02 + DEBT-03**: `plugin/figma.ts`（691行）の特性テスト整備と分割。
  L 級。Plan 004 完了後の次サイクル本命。
- **DIR-03**: Tabs のオーバーフローアフォーダンス（フェード/矢印）と選択タブの
  自動スクロールイン。原典 Open Questions に記録済み。要否判断から。
