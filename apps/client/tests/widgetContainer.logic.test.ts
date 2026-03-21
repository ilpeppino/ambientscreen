import assert from "node:assert/strict";
import test from "node:test";
import { computeWidgetScale } from "../src/features/display/components/WidgetContainer.logic";

test("computeWidgetScale returns 1 for large enough widgets", () => {
  assert.equal(computeWidgetScale(1200, 800), 1);
});

test("computeWidgetScale scales down for smaller widget frames", () => {
  const scale = computeWidgetScale(160, 250);
  assert.ok(scale < 1);
  assert.ok(scale >= 0.28);
});
