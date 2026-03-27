import { describe, expect, test } from "vitest";
import {
  clampSidebarWidth,
  computeMaxSidebarWidth,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_RATIO,
  SIDEBAR_MIN_WIDTH,
} from "../src/features/admin/sidebarResize.logic";

describe("computeMaxSidebarWidth", () => {
  test("returns 30% of the viewport width", () => {
    expect(computeMaxSidebarWidth(1200)).toBe(Math.floor(1200 * 0.3)); // 360
    expect(computeMaxSidebarWidth(1440)).toBe(Math.floor(1440 * 0.3)); // 432
  });

  test("floors the result to an integer", () => {
    // 1000 * 0.3 = 300 exactly — no rounding needed
    expect(computeMaxSidebarWidth(1000)).toBe(300);
    // 1001 * 0.3 = 300.3 → floors to 300
    expect(computeMaxSidebarWidth(1001)).toBe(300);
  });

  test("respects SIDEBAR_MAX_RATIO constant", () => {
    const viewportWidth = 1000;
    expect(computeMaxSidebarWidth(viewportWidth)).toBe(
      Math.floor(viewportWidth * SIDEBAR_MAX_RATIO),
    );
  });
});

describe("clampSidebarWidth", () => {
  const viewport = 1200; // max = 360

  test("returns the width unchanged when within bounds", () => {
    expect(clampSidebarWidth(288, viewport)).toBe(288);
    expect(clampSidebarWidth(SIDEBAR_DEFAULT_WIDTH, viewport)).toBe(SIDEBAR_DEFAULT_WIDTH);
  });

  test("clamps to SIDEBAR_MIN_WIDTH when the proposed width is too small", () => {
    expect(clampSidebarWidth(0, viewport)).toBe(SIDEBAR_MIN_WIDTH);
    expect(clampSidebarWidth(100, viewport)).toBe(SIDEBAR_MIN_WIDTH);
    expect(clampSidebarWidth(SIDEBAR_MIN_WIDTH - 1, viewport)).toBe(SIDEBAR_MIN_WIDTH);
  });

  test("clamps to 30% of viewport when the proposed width is too large", () => {
    const max = computeMaxSidebarWidth(viewport); // 360
    expect(clampSidebarWidth(400, viewport)).toBe(max);
    expect(clampSidebarWidth(9999, viewport)).toBe(max);
    expect(clampSidebarWidth(max + 1, viewport)).toBe(max);
  });

  test("accepts exactly the min width", () => {
    expect(clampSidebarWidth(SIDEBAR_MIN_WIDTH, viewport)).toBe(SIDEBAR_MIN_WIDTH);
  });

  test("accepts exactly the max width", () => {
    const max = computeMaxSidebarWidth(viewport);
    expect(clampSidebarWidth(max, viewport)).toBe(max);
  });

  test("re-clamps when the viewport shrinks so max drops below current width", () => {
    // Viewport shrinks from 1200 → 700; new max = floor(700*0.3) = 210
    const newMax = computeMaxSidebarWidth(700); // 210
    // Previously stored width 288 should now be clamped to 210
    expect(clampSidebarWidth(288, 700)).toBe(newMax);
  });

  test("handles a very narrow viewport where min > max gracefully (min wins)", () => {
    // viewport = 400 → max = floor(400*0.3) = 120, which is < SIDEBAR_MIN_WIDTH (200)
    // In practice the sidebar can't resize below min, but clamping should not panic.
    // Math.max(200, Math.min(200, 120)) = Math.max(200, 120) = 200
    expect(clampSidebarWidth(SIDEBAR_MIN_WIDTH, 400)).toBe(SIDEBAR_MIN_WIDTH);
  });
});
