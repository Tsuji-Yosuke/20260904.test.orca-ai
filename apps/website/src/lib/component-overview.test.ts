import { describe, expect, it } from "vitest";
import { buildOverviewModel } from "./component-overview";
import { componentPage } from "./component-pages.server";
import { loadDesignDoc } from "./design-doc.server";

function modelOf(name: string) {
  const page = componentPage(name);
  if (!page) throw new Error(`${name} のページがありません`);
  return buildOverviewModel(page, loadDesignDoc(page.designDoc));
}

describe("buildOverviewModel / 目次の分岐", () => {
  it("前提セクションを持つ Table は目次の先頭に preamble が入る", () => {
    const { toc, preamble } = modelOf("table");
    expect(preamble?.title).toBeTruthy();
    expect(toc[0]).toEqual({ id: "preamble", title: preamble?.title });
  });

  it("Changelog を持つ button だけ目次の末尾に changelog が入る", () => {
    expect(modelOf("button").toc.at(-1)?.id).toBe("changelog");
    expect(modelOf("avatar").changelog).toBeNull();
    expect(modelOf("avatar").toc.map(({ id }) => id)).toEqual(["usage", "anatomy", "do-dont", "accessibility"]);
  });
});
