import test from "node:test";
import assert from "node:assert/strict";

import { computeContentHash, stableStringify } from "../src/core/hash.js";

test("stableStringify sorts object keys", () => {
  assert.equal(stableStringify({ b: 2, a: 1 }), "{\"a\":1,\"b\":2}");
});

test("computeContentHash is stable for equivalent objects", () => {
  assert.equal(computeContentHash({ a: 1, b: 2 }), computeContentHash({ b: 2, a: 1 }));
});

test("computeContentHash changes when content changes", () => {
  assert.notEqual(computeContentHash({ a: 1, b: 2 }), computeContentHash({ a: 1, b: 3 }));
});
