import { describe, expect, it } from "vitest";
import {
  groupAndVote,
  inferAxes,
  type MatrixCell,
} from "./consistency-core";

/**
 * 機能5 横断チェックの純推論コア (Figma 非依存) の回帰テスト。
 * 軸の自動推論 (inferAxes) とグループ多数決 (groupAndVote) を、ボタンを模した
 * Type × Size × State のマトリクスで検証する。
 */

type AxisMap = Record<string, string[]>;
type TokenFn = (coord: Record<string, string>) => {
  key: string | null;
  votable?: boolean;
};

/** 軸定義から全組み合わせのセルを生成する (tokenFn で各セルのキー/votable を決める)。 */
function buildMatrix(axes: AxisMap, tokenFn: TokenFn): MatrixCell[] {
  const names = Object.keys(axes);
  const cells: MatrixCell[] = [];
  const rec = (i: number, coord: Record<string, string>) => {
    if (i === names.length) {
      const t = tokenFn(coord);
      cells.push({
        coord: { ...coord },
        key: t.key,
        votable: t.votable ?? t.key !== null,
      });
      return;
    }
    const a = names[i]!;
    for (const v of axes[a]!) rec(i + 1, { ...coord, [a]: v });
  };
  rec(0, {});
  return cells;
}

const BUTTON: AxisMap = {
  Type: ["Primary", "Secondary", "Ghost"],
  Size: ["Small", "Medium", "Large"],
  State: ["Enabled", "Hover"],
};
const AXES = ["Type", "Size", "State"];

describe("inferAxes", () => {
  it("背景fill (Type+State で決まる) → free=Size, gov=Type/State", () => {
    const cells = buildMatrix(BUTTON, ({ Type, State }) => ({
      key: `fill:${Type}:${State}`,
    }));
    const inf = inferAxes(AXES, cells);
    expect(inf.freeAxes).toEqual(["Size"]);
    expect([...inf.govAxes].sort()).toEqual(["State", "Type"]);
    expect(inf.inferable).toBe(true);
    expect(inf.axisConsistency.Size).toBe(1);
    expect(inf.axisConsistency.Type! < 0.8).toBe(true);
    expect(inf.axisConsistency.State! < 0.8).toBe(true);
  });

  it("寸法 (Size で決まる) → 同じアルゴリズムで free=Type/State, gov=Size に反転", () => {
    const cells = buildMatrix(BUTTON, ({ Size }) => ({ key: `dim:${Size}` }));
    const inf = inferAxes(AXES, cells);
    expect([...inf.freeAxes].sort()).toEqual(["State", "Type"]);
    expect(inf.govAxes).toEqual(["Size"]);
    expect(inf.inferable).toBe(true);
    expect(inf.axisConsistency.Size! < 0.8).toBe(true);
  });

  it("全体で一定 → 全軸 free・gov 空でも inferable", () => {
    const cells = buildMatrix(BUTTON, () => ({ key: "radius:md" }));
    const inf = inferAxes(AXES, cells);
    expect([...inf.freeAxes].sort()).toEqual(["Size", "State", "Type"]);
    expect(inf.govAxes).toEqual([]);
    expect(inf.inferable).toBe(true);
  });

  it("全軸でトークンが変わる (ピア無し) → inferable=false で指摘しない", () => {
    const cells = buildMatrix(BUTTON, ({ Type, Size, State }) => ({
      key: `x:${Type}:${Size}:${State}`,
    }));
    const inf = inferAxes(AXES, cells);
    expect(inf.freeAxes).toEqual([]);
    expect(inf.inferable).toBe(false);
  });

  it("votable が少なすぎる (標本不足) → inferable=false", () => {
    const cells: MatrixCell[] = [
      { coord: { Type: "Primary", Size: "Small", State: "Enabled" }, key: "fill:a", votable: true },
    ];
    const inf = inferAxes(AXES, cells);
    expect(inf.inferable).toBe(false);
  });

  it("生値/誤り (votable=false) は推論を歪めない", () => {
    // 背景fill パターンだが、1 セルだけ生値。Size 方向の一定度は valid セルだけで測るので維持される。
    const cells = buildMatrix(BUTTON, ({ Type, Size, State }) => {
      if (Type === "Primary" && Size === "Large" && State === "Enabled") {
        return { key: "raw:14", votable: false };
      }
      return { key: `fill:${Type}:${State}` };
    });
    const inf = inferAxes(AXES, cells);
    expect(inf.freeAxes).toEqual(["Size"]);
    expect(inf.axisConsistency.Size).toBe(1);
  });

  it("少数の外れ (1 本) があっても多数が一定なら free のまま (しきい値 0.8)", () => {
    // Size 方向 6 本の線のうち 1 本だけ崩す → 5/6 ≈ 0.83 ≥ 0.8 → Size は free。
    const cells = buildMatrix(BUTTON, ({ Type, Size, State }) => {
      if (Type === "Primary" && State === "Enabled" && Size === "Large") {
        return { key: "fill:Primary:Enabled:ODD" };
      }
      return { key: `fill:${Type}:${State}` };
    });
    const inf = inferAxes(AXES, cells);
    expect(inf.freeAxes).toContain("Size");
    expect(inf.axisConsistency.Size!).toBeCloseTo(5 / 6, 5);
  });

  it("freeThreshold を上げると一定度が足りない軸は gov に倒れる", () => {
    // 同じ 5/6 ≈ 0.83。閾値 0.9 では Size は free から外れる (= 厳しめ設定)。
    const cells = buildMatrix(BUTTON, ({ Type, Size, State }) => {
      if (Type === "Primary" && State === "Enabled" && Size === "Large") {
        return { key: "fill:Primary:Enabled:ODD" };
      }
      return { key: `fill:${Type}:${State}` };
    });
    const inf = inferAxes(AXES, cells, { freeThreshold: 0.9 });
    expect(inf.freeAxes).not.toContain("Size");
  });
});

