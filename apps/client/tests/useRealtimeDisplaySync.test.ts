import assert from "node:assert/strict";
import test from "node:test";
import { createRefreshDebouncer } from "../src/features/display/hooks/realtimeDisplaySync.logic";

test("createRefreshDebouncer coalesces burst triggers into one refresh", async () => {
  let refreshCount = 0;

  const debouncer = createRefreshDebouncer(() => {
    refreshCount += 1;
  }, 20);

  debouncer.trigger();
  debouncer.trigger();
  debouncer.trigger();

  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 35);
  });

  assert.equal(refreshCount, 1);
});

test("createRefreshDebouncer cancel prevents pending refresh", async () => {
  let refreshCount = 0;

  const debouncer = createRefreshDebouncer(() => {
    refreshCount += 1;
  }, 20);

  debouncer.trigger();
  debouncer.cancel();

  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 35);
  });

  assert.equal(refreshCount, 0);
});
