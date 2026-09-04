import test from "node:test";
import assert from "node:assert/strict";

import { createSequentialMessageHandler } from "../src/plugin/request-queue.js";

function flushQueue(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test("createSequentialMessageHandler runs requests one by one", async () => {
  const started: string[] = [];
  const finished: string[] = [];
  const release: Array<() => void> = [];

  const handler = createSequentialMessageHandler<string>(
    (message: string) =>
      new Promise<void>((resolve) => {
        started.push(message);
        release.push(() => {
          finished.push(message);
          resolve();
        });
      }),
    () => {}
  );

  handler("first");
  handler("second");

  await flushQueue();
  assert.deepEqual(started, ["first"]);

  release.shift()?.();
  await flushQueue();

  assert.deepEqual(started, ["first", "second"]);

  release.shift()?.();
  await flushQueue();

  assert.deepEqual(finished, ["first", "second"]);
});

test("createSequentialMessageHandler keeps the queue alive after a failure", async () => {
  const seen: string[] = [];
  const errors: string[] = [];

  const handler = createSequentialMessageHandler<string>(
    async (message: string) => {
      seen.push(message);
      if (message === "first") {
        throw new Error("boom");
      }
    },
    (error: unknown) => {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  );

  handler("first");
  handler("second");

  await flushQueue();

  assert.deepEqual(seen, ["first", "second"]);
  assert.deepEqual(errors, ["boom"]);
});
