/**
 * 機能5: 横断チェック (Variant Consistency) のレポート組み立て。
 *
 * Component Set のバリアントを横断し、「同じ種類 (= 同じ支配軸の値) のバリアント同士が
 * 同一トークンを使っているか」を検査する。どの軸でトークンが揃うべきか (free 軸) は
 * デザインの支配的パターンから自動推論し (consistency-core)、支配軸 (gov) でグループ化して
 * 多数決の期待トークンを決め、外れたセルを指摘する。トークンの読取・再バインドは
 * inspect/node-properties.ts と共有 (機能4 と同じ判定基準)。
 *
 * 選択の解決 (どの Component Set を対象にするか) は消費者側の責務:
 * プラグインは現在選択から、CI はファイル走査から Component Set ノードを渡す。
 */

import type { LintAdapter, LintNode } from "./adapter";
import type {
  ConsistencyCandidate,
  ConsistencyExpected,
  ConsistencyGroup,
  ConsistencyPropertyReport,
  ConsistencyReport,
  VariantCellSummary,
} from "./check-types";
import { groupAndVote, inferAxes, type MatrixCell } from "./consistency-core";
import { findSystemCollections } from "./inspect/collections";
import {
  readNodeProperties,
  type PropertyReading,
} from "./inspect/node-properties";

/** 横断チェックの対象プロパティ (機能4 の行 id と対応) と表示メタ。 */
const PROPERTY_META: Record<string, { label: string; kind: "dimension" | "color" }> = {
  "dimension.height": { label: "Component Height", kind: "dimension" },
  "dimension.paddingTop": { label: "Padding Top", kind: "dimension" },
  "dimension.paddingBottom": { label: "Padding Bottom", kind: "dimension" },
  "dimension.paddingLeft": { label: "Padding Left", kind: "dimension" },
  "dimension.paddingRight": { label: "Padding Right", kind: "dimension" },
  "dimension.gap": { label: "Margin (Gap)", kind: "dimension" },
  "dimension.radius": { label: "Radius", kind: "dimension" },
  "color.background": { label: "背景色", kind: "color" },
  "color.on": { label: "Onカラー", kind: "color" },
  "color.overlay": { label: "State Layer", kind: "color" },
};

/** マトリクスのセルに元データ (nodeId・読取結果) を載せた拡張型。コアは coord/key/votable のみ読む。 */
interface RichCell extends MatrixCell {
  nodeId: string;
  reading: PropertyReading | null;
  axesMap: Record<string, string>;
}

/** Component Set の Variant 軸名を順序つきで返す (VARIANT 定義 → 無ければ実バリアントのキー)。 */
function deriveAxes(set: LintNode, variants: LintNode[]): string[] {
  const fromDefs = set.variantAxes();
  if (fromDefs && fromDefs.length > 0) return fromDefs;
  // フォールバック: 最初のバリアントの variantValues キー。
  const first = variants.find((v) => v.variantValues());
  const values = first?.variantValues();
  return values ? Object.keys(values) : [];
}

/** RichCell を表示用のセル要約に変換する (label は free 軸の座標)。 */
function toCellSummary(c: RichCell, labelAxes: string[]): VariantCellSummary {
  const r = c.reading;
  return {
    nodeId: c.nodeId,
    axes: c.axesMap,
    label: labelAxes.map((a) => `${a}=${c.axesMap[a] ?? ""}`).join(", "),
    token: r?.tokenName ?? null,
    tokenId: r?.tokenId ?? null,
    value: r?.value ?? null,
    valid: !!r && r.valid,
  };
}

