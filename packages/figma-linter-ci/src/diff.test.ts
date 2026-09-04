import { describe, expect, it } from "vitest";
import { tokenExpiryWarning } from "./ops";
import { diffReports } from "./diff";
import {
  buildSlackBlocks,
  buildSummaryMarkdown,
  clusterVariantText,
  clusterViolations,
  compactVariant,
  errorSentence,
} from "./notify";
import {
  checkViolationKey,
  consistencyViolationKey,
  disambiguateKeys,
  REPORT_SCHEMA_VERSION,
  type LintReport,
  type LintViolation,
} from "./report";

function violation(key: string, overrides: Partial<LintViolation> = {}): LintViolation {
  return {
    key,
    feature: "check",
    ruleId: "dimension.paddingLeft",
    page: "Components",
    component: "Button / Size=md, State=Default",
    nodePath: "",
    nodeId: "1:2",
    label: "Padding Left",
    current: "12",
    suggestion: "Dimension System/Spacing/Padding/md (12)",
    deepLink: "https://www.figma.com/design/KEY/?node-id=1-2",
    ...overrides,
  };
}

function report(violations: LintViolation[]): LintReport {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    fileKey: "KEY",
    fileName: "Fixture",
    generatedAt: "2026-08-14T00:00:00.000Z",
    scope: { pageExcludePrefixes: ["_", "."], componentExcludePrefixes: ["_", "."] },
    summary: {
      componentsChecked: 1,
      nodesChecked: 1,
      setsChecked: 0,
      pass: 0,
      fail: violations.length,
      consistencyOutliers: 0,
      ambiguousGroups: 0,
      excludedPages: [],
      excludedComponents: [],
    },
    warnings: [],
    violations,
  };
}

describe("diffReports", () => {
  it("新規と解消をキー集合の差で出す", () => {
    const prev = report([violation("a"), violation("b")]);
    const next = report([violation("b"), violation("c")]);
    const diff = diffReports(prev, next);
    expect(diff.added.map((v) => v.key)).toEqual(["c"]);
    expect(diff.resolved.map((v) => v.key)).toEqual(["a"]);
    expect(diff.prevTotal).toBe(2);
    expect(diff.nextTotal).toBe(2);
  });

  it("前回レポートが無ければ全件を新規として扱う", () => {
    const next = report([violation("a")]);
    const diff = diffReports(null, next);
    expect(diff.added).toHaveLength(1);
    expect(diff.resolved).toHaveLength(0);
  });
});

describe("安定キー", () => {
  it("機能5 のキーは推論結果 (期待トークン・グループ座標) に依存しない", () => {
    const base = {
      page: "Components",
      setName: "Button",
      property: "dimension.height",
      axes: { Size: "s5", State: "Hover" },
    };
    // 期待トークンもグループ座標もキーの引数に存在しない = 多数決・軸推論の変動で再通知しない。
    expect(consistencyViolationKey(base)).toBe(
      "consistency|Components|Button|dimension.height|Size=s5,State=Hover",
    );
  });

  it("機能4 のキーは名前ベース (node-id を含まない)", () => {
    expect(
      checkViolationKey({
        page: "P",
        component: "C",
        nodePath: "Row",
        ruleId: "dimension.gap",
      }),
    ).toBe("check|P|C|Row|dimension.gap");
  });

  it("同名ノード由来の重複キーは生成順の #n で識別する", () => {
    const vs = [violation("k"), violation("k"), violation("other"), violation("k")];
    disambiguateKeys(vs);
    expect(vs.map((v) => v.key)).toEqual(["k", "k#2", "other", "k#3"]);
  });
});

describe("clusterViolations (通知のバリアント畳み込み)", () => {
  it("バリアント違いの同一原因 (ルール × 発生箇所) を、コンポーネント名見出しの下に畳む", () => {
    const vs = [
      violation("a", { component: "Button / Size=md, State=Default" }),
      violation("b", { component: "Button / Size=md, State=Hover" }),
      violation("c", { component: "Button / Size=sm, State=Default", ruleId: "color.on", label: "On" }),
    ];
    // 見出しは純粋にコンポーネント名 (ページ名は出さない)。
    const clusters = clusterViolations(vs).get("Button")!;
    expect(clusters).toHaveLength(2);
    expect(clusters[0]!.members).toHaveLength(2);
    // 代表はキー順で最初の違反 (パーマリンクの飛び先)。
    expect(clusters[0]!.representative.key).toBe("a");
  });

  it("同じエラーが複数の発生箇所 (nodePath) で起きても 1 行にまとめ、箇所数を持つ", () => {
    const vs = [violation("a"), violation("b", { nodePath: "Icon Slot" })];
    const clusters = clusterViolations(vs).get("Button")!;
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.spots).toBe(2);
  });

  it("同じルールでも違反内容 (エラー文) が違えば別クラスタになる", () => {
    const vs = [
      violation("a", { current: "12" }), // トークン未使用
      violation("b", { current: "Dimension System/Spacing/Margin/lg" }), // Margin トークンを指定
    ];
    expect(clusterViolations(vs).get("Button")!).toHaveLength(2);
  });
});

