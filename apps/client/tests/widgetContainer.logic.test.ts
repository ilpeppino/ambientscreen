import { test, expect } from "vitest";
import { computeWidgetScale } from "../src/features/display/components/WidgetContainer.logic";

test("computeWidgetScale returns 1 for large enough widgets", () => {
  expect(computeWidgetScale(1200, 800)).toBe(1);
});

test("computeWidgetScale scales down for smaller widget frames", () => {
  const scale = computeWidgetScale(160, 250);
  expect(scale < 1).toBeTruthy();
  expect(scale >= 0.28).toBeTruthy();
});
