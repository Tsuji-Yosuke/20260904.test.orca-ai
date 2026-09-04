import test from "node:test";
import assert from "node:assert/strict";

import { createSolidPaintFromHex } from "../src/plugin/figma.js";

test("createSolidPaintFromHex keeps alpha in opacity, not in color", () => {
  const paint = createSolidPaintFromHex("#336699cc");

  assert.equal(paint.type, "SOLID");
  assert.deepEqual(paint.color, {
    r: 0x33 / 255,
    g: 0x66 / 255,
    b: 0x99 / 255
  });
  assert.equal(paint.opacity, 0xcc / 255);
  assert.equal("a" in (paint.color as Record<string, unknown>), false);
});
