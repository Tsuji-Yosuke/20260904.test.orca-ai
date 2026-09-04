import test from "node:test";
import assert from "node:assert/strict";

import { describeError } from "../src/plugin/describe-error.js";

test("describeError returns the message for Error instances", () => {
  assert.equal(describeError(new Error("boom")), "boom");
});

test("describeError returns string values as-is", () => {
  assert.equal(describeError("plain string failure"), "plain string failure");
});

test("describeError extracts message from plain objects (Figma API style rejections)", () => {
  assert.equal(describeError({ message: "figma rejected" }), "figma rejected");
});

test("describeError JSON-serializes plain objects without a message", () => {
  assert.equal(describeError({ code: 42, reason: "nope" }), '{"code":42,"reason":"nope"}');
});

test("describeError never collapses non-Error values to a bare 'Unknown plugin error'", () => {
  // The whole point: the thrown value must remain inspectable.
  for (const value of [null, undefined, 0, false]) {
    const described = describeError(value);
    assert.equal(described.includes(String(value)), true);
  }
});
