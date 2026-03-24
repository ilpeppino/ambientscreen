import { describe, expect, test } from "vitest";
import {
  computeDropLayout,
  DEFAULT_DROP_H,
  DEFAULT_DROP_W,
} from "../src/features/admin/components/dropPosition.logic";
import {
  DISPLAY_GRID_BASE_ROWS,
  DISPLAY_GRID_COLUMNS,
} from "../src/features/display/components/LayoutGrid.logic";

describe("computeDropLayout", () => {
  const emptyCanvas = { existingLayoutsById: {} };
  const container = { containerWidth: 1200, containerHeight: 600 };

  test("places widget at grid coords matching the drop pixel position", () => {
    // Drop at (300, 100) in a 1200×600 canvas → col 3, row 1
    const layout = computeDropLayout({
      dropX: 300,
      dropY: 100,
      ...container,
      ...emptyCanvas,
    });

    // col = floor(300/1200 * 12) = floor(3) = 3
    // row = floor(100/600 * 6)  = floor(1) = 1
    expect(layout.x).toBe(3);
    expect(layout.y).toBe(1);
    expect(layout.w).toBe(DEFAULT_DROP_W);
    expect(layout.h).toBe(DEFAULT_DROP_H);
  });

  test("clamps x so the widget does not overflow the right edge", () => {
    // Drop near the right edge — raw col would be 11, but w=4 → max x = 12-4=8
    const layout = computeDropLayout({
      dropX: 1199,
      dropY: 0,
      ...container,
      ...emptyCanvas,
    });

    expect(layout.x).toBeLessThanOrEqual(DISPLAY_GRID_COLUMNS - DEFAULT_DROP_W);
    expect(layout.x + layout.w).toBeLessThanOrEqual(DISPLAY_GRID_COLUMNS);
  });

  test("clamps y so the widget does not overflow the bottom edge", () => {
    const layout = computeDropLayout({
      dropX: 0,
      dropY: 599,
      ...container,
      ...emptyCanvas,
    });

    expect(layout.y).toBeLessThanOrEqual(DISPLAY_GRID_BASE_ROWS - DEFAULT_DROP_H);
    expect(layout.y + layout.h).toBeLessThanOrEqual(DISPLAY_GRID_BASE_ROWS);
  });

  test("resolves collision against an existing widget", () => {
    // Existing widget occupies columns 0–3 in row 0–1
    const existingLayoutsById = {
      "widget-a": { x: 0, y: 0, w: 4, h: 2 },
    };

    // Drop right at x=0, y=0 — should be pushed out of the way
    const layout = computeDropLayout({
      dropX: 0,
      dropY: 0,
      ...container,
      existingLayoutsById,
    });

    // The resolved layout must not overlap with widget-a
    const overlapsA =
      layout.x < 4 && layout.x + layout.w > 0 && layout.y < 2 && layout.y + layout.h > 0;
    expect(overlapsA).toBe(false);
  });

  test("respects custom widget dimensions", () => {
    const layout = computeDropLayout({
      dropX: 0,
      dropY: 0,
      ...container,
      ...emptyCanvas,
      widgetW: 6,
      widgetH: 3,
    });

    expect(layout.w).toBe(6);
    expect(layout.h).toBe(3);
    expect(layout.x + layout.w).toBeLessThanOrEqual(DISPLAY_GRID_COLUMNS);
    expect(layout.y + layout.h).toBeLessThanOrEqual(DISPLAY_GRID_BASE_ROWS);
  });

  test("handles zero-size container gracefully", () => {
    // Should not throw and should return a clamped layout
    expect(() =>
      computeDropLayout({
        dropX: 0,
        dropY: 0,
        containerWidth: 0,
        containerHeight: 0,
        ...emptyCanvas,
      }),
    ).not.toThrow();
  });

  test("handles drop at canvas centre on an empty canvas", () => {
    const layout = computeDropLayout({
      dropX: 600,
      dropY: 300,
      ...container,
      ...emptyCanvas,
    });

    // col = floor(600/1200 * 12) = 6; clamped to 6 (6+4=10 ≤ 12)
    // row = floor(300/600  * 6)  = 3; clamped to 3 (3+2=5 ≤ 6)
    expect(layout.x).toBe(6);
    expect(layout.y).toBe(3);
  });
});
