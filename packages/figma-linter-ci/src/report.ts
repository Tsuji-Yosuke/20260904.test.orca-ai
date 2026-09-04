/**
 * lint-report.json のスキーマと安定キー。
 *
 * レポートは「前回実行との差分」で Slack 通知を制御するための正本になるため、
 * - 違反は安定キー (ルール ID + ページ / コンポーネント / ノードパスの名前ベース) で識別する。
 *   node-id は参考情報として持つが、キーには使わない (再構築で変わりうる揮発値のため)。
 * - 機能5 のキーに「期待トークン」を含めない (多数決の結果が動いても同じ違反として扱い、
 *   再通知の振動を防ぐ)。
 * - 出力は決定的にする (violations はキーでソート)。
 */

export const REPORT_SCHEMA_VERSION = 1;

export interface LintViolation {
  /** 安定キー (差分判定の識別子)。 */
  key: string;
  /** check = 機能4 (単体検査) / consistency = 機能5 (バリアント比較)。 */
  feature: "check" | "consistency";
  /** ルール ID (機能4: "dimension.paddingLeft" 等 / 機能5: "consistency.dimension.gap" 等)。 */
  ruleId: string;
  page: string;
  /** コンポーネント表示名 (バリアントは "Set名 / Size=md, State=Hover")。 */
  component: string;
  /** ルートから違反ノードまでの名前パス ("" = ルート自身)。 */
  nodePath: string;
  /** 参考情報 (Figma deep link 用)。キーには使わない。 */
  nodeId: string;
  /** ルール表示名 (機能4: "Padding Left" 等 / 機能5: プロパティ表示名)。 */
  label: string;
  /** 現在の適用内容 (トークン名 / 実数 / hex)。 */
  current: string;
  /** 修正候補 (最近傍トークンの提案。read-only 算出)。 */
  suggestion?: string;
  /** 機能5: グループの期待 (最頻) トークン。 */
  expected?: string;
  /** 追加の説明 (機能4 の row.detail 等)。 */
  detail?: string;
  /**
   * この違反が属する Component Set の総バリアント数 (スタンドアロンは undefined)。
   * 通知の影響範囲表記 (「全60バリアント」「24/60バリアント」) に使う表示用の参考値。
   */
  setVariantCount?: number;
  deepLink: string;
}

export interface LintReportSummary {
  /** 機能4: 検査したルート (マスターコンポーネント) 数。 */
  componentsChecked: number;
  /** 機能4: 展開後に検査したノード数。 */
  nodesChecked: number;
  /** 機能5: 検査した Component Set 数。 */
  setsChecked: number;
  /** 機能4: pass / fail 行数 (na は数えない)。 */
  pass: number;
  fail: number;
  /** 機能5: フィルタ後の違反数。 */
  consistencyOutliers: number;
  /** 機能5: 票が同数で通知しなかったグループ数 (透明性のため記録)。 */
  ambiguousGroups: number;
  excludedPages: string[];
  excludedComponents: string[];
}

export interface LintReport {
  schemaVersion: typeof REPORT_SCHEMA_VERSION;
  fileKey: string;
  fileName: string;
  generatedAt: string;
  scope: {
    pageExcludePrefixes: string[];
    componentExcludePrefixes: string[];
  };
  summary: LintReportSummary;
  /** 取得失敗・不完全・環境不備の警告 (沈黙させない)。 */
  warnings: string[];
  violations: LintViolation[];
}

/** 機能4 の違反キー。 */
export function checkViolationKey(v: {
  page: string;
  component: string;
  nodePath: string;
  ruleId: string;
}): string {
  return ["check", v.page, v.component, v.nodePath, v.ruleId].join("|");
}

/**
 * 機能5 の違反キー。多数決・軸推論の結果 (期待トークンやグループ座標) を含めない —
 * どちらも他セルの修正で動くため、含めると同じ外れセルが「解消 + 新規」として再通知される。
 * セルの同一性は axes (バリアント座標) だけで一意になる。
 */
export function consistencyViolationKey(v: {
  page: string;
  setName: string;
  property: string;
  axes: Record<string, string>;
}): string {
  const axesSig = Object.entries(v.axes)
    .map(([k, val]) => `${k}=${val}`)
    .sort()
    .join(",");
  return ["consistency", v.page, v.setName, v.property, axesSig].join("|");
}

/**
 * キー衝突の解消。Figma は同名ページ・同名コンポーネント・同名兄弟フレームを許すため、
 * 名前ベースのキーは衝突しうる。生成順 (ドキュメント順で決定的) に 2 件目以降へ `#n` を
 * 付けて識別する。片方が解消されると件数が減り、末尾のサフィックス付きキーから消える。
 */
export function disambiguateKeys(violations: LintViolation[]): void {
  const counts = new Map<string, number>();
  for (const v of violations) {
    const n = (counts.get(v.key) ?? 0) + 1;
    counts.set(v.key, n);
    if (n > 1) v.key = `${v.key}#${n}`;
  }
}
