import { describe, expect, it } from "vitest";
import { parseVariantName, RestLintAdapter, RestNode } from "./rest-adapter";
import type { RestNodeJson } from "./rest-types";
import { buildFixtureFile, buildFixtureVariables, VAR } from "./testing/fixtures";

const node = (json: Partial<RestNodeJson> & { type: string }): RestNode =>
  new RestNode({ id: "1:1", name: "n", ...json } as RestNodeJson, null);

describe("RestNode の既定値補完 (REST は既定値のプロパティを省略する)", () => {
  it("フレーム系: layoutMode / sizingMode / padding の省略を Plugin API 相当の既定値に写像する", () => {
    const frame = node({ type: "FRAME" });
    expect(frame.str("layoutMode")).toBe("NONE");
    expect(frame.str("layoutWrap")).toBe("NO_WRAP");
    expect(frame.str("primaryAxisSizingMode")).toBe("AUTO");
    expect(frame.str("counterAxisSizingMode")).toBe("AUTO");
    expect(frame.num("paddingTop")).toBe(0);
    expect(frame.num("itemSpacing")).toBe(0);
    expect(frame.num("counterAxisSpacing")).toBeNull();
  });

  it("非フレーム系 (TEXT): レイアウト系フィールドは null (未対応)", () => {
    const text = node({ type: "TEXT" });
    expect(text.str("layoutMode")).toBeNull();
    expect(text.num("paddingTop")).toBeNull();
    expect(text.num("topLeftRadius")).toBeNull();
  });

  it("width / height は absoluteBoundingBox から読む", () => {
    const frame = node({ type: "FRAME", absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 } });
    expect(frame.num("width")).toBe(100);
    expect(frame.num("height")).toBe(40);
  });
});

describe("radius の表現差の吸収", () => {
  it("rectangleCornerRadii [TL,TR,BR,BL] を四隅フィールド名へ写像する", () => {
    const frame = node({ type: "FRAME", rectangleCornerRadii: [1, 2, 3, 4] });
    expect(frame.num("topLeftRadius")).toBe(1);
    expect(frame.num("topRightRadius")).toBe(2);
    expect(frame.num("bottomRightRadius")).toBe(3);
    expect(frame.num("bottomLeftRadius")).toBe(4);
  });

  it("cornerRadius (単一) は全隅へフォールバックする", () => {
    const frame = node({ type: "FRAME", cornerRadius: 6 });
    expect(frame.num("topLeftRadius")).toBe(6);
    expect(frame.num("bottomLeftRadius")).toBe(6);
  });

  it("バインドも per-corner キー → rectangleCornerRadii (マップ/配列) の順で解決する", () => {
    const perCorner = node({
      type: "FRAME",
      boundVariables: { topLeftRadius: { type: "VARIABLE_ALIAS", id: "V:a" } },
    });
    expect(perCorner.boundVariableId("topLeftRadius")).toBe("V:a");
    // REST spec のマップ表現。
    const asMap = node({
      type: "FRAME",
      boundVariables: {
        rectangleCornerRadii: {
          RECTANGLE_TOP_LEFT_CORNER_RADIUS: { type: "VARIABLE_ALIAS", id: "V:tl" },
          RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS: { type: "VARIABLE_ALIAS", id: "V:bl" },
        },
      },
    });
    expect(asMap.boundVariableId("topLeftRadius")).toBe("V:tl");
    expect(asMap.boundVariableId("bottomLeftRadius")).toBe("V:bl");
    expect(asMap.boundVariableId("topRightRadius")).toBeNull();
    // 防御的に配列表現も受ける。
    const asArray = node({
      type: "FRAME",
      boundVariables: {
        rectangleCornerRadii: [
          { type: "VARIABLE_ALIAS", id: "V:tl" },
          { type: "VARIABLE_ALIAS", id: "V:tr" },
          { type: "VARIABLE_ALIAS", id: "V:br" },
          { type: "VARIABLE_ALIAS", id: "V:bl" },
        ],
      },
    });
    expect(asArray.boundVariableId("topRightRadius")).toBe("V:tr");
    expect(asArray.boundVariableId("bottomLeftRadius")).toBe("V:bl");
  });

  it("width / height のバインドは REST の `size: {x,y}` から解決する", () => {
    const frame = node({
      type: "FRAME",
      boundVariables: {
        size: {
          x: { type: "VARIABLE_ALIAS", id: "V:w" },
          y: { type: "VARIABLE_ALIAS", id: "V:h" },
        },
      },
    });
    expect(frame.boundVariableId("width")).toBe("V:w");
    expect(frame.boundVariableId("height")).toBe("V:h");
    // y だけバインドされている場合は width は未バインド。
    const heightOnly = node({
      type: "FRAME",
      boundVariables: { size: { y: { type: "VARIABLE_ALIAS", id: "V:h" } } },
    });
    expect(heightOnly.boundVariableId("width")).toBeNull();
    expect(heightOnly.boundVariableId("height")).toBe("V:h");
  });
});

