import { test, expect } from "vitest";
import {
  applyDragDelta,
  applyResizeDelta,
  clampWidgetLayout,
  computeLayoutFrame,
  normalizeWidgetLayouts,
  resolveWidgetLayoutCollision,
  resolveWidgetLayouts,
} from "../src/features/display/components/LayoutGrid.logic";

test("computeLayoutFrame maps 12-column grid values to absolute bounds", () => {
  const frame = computeLayoutFrame({
    layout: { x: 3, y: 2, w: 6, h: 2 },
    containerWidth: 1200,
    containerHeight: 600,
  });

  expect(frame).toEqual({
    left: 300,
    width: 600,
    top: 200,
    height: 200,
  });
});

test("computeLayoutFrame supports responsive resizing", () => {
  const wideFrame = computeLayoutFrame({
    layout: { x: 6, y: 1, w: 6, h: 3 },
    containerWidth: 1200,
    containerHeight: 600,
  });

  const narrowFrame = computeLayoutFrame({
    layout: { x: 6, y: 1, w: 6, h: 3 },
    containerWidth: 600,
    containerHeight: 300,
  });

  expect(wideFrame.left).toBe(600);
  expect(wideFrame.width).toBe(600);
  expect(narrowFrame.left).toBe(300);
  expect(narrowFrame.width).toBe(300);
  expect(narrowFrame.top).toBe(50);
  expect(narrowFrame.height).toBe(150);
});

test("resolveWidgetLayouts keeps non-overlapping layouts unchanged", () => {
  const layouts = [
    { x: 0, y: 0, w: 6, h: 3 },
    { x: 6, y: 0, w: 6, h: 3 },
  ];

  const resolvedLayouts = resolveWidgetLayouts({ layouts });
  expect(resolvedLayouts).toEqual(layouts);
});

test("resolveWidgetLayouts auto-flows overlapping layouts", () => {
  const layouts = [
    { x: 0, y: 0, w: 1, h: 1 },
    { x: 0, y: 0, w: 1, h: 1 },
    { x: 0, y: 0, w: 1, h: 1 },
  ];

  const resolvedLayouts = resolveWidgetLayouts({ layouts });

  expect(resolvedLayouts).toEqual([
    { x: 0, y: 0, w: 4, h: 2 },
    { x: 4, y: 0, w: 4, h: 2 },
    { x: 8, y: 0, w: 4, h: 2 },
  ]);
});

test("clampWidgetLayout enforces grid boundaries", () => {
  const clamped = clampWidgetLayout({
    layout: { x: -4, y: -2, w: 14, h: 9 },
  });

  expect(clamped).toEqual({ x: 0, y: 0, w: 12, h: 6 });
});

test("clampWidgetLayout keeps x + w within 12 columns", () => {
  const clamped = clampWidgetLayout({
    layout: { x: 11, y: 2, w: 4, h: 2 },
  });

  expect(clamped).toEqual({ x: 8, y: 2, w: 4, h: 2 });
});

test("applyDragDelta updates layout position and clamps", () => {
  const dragged = applyDragDelta({
    layout: { x: 9, y: 4, w: 3, h: 2 },
    deltaX: 3,
    deltaY: 2,
  });

  expect(dragged).toEqual({ x: 9, y: 4, w: 3, h: 2 });
});

test("applyResizeDelta updates layout dimensions and clamps", () => {
  const resized = applyResizeDelta({
    layout: { x: 2, y: 1, w: 2, h: 2 },
    deltaX: 20,
    deltaY: 10,
  });

  expect(resized).toEqual({ x: 0, y: 0, w: 12, h: 6 });
});

test("resolveWidgetLayoutCollision repositions to a non-overlapping slot", () => {
  const resolved = resolveWidgetLayoutCollision({
    widgetId: "widget-2",
    proposedLayout: { x: 0, y: 0, w: 6, h: 3 },
    layoutsById: {
      "widget-1": { x: 0, y: 0, w: 6, h: 3 },
      "widget-2": { x: 6, y: 0, w: 6, h: 3 },
    },
  });

  expect(resolved).toEqual({ x: 6, y: 0, w: 6, h: 3 });
});

test("resolveWidgetLayoutCollision keeps proposed layout when there is no overlap", () => {
  const resolved = resolveWidgetLayoutCollision({
    widgetId: "widget-2",
    proposedLayout: { x: 6, y: 0, w: 6, h: 3 },
    layoutsById: {
      "widget-1": { x: 0, y: 0, w: 6, h: 3 },
      "widget-2": { x: 6, y: 3, w: 6, h: 3 },
    },
  });

  expect(resolved).toEqual({ x: 6, y: 0, w: 6, h: 3 });
});

test("normalizeWidgetLayouts resolves overlaps across the full widget set", () => {
  const normalized = normalizeWidgetLayouts({
    layoutsById: {
      "widget-1": { x: 0, y: 0, w: 6, h: 3 },
      "widget-2": { x: 0, y: 0, w: 6, h: 3 },
      "widget-3": { x: 0, y: 0, w: 6, h: 3 },
    },
    orderedWidgetIds: ["widget-1", "widget-2", "widget-3"],
  });

  expect(normalized["widget-1"]).toEqual({ x: 0, y: 0, w: 6, h: 3 });
  expect(normalized["widget-2"]).toEqual({ x: 6, y: 0, w: 6, h: 3 });
  expect(normalized["widget-3"]).toEqual({ x: 0, y: 3, w: 6, h: 3 });
});