describe("errorSentence (違反 → 日本語エラー文)", () => {
  const sentence = (o: Partial<LintViolation>) => errorSentence(violation("x", o));

  it("寸法系: 直接指定 / 参照不能 / 別カテゴリ / 別コレクション", () => {
    // ラベルの言い換え・短縮はしない (正本の表示名をそのまま使う)。
    expect(sentence({ label: "Component Height", ruleId: "dimension.height", current: "32" })).toBe(
      "Component Heightにトークン未使用",
    );
    expect(sentence({ current: "?" })).toBe(
      "Padding Leftのトークンが参照できない (ノイズ変数の可能性)",
    );
    expect(
      sentence({ current: "Dimension System/Spacing/Margin/lg" }),
    ).toBe("Padding LeftにMarginトークンを指定");
    expect(sentence({ current: "Foo Library/Radius/md" })).toBe(
      "Padding LeftにFoo Libraryのトークンを指定",
    );
  });

  it("Background: Referenceカラー / Onカラー / オーバーレイのトークン未使用", () => {
    expect(
      sentence({ ruleId: "color.background", label: "Background", current: "Color References/Purple/100", suggestion: undefined }),
    ).toBe("BackgroundにReferenceカラーを指定");
    expect(
      sentence({ ruleId: "color.background", label: "Background", current: "Color System/Brand/OnPrimary", suggestion: undefined }),
    ).toBe("BackgroundにOnカラーを指定");
    expect(
      sentence({ ruleId: "color.background", label: "Background", current: "#000000", suggestion: "Color System/StateLayers/DarkOpacity/8 (#000000)" }),
    ).toBe("状態オーバーレイにトークン未使用");
  });

  it("On: 直接指定 / On以外 / 背景と不対応の On", () => {
    expect(sentence({ ruleId: "color.on", label: "On", current: "#333333", suggestion: undefined })).toBe(
      "Onカラーにトークン未使用",
    );
    expect(
      sentence({ ruleId: "color.on", label: "On", current: "Color System/UI/Surface", suggestion: undefined }),
    ).toBe("OnカラーにOn以外のカラーを指定");
    expect(
      sentence({ ruleId: "color.on", label: "On", current: "Color System/Brand/OnSecondary", suggestion: undefined }),
    ).toBe("背景に対応しないOnカラーを指定");
  });

  it("Background: 地色 + オーバーレイの複数 fail (連結 current) は先頭チップで分類する", () => {
    expect(
      sentence({ ruleId: "color.background", label: "Background", current: "#0000ff + #000000", suggestion: undefined }),
    ).toBe("Backgroundにトークン未使用");
  });

  it("機能5: ラベル (正本の表示名) をそのまま使い「〜が他バリアントと不揃い」", () => {
    expect(
      sentence({ feature: "consistency", label: "背景色", current: "Color System/Brand/Primary (#000000)" }),
    ).toBe("背景色が他バリアントと不揃い");
  });
});

describe("バリアント表記", () => {
  it("compactVariant: 値だけを / 連結し、True/False 系は軸名を残す", () => {
    expect(compactVariant("State=Disabled, Size=Large, Expanded=False")).toBe(
      "Disabled/Large/Expanded=False",
    );
    expect(compactVariant("Size=md, State=Hover")).toBe("md/Hover");
  });

  it("clusterVariantText: 代表バリアント + 他Nバリアント。単体コンポーネントは null", () => {
    const cluster = clusterViolations([
      violation("a", { component: "Button / Size=md, State=Default" }),
      violation("b", { component: "Button / Size=md, State=Hover" }),
    ]).get("Button")![0]!;
    expect(clusterVariantText(cluster)).toBe("md/Default 他1バリアント");
    const single = clusterViolations([violation("c", { component: "Card" })]).get("Card")![0]!;
    expect(clusterVariantText(single)).toBeNull();
  });

  it("clusterVariantText: 複数箇所の同一エラーは「M箇所でエラー」を付け、バリアントは重複なしで数える", () => {
    // 同じ 12 バリアントが 3 箇所 (本体 + ネスト 2 つ) で該当するケース。
    const vs = [];
    for (const path of ["", "Icon Slot2", "Icon Slot3"]) {
      for (const state of ["Default", "Hover"]) {
        vs.push(
          violation(`k-${path}-${state}`, {
            component: `Accordion / State=${state}, Expanded=False`,
            nodePath: path,
          }),
        );
      }
    }
    const cluster = clusterViolations(vs).get("Accordion")![0]!;
    expect(cluster.spots).toBe(3);
    expect(clusterVariantText(cluster)).toBe("Default/Expanded=False 他1バリアント 3箇所でエラー");
  });
});