describe("fills の正規化", () => {
  it("生値 SOLID の color.a を LintPaint.opacity へ畳む (Plugin API の opacity 表現に合わせる)", () => {
    const frame = node({
      type: "FRAME",
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 0.08 } }],
    });
    const fills = frame.fills()!;
    expect(fills[0]!.opacity).toBeCloseTo(0.08);
    expect(fills[0]!.color).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("バインドされた塗りは boundColorVariableId を持つ", () => {
    const frame = node({
      type: "FRAME",
      fills: [
        {
          type: "SOLID",
          color: { r: 0, g: 0, b: 1, a: 1 },
          boundVariables: { color: { type: "VARIABLE_ALIAS", id: VAR.brand } },
        },
      ],
    });
    expect(frame.fills()![0]!.boundColorVariableId).toBe(VAR.brand);
  });
});

describe("TEXT の文字単位の塗り混在 (Plugin API の figma.mixed 相当)", () => {
  it("styleOverrideTable に fills を持つオーバーライドがあれば fills() は null (検査対象外)", () => {
    const mixed = node({
      type: "TEXT",
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
      characterStyleOverrides: [0, 1, 1],
      styleOverrideTable: { "1": { fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }] } },
    });
    expect(mixed.fills()).toBeNull();
  });

  it("fills を持たないオーバーライド (フォント等) では fills() を返す", () => {
    const fontOnly = node({
      type: "TEXT",
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
      characterStyleOverrides: [0, 1],
      styleOverrideTable: { "1": {} },
    });
    expect(fontOnly.fills()).not.toBeNull();
  });
});

describe("バリアント軸", () => {
  it('COMPONENT 名 "Size=md, State=Hover" を軸値にパースする', () => {
    expect(parseVariantName("Size=md, State=Hover")).toEqual({ Size: "md", State: "Hover" });
    expect(parseVariantName("Button")).toBeNull();
  });
});

describe("変数のモード解決 (resolveForConsumer 相当)", () => {
  const adapter = new RestLintAdapter(buildFixtureFile(), buildFixtureVariables());

  it("エイリアス連鎖を辿って解決する (Padding/md → Reference の 12)", async () => {
    const variable = await adapter.variable(VAR.padMd);
    const consumer = adapter.document.children()[0]!.children()[0]!; // Button set
    expect(variable!.resolveNumber(consumer)).toBe(12);
  });

  it("explicitVariableModes が祖先にあればそのモードで解決する", () => {
    const vars = buildFixtureVariables();
    // 2 モードのコレクションを追加し、モードごとに違う値を持たせる。
    vars.meta.variableCollections["VC:multi"] = {
      id: "VC:multi",
      name: "Multi",
      modes: [
        { modeId: "m:a", name: "A" },
        { modeId: "m:b", name: "B" },
      ],
      defaultModeId: "m:a",
      variableIds: ["V:multi"],
    };
    vars.meta.variables["V:multi"] = {
      id: "V:multi",
      name: "Sizing/Component/multi",
      variableCollectionId: "VC:multi",
      resolvedType: "FLOAT",
      valuesByMode: { "m:a": 10, "m:b": 99 },
    };
    const file = buildFixtureFile();
    // ページに explicitVariableModes を立て、その配下の子で解決する。
    const page = file.document.children![0]!;
    page.explicitVariableModes = { "VC:multi": "m:b" };
    const a = new RestLintAdapter(file, vars);
    const consumer = a.document.children()[0]!.children()[0]!;
    const root = a.document;
    expect(a.resolveValue(vars.meta.variables["V:multi"]!, consumer as never)).toBe(99);
    // 明示モードの無い文脈 (DOCUMENT 直) では defaultMode の値。
    expect(a.resolveValue(vars.meta.variables["V:multi"]!, root)).toBe(10);
  });

  it("循環エイリアスは null (無限再帰しない)", () => {
    const vars = buildFixtureVariables();
    vars.meta.variables["V:loop-a"] = {
      id: "V:loop-a",
      name: "Loop/A",
      variableCollectionId: "VC:dim",
      resolvedType: "FLOAT",
      valuesByMode: { "m:dim": { type: "VARIABLE_ALIAS", id: "V:loop-b" } },
    };
    vars.meta.variables["V:loop-b"] = {
      id: "V:loop-b",
      name: "Loop/B",
      variableCollectionId: "VC:dim",
      resolvedType: "FLOAT",
      valuesByMode: { "m:dim": { type: "VARIABLE_ALIAS", id: "V:loop-a" } },
    };
    const a = new RestLintAdapter(buildFixtureFile(), vars);
    expect(a.resolveValue(vars.meta.variables["V:loop-a"]!, a.document)).toBeNull();
  });
});