describe("groupAndVote", () => {
  it("gov=Type/State で 6 グループ・各 3 セル (Size 総当たり)", () => {
    const cells = buildMatrix(BUTTON, ({ Type, State }) => ({
      key: `fill:${Type}:${State}`,
    }));
    const groups = groupAndVote(cells, ["Type", "State"]);
    expect(groups).toHaveLength(6);
    for (const g of groups) expect(g.members).toHaveLength(3);
  });

  it("多数決で期待キーを決め、ambiguous にならない", () => {
    const cells = buildMatrix(BUTTON, ({ Type, Size, State }) => {
      if (Type === "Primary" && State === "Enabled" && Size === "Large") {
        return { key: "fill:Primary:Hover" }; // 1 件だけ別トークン
      }
      return { key: `fill:${Type}:${State}` };
    });
    const groups = groupAndVote(cells, ["Type", "State"]);
    const g = groups.find(
      (x) => x.key.Type === "Primary" && x.key.State === "Enabled",
    )!;
    expect(g.expectedKey).toBe("fill:Primary:Enabled");
    expect(g.ambiguous).toBe(false);
    // 外れ値判定は呼び出し側 (期待キーと違う applicable セル)。
    const outliers = g.members.filter((m) => m.key !== g.expectedKey);
    expect(outliers).toHaveLength(1);
    expect(outliers[0]!.coord.Size).toBe("Large");
  });

  it("票が同数 → ambiguous=true・expectedKey=null・tally に候補", () => {
    // 1 グループだけ抜き出し: 2 セルが別トークン (1:1)。
    const cells: MatrixCell[] = [
      { coord: { Type: "Primary", State: "Enabled", Size: "Small" }, key: "fill:A", votable: true },
      { coord: { Type: "Primary", State: "Enabled", Size: "Large" }, key: "fill:B", votable: true },
    ];
    const groups = groupAndVote(cells, ["Type", "State"]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.ambiguous).toBe(true);
    expect(groups[0]!.expectedKey).toBeNull();
    expect(groups[0]!.tally).toEqual([
      { key: "fill:A", count: 1 },
      { key: "fill:B", count: 1 },
    ]);
  });

  it("生値セルは投票せず、期待キーは valid の最頻になる (相乗効果)", () => {
    const cells: MatrixCell[] = [
      { coord: { Type: "Primary", State: "Enabled", Size: "Small" }, key: "fill:A", votable: true },
      { coord: { Type: "Primary", State: "Enabled", Size: "Medium" }, key: "fill:A", votable: true },
      { coord: { Type: "Primary", State: "Enabled", Size: "Large" }, key: "raw:14", votable: false },
    ];
    const groups = groupAndVote(cells, ["Type", "State"]);
    const g = groups[0]!;
    expect(g.expectedKey).toBe("fill:A");
    expect(g.ambiguous).toBe(false);
    expect(g.members).toHaveLength(3); // 生値も member には含まれる (外れ値候補)
    const outliers = g.members.filter((m) => m.key !== g.expectedKey);
    expect(outliers.map((o) => o.key)).toEqual(["raw:14"]);
  });

  it("na (key=null) はマトリクスから除外される", () => {
    const cells: MatrixCell[] = [
      { coord: { Type: "Primary", State: "Enabled", Size: "Small" }, key: "fill:A", votable: true },
      { coord: { Type: "Primary", State: "Enabled", Size: "Large" }, key: null, votable: false },
    ];
    const groups = groupAndVote(cells, ["Type", "State"]);
    expect(groups[0]!.members).toHaveLength(1);
  });

  it("gov 空 (全 free) → 1 グループに全セル", () => {
    const cells = buildMatrix(BUTTON, () => ({ key: "radius:md" }));
    const groups = groupAndVote(cells, []);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.members).toHaveLength(18);
  });
});