describe("通知の整形", () => {
  it("Slack blocks: 箇所数見出し + クラスタ行 (エラー文リンク + 対象バリアント)", () => {
    const next = report([
      violation("a", { component: "Button / Size=md, State=Default" }),
      violation("b", { component: "Button / Size=md, State=Hover" }),
      violation("c", { ruleId: "color.on", label: "On", current: "Color System/UI/Surface" }),
    ]);
    const blocks = buildSlackBlocks({
      report: next,
      diff: diffReports(null, next),
      operationalWarnings: [],
    });
    const json = JSON.stringify(blocks);
    expect(json).toContain("🔍 Common UI Kit: Weekly Linting");
    expect(json).toContain("新規 2箇所 / 解消 0箇所");
    // 番号付きで、エラー文自体がパーマリンク (太字にしない)。後ろに対象バリアントが付く。
    expect(json).toContain("1. <https://www.figma.com/design/KEY/?node-id=1-2|Padding Leftにトークン未使用>: md/Default 他1バリアント");
  });

  it("Slack blocks: mrkdwn の特殊文字 (& < >) をエスケープする", () => {
    const next = report([
      violation("a", { component: "Buttons <wip> & misc" }),
    ]);
    const json = JSON.stringify(
      buildSlackBlocks({ report: next, diff: diffReports(null, next), operationalWarnings: [] }),
    );
    expect(json).toContain("Buttons &lt;wip&gt; &amp; misc");
    expect(json).not.toContain("Buttons <wip>");
  });

  it("行数あふれは context (グレー) ブロックになり、レポート参照は run ページへのリンクになる", () => {
    const many = report(
      Array.from({ length: 10 }, (_, i) =>
        violation(`k${i}`, { ruleId: `dimension.rule${i}`, label: `Rule ${i}` }),
      ),
    );
    const blocks = buildSlackBlocks({
      report: many,
      diff: diffReports(null, many),
      operationalWarnings: [],
      reportUrl: "https://github.com/orca-ds/orca/actions/runs/123",
    }) as Array<{ type: string; elements?: Array<{ text: string }> }>;
    const overflow = blocks.find(
      (b) => b.type === "context" && b.elements?.[0]?.text.includes("…ほか"),
    );
    expect(overflow).toBeDefined();
    expect(overflow!.elements![0]!.text).toBe(
      "…ほか 2 箇所 (<https://github.com/orca-ds/orca/actions/runs/123|レポート>参照)",
    );
  });

  it("差分ゼロでも「新規 0箇所 / 解消 0箇所」+ 運用警告付きの blocks を組み立てる", () => {
    const next = report([]);
    const blocks = buildSlackBlocks({
      report: next,
      diff: diffReports(next, next),
      operationalWarnings: ["Figma トークンが 2026-08-20 (残り 6 日) で失効します。"],
    });
    const json = JSON.stringify(blocks);
    expect(json).toContain("新規 0箇所 / 解消 0箇所");
    expect(json).toContain("失効します");
  });

  it("Summary markdown: 概況テーブル・クラスタ行・警告を含む", () => {
    const next = report([violation("a"), violation("b", { component: "Card" })]);
    next.warnings.push("テスト警告");
    const md = buildSummaryMarkdown({
      report: next,
      diff: diffReports(null, next),
      operationalWarnings: ["運用警告"],
    });
    expect(md).toContain("| 新規エラー |");
    expect(md).toContain("### Button");
    expect(md).toContain("1. [Padding Leftにトークン未使用](https://www.figma.com/design/KEY/?node-id=1-2): md/Default");
    // バリアントを持たない単体コンポーネントはバリアント表記なし (エラー文リンクのみ)。
    expect(md).toContain("1. [Padding Leftにトークン未使用](https://www.figma.com/design/KEY/?node-id=1-2)");
    expect(md).toContain("テスト警告");
    expect(md).toContain("運用警告");
  });
});

describe("tokenExpiryWarning", () => {
  const now = new Date("2026-08-14T00:00:00Z");
  it("しきい値内なら残日数付きで警告する", () => {
    expect(tokenExpiryWarning("2026-08-20", now)).toContain("残り 6 日");
  });
  it("失効後は差し替えを促す", () => {
    expect(tokenExpiryWarning("2026-08-01", now)).toContain("過ぎています");
  });
  it("十分先なら警告しない / 未設定は何もしない", () => {
    expect(tokenExpiryWarning("2026-12-31", now)).toBeNull();
    expect(tokenExpiryWarning(undefined, now)).toBeNull();
  });
  it("不正な日付はその旨を警告する", () => {
    expect(tokenExpiryWarning("いつか", now)).toContain("読めません");
  });
});