/** 1 プロパティの推論結果を組み立てる (指摘のあるグループのみ)。inferable でなければ null。 */
function buildPropertyReport(
  property: string,
  axes: string[],
  data: VariantData[],
): ConsistencyPropertyReport | null {
  const meta = PROPERTY_META[property]!;
  const cells: RichCell[] = data.map((d) => {
    const r = d.readings.get(property) ?? null;
    const applicable = !!r && r.applicable;
    return {
      coord: d.axes,
      key: applicable ? (r!.tokenName ?? `raw:${r!.value ?? "?"}`) : null,
      votable: !!r && r.valid,
      nodeId: d.node.id,
      reading: r,
      axesMap: d.axes,
    };
  });

  const inf = inferAxes(axes, cells);
  if (!inf.inferable) return null;

  const labelAxes = inf.freeAxes.length > 0 ? inf.freeAxes : axes;
  const voteGroups = groupAndVote(cells, inf.govAxes);
  const groups: ConsistencyGroup[] = [];
  let outlierCount = 0;

  for (const vg of voteGroups) {
    const members = vg.members as RichCell[];

    // 期待 (最頻) トークンの詳細。
    let expected: ConsistencyExpected | null = null;
    if (vg.expectedKey) {
      const total = vg.tally.reduce((s, t) => s + t.count, 0);
      const count = vg.tally.find((t) => t.key === vg.expectedKey)?.count ?? 0;
      const ex = members.find((m) => m.votable && m.reading?.tokenName === vg.expectedKey);
      if (ex?.reading?.tokenId) {
        expected = {
          token: vg.expectedKey,
          tokenId: ex.reading.tokenId,
          value: ex.reading.value ?? "",
          count,
          total,
        };
      }
    }

    const outliers = expected
      ? members.filter((m) => m.key !== expected!.token)
      : [];
    const isFinding = vg.ambiguous || outliers.length > 0;
    if (!isFinding) continue;
    outlierCount += outliers.length;

    // ambiguous 時の手動選択肢 (票が割れた候補)。
    let candidates: ConsistencyCandidate[] | undefined;
    if (vg.ambiguous) {
      candidates = vg.tally
        .map((t) => {
          const m = members.find((mm) => mm.reading?.tokenName === t.key && mm.reading?.tokenId);
          return {
            tokenId: m?.reading?.tokenId ?? "",
            token: t.key,
            value: m?.reading?.value ?? "",
            count: t.count,
          };
        })
        .filter((c) => c.tokenId !== "");
    }

    groups.push({
      key: vg.key,
      label: inf.govAxes.map((a) => `${a}=${vg.key[a] ?? ""}`).join(", ") || "(全体)",
      expected,
      cells: members.map((m) => toCellSummary(m, labelAxes)),
      outliers: outliers.map((m) => toCellSummary(m, labelAxes)),
      ambiguous: vg.ambiguous,
      candidates,
    });
  }

  if (groups.length === 0) return null;

  return {
    property,
    label: meta.label,
    kind: meta.kind,
    freeAxes: inf.freeAxes,
    govAxes: inf.govAxes,
    inferable: true,
    axisConsistency: inf.axisConsistency,
    groups,
    outlierCount,
  };
}

/** 1 バリアントの軸座標 + プロパティ別の読取結果。 */
interface VariantData {
  node: LintNode;
  axes: Record<string, string>;
  readings: Map<string, PropertyReading>;
}

/**
 * Component Set ノードを横断検査して結果を返す。
 * set は type === "COMPONENT_SET" のノードを渡すこと (解決は呼び出し側の責務)。
 */
export async function buildConsistencyReport(
  set: LintNode,
  adapter: LintAdapter,
): Promise<ConsistencyReport> {
  const variants = set.children().filter((c) => c.type === "COMPONENT");
  const axes = deriveAxes(set, variants);

  const { dimSystem, colorSystem } = await findSystemCollections(adapter);

  const data: VariantData[] = [];
  for (const v of variants) {
    const readings = await readNodeProperties(v, dimSystem, colorSystem, adapter);
    data.push({
      node: v,
      axes: v.variantValues() ?? {},
      readings: new Map(readings.map((r) => [r.property, r])),
    });
  }

  const axisValues: Record<string, string[]> = {};
  for (const a of axes) {
    const values = new Set<string>();
    for (const d of data) {
      const val = d.axes[a];
      if (val != null) values.add(val);
    }
    axisValues[a] = [...values];
  }

  // バリアントが 1 つ以下、または軸が無ければ比較対象が無いので空で返す。
  const properties: ConsistencyPropertyReport[] = [];
  if (variants.length >= 2 && axes.length > 0) {
    for (const property of Object.keys(PROPERTY_META)) {
      const report = buildPropertyReport(property, axes, data);
      if (report) properties.push(report);
    }
  }

  const totalOutliers = properties.reduce((s, p) => s + p.outlierCount, 0);
  const ambiguousCount = properties.reduce(
    (s, p) => s + p.groups.filter((g) => g.ambiguous).length,
    0,
  );

  return {
    setNodeId: set.id,
    setName: set.name,
    axes,
    axisValues,
    variantCount: variants.length,
    properties,
    totalOutliers,
    ambiguousCount,
  };
}
