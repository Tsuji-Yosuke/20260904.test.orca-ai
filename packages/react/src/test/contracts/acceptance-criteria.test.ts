import { describe, expect, it } from "vitest";
import { collectAcIds, parseComponentDoc } from "./acceptance-criteria";

const doc = (criteria: string) => `---
name: Sample
status: ready
---

# Sample

## Spec

### Acceptance Criteria

${criteria}
`;

describe("parseComponentDoc / frontmatter", () => {
  it("name と status を読み取る", () => {
    const parsed = parseComponentDoc(doc("- AC-Sample-01: 基準。"));
    expect(parsed.name).toBe("Sample");
    expect(parsed.status).toBe("ready");
  });
});

describe("parseComponentDoc / Acceptance Criteria", () => {
  it("ID・本文・検証区分なし（= テスト必須）を読み取る", () => {
    const parsed = parseComponentDoc(doc("- AC-Sample-01: 基準の本文。"));
    expect(parsed.criteria).toEqual([
      { id: "AC-Sample-01", text: "基準の本文。", verification: null },
    ]);
    expect(parsed.problems).toEqual([]);
  });

  it("行末の（検証: …）を検証区分として読み取る", () => {
    const parsed = parseComponentDoc(
      doc("- AC-Sample-01: 視覚要件。（検証: Storybook）"),
    );
    expect(parsed.criteria[0]?.verification).toBe("Storybook");
  });

  it("AC セクションは次の見出しで終わる", () => {
    const parsed = parseComponentDoc(
      doc("- AC-Sample-01: 基準。\n\n## Next Section\n\n- ID の無い箇条書き"),
    );
    expect(parsed.criteria).toHaveLength(1);
    expect(parsed.problems).toEqual([]);
  });

  it("AC セクションは次の ### 見出しでも終わる", () => {
    const parsed = parseComponentDoc(
      doc("- AC-Sample-01: 基準。\n\n### Next Section\n\n- ID の無い箇条書き"),
    );
    expect(parsed.criteria).toHaveLength(1);
    expect(parsed.problems).toEqual([]);
  });

  it("ID の無い AC 行を problem として報告する", () => {
    const parsed = parseComponentDoc(doc("- ID の無い基準。"));
    expect(parsed.problems).toHaveLength(1);
    expect(parsed.problems[0]).toContain("ID の無い基準。");
  });

  it("重複した ID を problem として報告する", () => {
    const parsed = parseComponentDoc(
      doc("- AC-Sample-01: 一つ目。\n- AC-Sample-01: 二つ目。"),
    );
    expect(parsed.problems).toHaveLength(1);
    expect(parsed.problems[0]).toContain("AC-Sample-01");
  });

  it("frontmatter の name と一致しない ID を problem として報告する", () => {
    const parsed = parseComponentDoc(doc("- AC-Other-01: 基準。"));
    expect(parsed.problems).toHaveLength(1);
    expect(parsed.problems[0]).toContain("AC-Other-01");
  });

  it("Acceptance Criteria セクションが無い場合は problem として報告する", () => {
    const parsed = parseComponentDoc("---\nname: Sample\nstatus: ready\n---\n\n# Sample\n");
    expect(parsed.criteria).toEqual([]);
    expect(parsed.problems).toHaveLength(1);
  });
});

describe("collectAcIds", () => {
  it("テキスト中の AC ID を重複なしで集める", () => {
    const source = `
      it("AC-Sample-01: foo", () => {});
      it("AC-Sample-01: bar", () => {});
      it("AC-Another-12: baz", () => {});
    `;
    expect(collectAcIds(source)).toEqual(["AC-Sample-01", "AC-Another-12"]);
  });

  it("ID が無ければ空配列", () => {
    expect(collectAcIds("it('AC なしのテスト', () => {})")).toEqual([]);
  });
});
