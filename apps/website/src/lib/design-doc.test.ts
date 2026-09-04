import { describe, expect, it } from "vitest";
import { componentPages } from "./component-pages.server";
import { guideSection, parseDesignDoc } from "./design-doc";
import { loadDesignDoc } from "./design-doc.server";

const GUIDE_TITLES = [
  "Purpose",
  "Usage",
  "User Mental Model",
  "Anatomy",
  "Content Model",
  "Layout And Density",
  "Accessibility Notes",
];

const SPEC_TITLES = [
  "Interaction Model",
  "State Model",
  "Visual Semantics",
  "Variants And Options",
  "Open Questions",
  "Acceptance Criteria",
];

describe("parseDesignDoc / Button.md（規約の基準文書）", () => {
  const doc = loadDesignDoc("packages/design-language/components/Button/Button.md");

  it("frontmatter を読み取る", () => {
    expect(doc.frontmatter.name).toBe("Button");
    expect(doc.frontmatter.status).toBe("ready");
    expect(doc.frontmatter.description).toContain("ボタン");
    expect(doc.frontmatter.sources?.figma?.[0]).toMatch(/^https:\/\/www\.figma\.com\//);
  });

  it("Guide のセクションを規約の順序どおり持つ", () => {
    expect(doc.guide.map(({ title }) => title)).toEqual(GUIDE_TITLES);
  });

  it("Spec のセクションを規約の順序どおり持つ", () => {
    expect(doc.spec.map(({ title }) => title)).toEqual(SPEC_TITLES);
  });

  it("Usage を Use when / Do not use when に分割する", () => {
    expect(doc.useWhen.length).toBeGreaterThan(0);
    expect(doc.doNotUseWhen.length).toBeGreaterThan(0);
    expect(doc.useWhen[0]?.type).toBe("list");
  });

  it("セクション本文を取り出せる", () => {
    expect(guideSection(doc, "Anatomy")?.nodes.length).toBeGreaterThan(0);
  });
});

describe("parseDesignDoc / 全原典のスモークテスト", () => {
  for (const page of componentPages()) {
    it(`${page.designDoc} をパースできる`, () => {
      const doc = loadDesignDoc(page.designDoc);
      expect(doc.frontmatter.name).toBeTruthy();
      expect(doc.frontmatter.description).toBeTruthy();
      expect(doc.guide.map(({ title }) => title)).toEqual(GUIDE_TITLES);
      expect(doc.spec.map(({ title }) => title)).toEqual(SPEC_TITLES);
      expect(doc.useWhen.length).toBeGreaterThan(0);
      expect(doc.doNotUseWhen.length).toBeGreaterThan(0);
    });
  }

  it("前提セクションを持つのは Table だけ", () => {
    const withPreamble = componentPages()
      .filter((page) => loadDesignDoc(page.designDoc).preamble !== null)
      .map((page) => page.name);
    expect(withPreamble).toEqual(["table"]);
  });
});

describe("parseDesignDoc / 不正な構成", () => {
  it("Guide / Spec が無い文書は throw する", () => {
    expect(() =>
      parseDesignDoc("---\nname: X\nstatus: draft\n---\n\n# X\n\n## Purpose\n\n- a\n"),
    ).toThrow();
  });
});
