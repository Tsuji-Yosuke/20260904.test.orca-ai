import { describe, expect, it } from "vitest";
import {
  dimensionSection,
  isSentinelValue,
  splitGroupStep,
  typoStepLabel,
} from "./schema";

/**
 * schema.ts の純粋ロジック (figma API 非依存) の回帰テスト。
 * deriveSwapperGroups / deriveBaseTokens など live API 依存部分は Figma 実機での検証が必要。
 */

describe("isSentinelValue", () => {
  it("0 以下 (none / Spacing/0) を番兵とみなす", () => {
    expect(isSentinelValue(0)).toBe(true);
    expect(isSentinelValue(-1)).toBe(true);
  });
  it("極大値 (full = 99999 等) を番兵とみなす", () => {
    expect(isSentinelValue(99999)).toBe(true);
    expect(isSentinelValue(9999)).toBe(true);
  });
  it("通常のスケール値は番兵でない", () => {
    expect(isSentinelValue(1)).toBe(false);
    expect(isSentinelValue(128)).toBe(false);
  });
});

describe("splitGroupStep", () => {
  it("最後の / で group と step を分ける", () => {
    expect(splitGroupStep("Sizing/Radius/md")).toEqual({
      groupId: "Sizing/Radius",
      stepLabel: "md",
    });
    expect(splitGroupStep("Spacing/Padding/2xl")).toEqual({
      groupId: "Spacing/Padding",
      stepLabel: "2xl",
    });
    // 設計者が Figma 側で追加した新トークンも同じ規則で分割できる (テーブル不要)。
    expect(splitGroupStep("Sizing/Radius/3xl")).toEqual({
      groupId: "Sizing/Radius",
      stepLabel: "3xl",
    });
  });
  it("/ が無ければ同名", () => {
    expect(splitGroupStep("foo")).toEqual({ groupId: "foo", stepLabel: "foo" });
  });
});

describe("dimensionSection", () => {
  it("Spacing/ 始まりは spacing", () => {
    expect(dimensionSection("Spacing/Padding/sm")).toBe("spacing");
    expect(dimensionSection("Spacing/Margin/lg")).toBe("spacing");
  });
  it("それ以外は sizing", () => {
    expect(dimensionSection("Sizing/Radius/md")).toBe("sizing");
    expect(dimensionSection("Sizing/Icon/sm")).toBe("sizing");
    expect(dimensionSection("Sizing/Component/Full/md")).toBe("sizing");
  });
});

describe("typoStepLabel", () => {
  it("役割接頭辞を外して短縮する", () => {
    expect(typoStepLabel("Display", "DisplaySmall")).toBe("Small");
    expect(typoStepLabel("Headline", "HeadlineLarge")).toBe("Large");
    expect(typoStepLabel("Label", "LabelMedium")).toBe("Medium");
  });
  it("接頭辞で始まらなければそのまま", () => {
    expect(typoStepLabel("Display", "Small")).toBe("Small");
  });
});
