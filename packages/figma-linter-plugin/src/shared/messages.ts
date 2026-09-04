/**
 * Typed message protocol shared between the UI (iframe) and the main thread
 * (Figma sandbox). Keeping both directions in one place keeps the two sides in
 * sync and lets TypeScript catch mismatches at compile time.
 *
 * 検査結果の型 (機能4/5 の CheckRow / FixDiff / ConsistencyReport 等) は CI と共有するため
 * @orca/figma-linter-core (check-types.ts) が正本。ここから re-export するので、UI / main の
 * import 経路は従来どおりこのファイルで完結する。
 */

import type { CheckSection, ConsistencyReport, FixDiff } from "@orca/figma-linter-core";

export type {
  AnatomyMarker,
  AnatomyShape,
  CheckRow,
  CheckSection,
  CheckStatus,
  ConsistencyCandidate,
  ConsistencyExpected,
  ConsistencyGroup,
  ConsistencyPropertyReport,
  ConsistencyReport,
  FillChip,
  FixCandidate,
  FixDiff,
  VariantCellSummary,
} from "@orca/figma-linter-core";

/** A lightweight, serialisable summary of a local variable collection. */
export interface VariableCollectionSummary {
  id: string;
  name: string;
  modeCount: number;
  variableCount: number;
}

/**
 * 機能1: プリセット 1 件 (Expressive / Productive) のサマリ。
 *
 * プリセットは「同名の Extended Collection 群」を束ねたもの。Dimension System と
 * Typography System はそれぞれ別の Extended Collection ("Expressive" / "Productive")
 * で拡張されるため、UI 上の 1 プリセット = 同名 Extended Collection の集合になる。適用時は
 * 各 Extended Collection を、それが拡張している親コレクション (Dimension System /
 * Typography System) へ焼き込む (extension のモードを親モードへ写像)。
 */
export interface PresetSummary {
  /** UI 用の一意キー (プリセット名の正規化: "expressive" / "productive")。 */
  id: string;
  /** 表示名 (Extended Collection 名 = "Expressive" / "Productive")。 */
  name: string;
  /** 同名 Extended Collection の id 群 (Dimension System 用 + Typography System 用)。 */
  collectionIds: string[];
}

/**
 * 機能2 のスケール対象グループ。サイズ系 (Reference の Sizing/* = base) と
 * タイポグラフィ系 (Reference の FontSize/* = font-size) を 1 つの union で扱う。
 */
export type ScaleGroup = 'base' | 'font-size';

/**
 * 機能2: スケール対象トークン 1 件のスナップショット。
 * サイズ: Sizing/* (Reference)。タイポグラフィ: FontSize/* (Typography References)。
 * System の Component/Radius/Border/Icon は Reference への参照なので対象外 (自動追従)。
 * `shipped` は計算・表示の基準値 (出荷値)。
 */
export interface BaseTokenSnapshot {
  id: string;
  name: string; // "Sizing/md" / "FontSize/lg"
  group: ScaleGroup;
  shipped: number;
}

/** 機能2: base への書き戻し 1 件 (丸めなしの確定値)。 */
export interface BaseScaleValue {
  id: string;
  value: number;
}

/**
 * 機能3 (Token Swapper): ドロップダウンで選べる「参照先」候補 1 件。
 * System のエイリアス段 (例 Spacing/Padding/sm) が指す先となる、共有のサイズスケール
 * (Reference の Sizing/* など) の 1 トークン。`value` は解決済みの実寸で、並び順・表示・
 * オフセット (段シフト) の基準に使う。
 */
export interface RefOption {
  id: string; // 参照コレクション内の変数 id
  name: string; // "Sizing/md"
  value: number; // 解決済みの実寸 (px)
}

/**
 * 機能3 (Token Swapper): 再割り当て可能な System エイリアス段 1 件 (例 "Spacing/Padding/sm")。
 * `currentRefId` は現在のエイリアス参照先 (実数に焼かれていて参照でなければ null)。
 * `defaultRefName` は出荷時の参照先名で、オフセット (段シフト) の基準にもなる。
 */
export interface SwapperStep {
  id: string; // System 変数 id (エイリアスの実体)
  step: string; // 短縮ラベル "sm"
  defaultRefName: string; // 出荷時の参照先 "Sizing/md"
  currentRefId: string | null; // 現在のエイリアス参照先 id (参照でなければ null)
}

/**
 * 機能3: UI のセクション分け。既知は Spacing / Sizing / Typography の 3 群だが、将来 Figma
 * 側でセクションが増えても受け取れるよう任意文字列も許容する (UI は未知 section を末尾に表示)。
 * `(string & {})` で既知 3 値の補完を残しつつ任意の string を代入可能にする。
 */
