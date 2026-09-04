import { describe, expect, it } from "vitest";
import { runLint } from "./lint-runner";
import { RestLintAdapter } from "./rest-adapter";
import type { LintReport } from "./report";
import { buildFixtureFile, buildFixtureVariables } from "./testing/fixtures";

/**
 * fixture (testing/fixtures.ts のコメント参照) に埋め込んだ逸脱が、期待どおりの違反として
 * 検出されることを確認する統合テスト。判定ロジック自体は @orca/figma-linter-core (プラグインと
 * 同一) なので、ここで検証しているのは REST アダプタ + 対象収集 + レポート整形の結線。
 */
async function lintFixture(): Promise<LintReport> {
  const adapter = new RestLintAdapter(buildFixtureFile(), buildFixtureVariables());
  return runLint(adapter, "FILEKEY", new Date("2026-08-14T00:00:00Z"));
}

describe("runLint (fixture 統合)", () => {
  it("決定的な出力を返す (2 回実行で同一 JSON)", async () => {
    const [a, b] = [await lintFixture(), await lintFixture()];
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("機能4: 生値 padding を検出し、最近傍トークンを提案する", async () => {
    const report = await lintFixture();
    const v = report.violations.find(
      (v) => v.key === "check|Components|Button / Size=s1, State=Default||dimension.paddingRight",
    );
    expect(v).toBeDefined();
    expect(v!.current).toBe("12");
    expect(v!.suggestion).toBe("Dimension System/Spacing/Padding/md (12)");
    expect(v!.deepLink).toContain("node-id=");
  });

  it("機能4: 生値の半透明オーバーレイを検出し、StateLayers を提案する", async () => {
    const report = await lintFixture();
    const v = report.violations.find(
      (v) =>
        v.ruleId === "color.background" && v.component === "Button / Size=s2, State=Hover",
    );
    expect(v).toBeDefined();
    expect(v!.suggestion).toContain("StateLayers/DarkOpacity/8");
    // current は fail したオーバーレイ (生値 hex) を指す。pass している地色トークンを
    // 「置換対象」のように見せない。
    expect(v!.current).toBe("#000000");
  });

  it("機能4: 背景ペアと違う On カラーを検出する (期待 On を提案)", async () => {
    const report = await lintFixture();
    const v = report.violations.find(
      (v) => v.ruleId === "color.on" && v.component === "Button / Size=s4, State=Default",
    );
    expect(v).toBeDefined();
    expect(v!.suggestion).toContain("Brand/OnPrimary");
  });

  it("機能4: 生値 radius / 生値 gap を検出する", async () => {
    const report = await lintFixture();
    expect(
      report.violations.some(
        (v) => v.ruleId === "dimension.radius" && v.component === "Button / Size=s5, State=Focus",
      ),
    ).toBe(true);
    expect(
      report.violations.some(
        (v) => v.ruleId === "dimension.gap" && v.component === "Button / Size=s3, State=Focus",
      ),
    ).toBe(true);
  });

  it("機能4: rectangleCornerRadii のマップ表現バインドの radius は pass (違反にならない)", async () => {
    const report = await lintFixture();
    expect(
      report.violations.some(
        (v) => v.ruleId === "dimension.radius" && v.component === "Button / Size=s2, State=Default",
      ),
    ).toBe(false);
  });

  it("機能4: 文字単位で塗りが混在する TEXT は検査対象外 (Plugin API の figma.mixed と同じ扱い)", async () => {
    const report = await lintFixture();
    // Card/Row の MixedLabel はデフォルトランが生値だが、混在なので On 行の違反にならない。
    expect(
      report.violations.some((v) => v.component === "Card" && v.ruleId === "color.on"),
    ).toBe(false);
  });

  it("機能4: hug の height は対象外 / 配下の Auto Layout フレームは nodePath 付きで検査する", async () => {
    const report = await lintFixture();
    expect(report.violations.some((v) => v.ruleId === "dimension.height")).toBe(false);
    const row = report.violations.find(
      (v) => v.component === "Card" && v.nodePath === "Row" && v.ruleId === "dimension.paddingLeft",
    );
    expect(row).toBeDefined();
  });

  it("機能5: 単体では pass だが多数派と揃わない height を検出する (期待トークン付き)", async () => {
    const report = await lintFixture();
    const v = report.violations.find((v) => v.feature === "consistency");
    expect(v).toBeDefined();
    expect(v!.ruleId).toBe("consistency.dimension.height");
    expect(v!.component).toBe("Button / Size=s5, State=Hover");
    expect(v!.current).toContain("Sizing/Component/s4");
    expect(v!.expected).toContain("Sizing/Component/s5");
    // キーに期待トークンを含めない (多数決の変動で再通知しない)。
    expect(v!.key).not.toContain("Sizing/Component");
  });

  it("機能5: 機能4 で fail になるセルは違反として重複報告しない", async () => {
    const report = await lintFixture();
    // s3/Focus の gap 生値・s1/Default の padding 生値は機能4 のみ。
    const consistency = report.violations.filter((v) => v.feature === "consistency");
    expect(consistency.every((v) => v.ruleId === "consistency.dimension.height")).toBe(true);
    expect(consistency).toHaveLength(1);
  });

  it("機能5: 票が同数のグループは違反にせず、件数だけ記録する", async () => {
    const report = await lintFixture();
    expect(report.summary.ambiguousGroups).toBeGreaterThanOrEqual(1);
    expect(report.violations.some((v) => v.ruleId === "consistency.dimension.radius")).toBe(false);
  });

  it("除外: `_` ページと `.` コンポーネントは検査せず、除外一覧に記録する", async () => {
    const report = await lintFixture();
    expect(report.summary.excludedPages).toEqual(["_Playground"]);
    expect(report.summary.excludedComponents).toEqual(["Components/.WIP Button"]);
    expect(report.violations.some((v) => v.page === "_Playground")).toBe(false);
    expect(report.violations.some((v) => v.component.includes(".WIP"))).toBe(false);
  });

  it("summary: 対象数と pass/fail を集計する", async () => {
    const report = await lintFixture();
    // Button 15 バリアント + Card = 16 ルート。展開で Card/Row が足されて 17 ノード。
    expect(report.summary.componentsChecked).toBe(16);
    expect(report.summary.nodesChecked).toBe(17);
    expect(report.summary.setsChecked).toBe(1);
    expect(report.summary.fail).toBeGreaterThan(0);
    expect(report.summary.pass).toBeGreaterThan(0);
  });
});
