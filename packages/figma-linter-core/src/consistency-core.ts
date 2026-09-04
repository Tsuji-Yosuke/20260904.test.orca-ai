/**
 * 機能5: 横断チェック (Variant Consistency) の純推論コア。
 *
 * Figma 非依存。バリアントのマトリクス (軸座標 → 比較キー) から、
 * 「トークンが揃うべき軸 (free)」をデザインの支配的パターンから自動推論し、
 * 「変えてよい軸 (gov)」でグループ化して多数決の期待キーを決める。
 *
 * 設計方針:
 * - ルールはコードに持たず、デザインから導出する (このリポジトリの哲学に沿う)。
 * - 推論には votable セル (= 正しいトークン) のみを使い、生値/誤りに歪められない。
 * - 規則を推定できない (全軸で変わる / 標本が少ない) ときは何も指摘しない (誤検知ガード)。
 */

/** 推論・グルーピングの入力となる 1 セル。 */
export interface MatrixCell {
  /** 軸座標 (例 { Type: "Primary", Size: "Large", State: "Enabled" })。 */
  coord: Record<string, string>;
  /** 比較キー (トークンの同一性)。null = 対象外 (na) でマトリクスから除外する。 */
  key: string | null;
  /** 多数決に参加するか。正しいトークン (valid) のみ true、生値/誤りは false。 */
  votable: boolean;
}

/** 軸の推論結果。 */
export interface AxisInference {
  /** 揃うべき軸 (この軸方向にトークンが一定であるべき = 横軸)。 */
  freeAxes: string[];
  /** トークンを変えてよい軸 (グルーピングのキー)。 */
  govAxes: string[];
  /** 規則を推定できたか。false = 指摘を出さない。 */
  inferable: boolean;
  /** 透明性表示用: 各軸の一定度 0..1。 */
  axisConsistency: Record<string, number>;
}

/** グループ内のキー別集計 1 件。 */
export interface KeyTally {
  key: string;
  count: number;
}

/** gov 座標でまとめた 1 グループの多数決結果。 */
export interface VoteGroup {
  /** gov 座標 (グループキー)。 */
  key: Record<string, string>;
  /** このグループの applicable セル (key !== null)。 */
  members: MatrixCell[];
  /** 最頻キー (votable の多数決)。決め手が無ければ null。 */
  expectedKey: string | null;
  /** 票が割れて自動決定できない (votable のトップが同数)。 */
  ambiguous: boolean;
  /** votable の集計 (件数降順 → キー昇順)。ambiguous 時の選択肢にも使う。 */
  tally: KeyTally[];
}

/** free 軸とみなす一定度のしきい値の既定。 */
export const DEFAULT_FREE_THRESHOLD = 0.8;

/** axisSubset の座標が同じセルをまとめる (挿入順を保つ)。
 *  キーは値配列の JSON 化で作るので、軸値に区切り文字が含まれても衝突しない。 */
function groupByAxes(
  cells: MatrixCell[],
  axisSubset: string[],
): Map<string, MatrixCell[]> {
  const out = new Map<string, MatrixCell[]>();
  for (const cell of cells) {
    const k = JSON.stringify(axisSubset.map((a) => cell.coord[a] ?? ""));
    const bucket = out.get(k);
    if (bucket) bucket.push(cell);
    else out.set(k, [cell]);
  }
  return out;
}

/**
 * 各軸の一定度を測り、free / gov に振り分ける。
 *
 * consistency(a) = (a 方向で一定な線 / 評価対象の線)。線 = a 以外の座標を固定して a だけ
 * 動かしたセル群。votable が 2 つ以上ある線だけを評価し、その線上のキーが全て等しければ一定。
 * 評価対象の線が無い (軸が 1 値 or 疎) 軸は反証が無いので free 扱い (1.0)。
 *
 * inferable: votable が 2 未満、または free 軸が 0 (= 全軸でトークンが変わる) のときは false。
 */
export function inferAxes(
  axes: string[],
  cells: MatrixCell[],
  opts?: { freeThreshold?: number },
): AxisInference {
  const threshold = opts?.freeThreshold ?? DEFAULT_FREE_THRESHOLD;
  const votable = cells.filter((c) => c.votable && c.key !== null);

  const axisConsistency: Record<string, number> = {};
  const freeAxes: string[] = [];
  const govAxes: string[] = [];

  for (const a of axes) {
    const others = axes.filter((x) => x !== a);
    const lines = groupByAxes(votable, others);
    let evaluable = 0;
    let constant = 0;
    for (const line of lines.values()) {
      if (line.length < 2) continue; // 2 つ以上ないと比較できない
      evaluable++;
      const first = line[0]!.key;
      if (line.every((c) => c.key === first)) constant++;
    }
    const consistency = evaluable === 0 ? 1 : constant / evaluable;
    axisConsistency[a] = consistency;
    if (consistency >= threshold) freeAxes.push(a);
    else govAxes.push(a);
  }

  const inferable = votable.length >= 2 && freeAxes.length > 0;
  return { freeAxes, govAxes, inferable, axisConsistency };
}

/**
 * gov 座標でグループ化し、votable セルで多数決する。
 * outlier 判定 (期待キーと違う applicable セル) は呼び出し側で行う。
 *
 * - expectedKey: votable の最頻キー。トップが同数なら null (ambiguous)。votable が無ければ null。
 * - members: グループの applicable セル (key !== null。生値/誤りも含む)。
 */
export function groupAndVote(
  cells: MatrixCell[],
  govAxes: string[],
): VoteGroup[] {
  const applicable = cells.filter((c) => c.key !== null);
  const grouped = groupByAxes(applicable, govAxes);
  const groups: VoteGroup[] = [];

  for (const members of grouped.values()) {
    const rep = members[0]!;
    const key: Record<string, string> = {};
    for (const a of govAxes) key[a] = rep.coord[a] ?? "";

    const counts = new Map<string, number>();
    for (const c of members) {
      if (!c.votable || c.key === null) continue;
      counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
    }
    const tally: KeyTally[] = [...counts.entries()]
      .map(([k, count]) => ({ key: k, count }))
      .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : 1));

    let expectedKey: string | null = null;
    let ambiguous = false;
    if (tally.length === 1) {
      expectedKey = tally[0]!.key;
    } else if (tally.length >= 2) {
      if (tally[0]!.count === tally[1]!.count) ambiguous = true;
      else expectedKey = tally[0]!.key;
    }

    groups.push({ key, members, expectedKey, ambiguous, tally });
  }

  return groups;
}