export type SwapperSection = 'spacing' | 'sizing' | 'typography' | (string & {});

/**
 * 機能3 (Token Swapper): 1 つの Swapper が扱う System トークン群 (例 "Spacing/Padding")。
 * `steps` はサイズ昇順、`options` は全段で共有する参照先候補 (サイズスケール、昇順)。
 */
export interface SwapperGroup {
  id: string; // グループキー "Spacing/Padding"
  label: string; // 表示名
  section: SwapperSection;
  steps: SwapperStep[];
  options: RefOption[];
}

// ===========================================================================
// 機能4: チェックデザイン (選択コンポーネントのトークン検査 + 自動修正)
// ===========================================================================
//
// 選択中のコンポーネントが「正しい System トークン」を使っているか、実数 (生値) で
// 指定されていないかを検査する。Dimension (Height/Padding/Gap/Radius) と Color
// (背景 Fill / 中の要素の On カラー) を、トークン名の名前空間で突き合わせる。
// 「適用」は NG 項目に正しいトークンを値マッチで推定してバインドし直す (自動修正)。

/** 選択ノードのプレビュー (PNG バイト列 + 画像の自然サイズ)。 */
export interface InspectionPreview {
  bytes: Uint8Array;
  /** 画像の論理サイズ (exportAsync は effect を含むため bbox ∪ renderBounds の和)。 */
  width: number;
  height: number;
  /**
   * 画像内でのコンポーネント実ジオメトリ矩形 (正規化 0..1)。exportAsync は drop shadow / blur
   * を含めて書き出すため、画像がジオメトリより大きくなることがある。目印 (帯・寸法線) はこの
   * 矩形を基準に描き、プレビュー本体とガイドのズレを防ぐ。省略時は画像全体 (effect 無し)。
   */
  content?: { x: number; y: number; w: number; h: number };
}

/** 検査結果一式。`nodeId` は「適用」で対象を再解決するために持つ。 */
export interface InspectionResult {
  nodeId: string;
  /** コンポーネント名 (node.name)。 */
  name: string;
  /** 説明文 (component description。無ければ既定文)。 */
  description: string;
  preview: InspectionPreview | null;
  sections: CheckSection[];
  /** 適用で行う自動修正の差分一覧 (空なら適用ボタンは無効)。 */
  fixes: FixDiff[];
}

/**
 * 複数選択時の 1 コンポーネントの要約 (Index 行 + インフォバー集計用)。
 * 詳細 (sections / fixes / アナトミー) は持たず、Index 表示に必要な最小限だけを運ぶ。
 * 詳細はドリルイン時に `inspect-node` で個別取得する (全件ぶん詳細を送らず転送量を抑える)。
 */
export interface ComponentSummary {
  nodeId: string;
  /** コンポーネント名 (node.name)。 */
  name: string;
  /** Index 行のサムネイル (アナトミー目印なしの素のプレビュー)。export 失敗時 null。 */
  preview: InspectionPreview | null;
  /** 検査可能か (単一検査と同じく width が取れる)。false = バッジ/修正の対象外。 */
  supported: boolean;
  /** 正しいトークン数 (pass 行数)。 */
  pass: number;
  /** 要確認数 (fail 行数)。 */
  fail: number;
  /** 自動修正できる差分件数 (dedup 済み)。0 なら修正対象なし。 */
  fixCount: number;
}

/**
 * 検査の状態。選択なし / 検査対象外ノード / 単一結果 / 複数選択 (Index) の 4 通り。
 * `multi` は 2 つ以上選択したときに返る。各 item は要約だけを持ち、詳細はドリルインで個別取得する。
 */
export type InspectionPayload =
  | { status: 'empty' }
  | { status: 'unsupported'; nodeName: string }
  | { status: 'ok'; result: InspectionResult }
  | { status: 'multi'; items: ComponentSummary[] };

// ===========================================================================
// 機能5: 横断チェック (Variant Consistency)
// ===========================================================================
//
// Component Set のバリアントを横断し、「同じ種類 (= 同じ支配軸の値) のバリアント同士が
// 同一トークンを使っているか」を検査する。どの軸でトークンが揃うべきか (free 軸) は
// デザインの支配的パターンから自動推論し、支配軸 (gov) でグループ化して多数決の期待値を
// 決め、外れたセルを指摘する。結果型・推論ロジックは @orca/figma-linter-core (re-export 済み)。

