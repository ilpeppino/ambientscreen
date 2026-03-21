import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDragDelta,
  applyResizeDelta,
  clampWidgetLayout,
  computeLayoutFrame,
  resolveWidgetLayoutCollision,
  resolveWidgetLayouts,
} from "../src/features/display/components/LayoutGrid.logic";

test("computeLayoutFrame maps 12-column grid values to absolute bounds", () => {
  const frame = computeLayoutFrame({
    layout: { x: 3, y: 2, w: 6, h: 2 },
    containerWidth: 1200,
    containerHeight: 600,
  });

  assert.deepEqual(frame, {
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

  assert.equal(wideFrame.left, 600);
  assert.equal(wideFrame.width, 600);
  assert.equal(narrowFrame.left, 300);
  assert.equal(narrowFrame.width, 300);
  assert.equal(narrowFrame.top, 50);
  assert.equal(narrowFrame.height, 150);
});

test("resolveWidgetLayouts keeps non-overlapping layouts unchanged", () => {
  const layouts = [
    { x: 0, y: 0, w: 6, h: 3 },
    { x: 6, y: 0, w: 6, h: 3 },
  ];

  const resolvedLayouts = resolveWidgetLayouts({ layouts });
  assert.deepEqual(resolvedLayouts, layouts);
});

test("resolveWidgetLayouts auto-flows overlapping layouts", () => {
  const layouts = [
    { x: 0, y: 0, w: 1, h: 1 },
    { x: 0, y: 0, w: 1, h: 1 },
    { x: 0, y: 0, w: 1, h: 1 },
  ];

  const resolvedLayouts = resolveWidgetLayouts({ layouts });

  assert.deepEqual(resolvedLayouts, [
    { x: 0, y: 0, w: 4, h: 2 },
    { x: 4, y: 0, w: 4, h: 2 },
    { x: 8, y: 0, w: 4, h: 2 },
  ]);
});

test("clampWidgetLayout enforces grid boundaries", () => {
  const clamped = clampWidgetLayout({
    layout: { x: -4, y: -2, w: 14, h: 9 },
  });

  assert.deepEqual(clamped, { x: 0, y: 0, w: 12, h: 6 });
});

test("clampWidgetLayout keeps x + w within 12 columns", () => {
  const clamped = clampWidgetLayout({
    layout: { x: 11, y: 2, w: 4, h: 2 },
  });

  assert.deepEqual(clamped, { x: 8, y: 2, w: 4, h: 2 });
});

test("applyDragDelta updates layout position and clamps", () => {
  const dragged = applyDragDelta({
    layout: { x: 9, y: 4, w: 3, h: 2 },
    deltaX: 3,
    deltaY: 2,
  });

  assert.deepEqual(dragged, { x: 9, y: 4, w: 3, h: 2 });
});

test("applyResizeDelta updates layout dimensions and clamps", () => {
  const resized = applyResizeDelta({
    layout: { x: 2, y: 1, w: 2, h: 2 },
    deltaX: 20,
    deltaY: 10,
  });

  assert.deepEqual(resized, { x: 0, y: 0, w: 12, h: 6 });
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

  assert.deepEqual(resolved, { x: 6, y: 0, w: 6, h: 3 });
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

  assert.deepEqual(resolved, { x: 6, y: 0, w: 6, h: 3 });
});
