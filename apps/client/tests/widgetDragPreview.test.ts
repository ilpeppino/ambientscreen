/**
 * Tests for the widget drag-and-drop skeleton preview system.
 *
 * Covers:
 * - computeCanvasDropPlacement: valid/invalid placement detection
 * - Drag state transitions (manual drag path)
 * - CanvasDropPreview rendering logic
 */
import { describe, expect, test } from "vitest";
import {
  computeCanvasDropPlacement,
  computeDropLayout,
  DEFAULT_DROP_W,
  DEFAULT_DROP_H,
} from "../src/features/admin/components/dropPosition.logic";
import {
  DISPLAY_GRID_COLUMNS,
  DISPLAY_GRID_BASE_ROWS,
} from "../src/features/display/components/LayoutGrid.logic";

// ---------------------------------------------------------------------------
// computeCanvasDropPlacement — valid placement
// ---------------------------------------------------------------------------
describe("computeCanvasDropPlacement", () => {
  const emptyCanvas = { existingLayoutsById: {} };
  const container = { containerWidth: 1200, containerHeight: 600 };

  test("returns isValid=true when drop position is collision-free", () => {
    const result = computeCanvasDropPlacement({
      dropX: 0,
      dropY: 0,
      ...container,
      ...emptyCanvas,
    });

    expect(result.isValid).toBe(true);
    expect(result.layout.x).toBe(0);
    expect(result.layout.y).toBe(0);
    expect(result.layout.w).toBe(DEFAULT_DROP_W);
    expect(result.layout.h).toBe(DEFAULT_DROP_H);
  });

  test("returns isValid=false when drop position collides with existing widget", () => {
    const existingLayoutsById = {
      "widget-a": { x: 0, y: 0, w: DEFAULT_DROP_W, h: DEFAULT_DROP_H },
    };

    // Drop at grid origin — exact collision with widget-a
    const result = computeCanvasDropPlacement({
      dropX: 0,
      dropY: 0,
      ...container,
      existingLayoutsById,
    });

    expect(result.isValid).toBe(false);
    // Resolved layout must not overlap widget-a
    const overlapsA =
      result.layout.x < DEFAULT_DROP_W &&
      result.layout.x + result.layout.w > 0 &&
      result.layout.y < DEFAULT_DROP_H &&
      result.layout.y + result.layout.h > 0;
    expect(overlapsA).toBe(false);
  });

  test("placement is valid at a position clearly away from existing widget", () => {
    const existingLayoutsById = {
      "widget-a": { x: 0, y: 0, w: 4, h: 2 },
    };

    // Drop at right half of canvas — x=600 → col 6
    const result = computeCanvasDropPlacement({
      dropX: 600,
      dropY: 0,
      ...container,
      existingLayoutsById,
    });

    expect(result.isValid).toBe(true);
    expect(result.layout.x).toBeGreaterThanOrEqual(4); // clearly right of widget-a
  });

  test("resolved layout always fits within grid bounds", () => {
    const result = computeCanvasDropPlacement({
      dropX: 1199,
      dropY: 599,
      ...container,
      ...emptyCanvas,
    });

    expect(result.layout.x + result.layout.w).toBeLessThanOrEqual(DISPLAY_GRID_COLUMNS);
    expect(result.layout.y + result.layout.h).toBeLessThanOrEqual(DISPLAY_GRID_BASE_ROWS);
  });

  test("handles zero-size container without throwing", () => {
    expect(() =>
      computeCanvasDropPlacement({
        dropX: 0,
        dropY: 0,
        containerWidth: 0,
        containerHeight: 0,
        ...emptyCanvas,
      }),
    ).not.toThrow();
  });

  test("respects custom widget dimensions for collision check", () => {
    const existingLayoutsById = {
      // Occupies a 6×3 block at origin
      "widget-big": { x: 0, y: 0, w: 6, h: 3 },
    };

    // Drop at origin with a 6×3 widget — should collide and get relocated
    const result = computeCanvasDropPlacement({
      dropX: 0,
      dropY: 0,
      ...container,
      existingLayoutsById,
      widgetW: 6,
      widgetH: 3,
    });

    expect(result.isValid).toBe(false);
  });

  test("computeCanvasDropPlacement and computeDropLayout produce the same layout", () => {
    // The resolved layout from both helpers must match for the same input
    const opts = {
      dropX: 300,
      dropY: 100,
      ...container,
      existingLayoutsById: { "w1": { x: 0, y: 0, w: 2, h: 1 } },
    };

    const fromDrop = computeDropLayout(opts);
    const fromPreview = computeCanvasDropPlacement(opts);

    expect(fromPreview.layout).toEqual(fromDrop);
  });
});

// ---------------------------------------------------------------------------
// Drag state events (manual drag path)
// ---------------------------------------------------------------------------
describe("WIDGET_DRAG_CANVAS_HOVER_EVENT", () => {
  test("event constants are unique strings", async () => {
    const events = await import("../src/features/admin/components/widgetManualDrag.events");
    expect(events.WIDGET_DRAG_CANVAS_HOVER_EVENT).toBeTypeOf("string");
    expect(events.WIDGET_DRAG_START_EVENT).toBeTypeOf("string");
    expect(events.MANUAL_WIDGET_DRAG_MOVE_EVENT).toBeTypeOf("string");
    expect(events.MANUAL_WIDGET_DRAG_END_EVENT).toBeTypeOf("string");

    // All event names must be distinct
    const names = [
      events.WIDGET_DRAG_CANVAS_HOVER_EVENT,
      events.WIDGET_DRAG_START_EVENT,
      events.MANUAL_WIDGET_DRAG_MOVE_EVENT,
      events.MANUAL_WIDGET_DRAG_END_EVENT,
    ];
    expect(new Set(names).size).toBe(names.length);
  });
});

// ---------------------------------------------------------------------------
// Grid snap placement — deterministic snapping
// ---------------------------------------------------------------------------
describe("canvas drop placement snapping", () => {
  const container = { containerWidth: 1200, containerHeight: 600 };

  test("snap to column: cursor at 25% width maps to col 3", () => {
    // dropX = 300 → floor(300/1200 * 12) = 3
    const result = computeCanvasDropPlacement({
      dropX: 300,
      dropY: 0,
      ...container,
      existingLayoutsById: {},
    });

    expect(result.layout.x).toBe(3);
  });

  test("snap to row: cursor at 50% height maps to row 3", () => {
    // dropY = 300 → floor(300/600 * 6) = 3
    const result = computeCanvasDropPlacement({
      dropX: 0,
      dropY: 300,
      ...container,
      existingLayoutsById: {},
    });

    expect(result.layout.y).toBe(3);
  });

  test("clamps column so widget does not overflow the right edge", () => {
    const result = computeCanvasDropPlacement({
      dropX: 1199,
      dropY: 0,
      ...container,
      existingLayoutsById: {},
    });

    expect(result.layout.x + result.layout.w).toBeLessThanOrEqual(DISPLAY_GRID_COLUMNS);
  });

  test("clamps row so widget does not overflow the bottom edge", () => {
    const result = computeCanvasDropPlacement({
      dropX: 0,
      dropY: 599,
      ...container,
      existingLayoutsById: {},
    });

    expect(result.layout.y + result.layout.h).toBeLessThanOrEqual(DISPLAY_GRID_BASE_ROWS);
  });
});