/** Messages sent from the UI to the main thread. */
export type UIMessage =
  | { type: 'get-collections' }
  | { type: 'notify'; message: string }
  | { type: 'resize'; width: number; height: number }
  | { type: 'close' }
  // 現在のファイルが Common UI Kit 本体かどうかの問い合わせ (ブランチは別 fileKey なので除外)。
  | { type: 'get-file-info' }
  // --- 機能1: プリセット適用 ---
  | { type: 'get-presets' }
  // --- 機能1: プリセット適用 (presetId = 選択したプリセットの id。active 記録に使う) ---
  | { type: 'apply-preset'; presetId: string; collectionIds: string[] }
  // --- 機能2: サイズ調整 ---
  | { type: 'get-base-tokens' }
  | { type: 'apply-base-scale'; values: BaseScaleValue[] }
  // --- 機能2: 出荷時デフォルトへ完全復元 (size + typography を 1 回でまとめて戻す) ---
  | { type: 'reset-defaults' }
  // --- 機能3: Token Swapper (System エイリアスの再割り当て) ---
  | { type: 'get-swapper-groups' }
  | { type: 'apply-swap'; assignments: Array<{ id: string; refId: string }> }
  // --- 機能4: チェックデザイン (検査の購読 ON/OFF と自動修正) ---
  // active=true で現在の選択を即時検査し、以降の selectionchange でも自動再検査する。
  | { type: 'set-inspecting'; active: boolean }
  // nodeId の検査を再実行し、NG 項目を自動修正する。
  // choices = FixDiff.id → 選び直したトークンの Variable.id (既定と異なるものだけ)。
  | { type: 'apply-fixes'; nodeId: string; choices?: Record<string, string> }
  // --- 機能4 (複数選択): Index ドリルイン / 一括修正 ---
  // 複数選択中に Index から 1 件を選んだとき、その nodeId の詳細検査だけを取りに行く
  // (selectionchange 駆動の inspection とは別系統。選択は変えずに UI 内で詳細表示する)。
  | { type: 'inspect-node'; nodeId: string }
  // 複数の nodeId をまとめて自動修正する (Index の「一括で修正」)。
  | { type: 'apply-fixes-bulk'; nodeIds: string[] }
  // --- 機能5: 横断チェック (Variant Consistency) ---
  // 現在の選択 (Component Set) を横断検査する。
  | { type: 'get-consistency' }
  // 外れ値を期待トークン (or 手動選択) へ揃える。refId = 寄せ先 Reference 変数 id。
  | {
      type: 'apply-consistency-fixes';
      fixes: Array<{ nodeId: string; property: string; refId: string }>;
    };

/** Messages sent from the main thread to the UI. */
export type PluginMessage =
  | { type: 'collections'; collections: VariableCollectionSummary[] }
  | { type: 'error'; message: string }
  // 現在のファイルが Common UI Kit 本体 (ブランチを除く) かどうか。
  | { type: 'file-info'; isCommonUiKit: boolean }
  // --- 機能1: プリセット適用 (activeId = 現在の System 状態と一致するプリセット。無ければ null) ---
  | { type: 'presets'; presets: PresetSummary[]; activeId: string | null }
  | { type: 'apply-done'; applied: number; skipped: number }
  // --- 機能2: サイズ調整 ---
  | { type: 'base-tokens'; tokens: BaseTokenSnapshot[] }
  | { type: 'base-scale-applied'; count: number; requested: number }
  // --- 機能2: 出荷時デフォルト復元の結果 (restored = 書き戻した変数数) ---
  | { type: 'defaults-reset'; restored: number }
  // --- 機能3: Token Swapper ---
  | { type: 'swapper-groups'; groups: SwapperGroup[] }
  | { type: 'swap-applied'; count: number; requested: number }
  // --- 機能4: チェックデザイン ---
  | { type: 'inspection'; payload: InspectionPayload }
  | { type: 'fixes-applied'; fixed: number; failed: number }
  // --- 機能4 (複数選択) ---
  // ドリルインした 1 ノードの詳細結果 (検査不可・ノード消失なら result=null)。
  // nodeId は要求した id をそのまま返す (result が null でも宛先照合できるようにする)。
  | { type: 'node-inspection'; nodeId: string; result: InspectionResult | null }
  // 一括修正の結果。fixed = バインドし直した個別件数、components = 実際に変更があったコンポーネント数。
  | { type: 'bulk-fixes-applied'; fixed: number; failed: number; components: number }
  // --- 機能5: 横断チェック ---
  // report=null は選択がコンポーネントセットでないことを表す。
  | { type: 'consistency'; report: ConsistencyReport | null }
  | { type: 'consistency-applied'; fixed: number; failed: number };
