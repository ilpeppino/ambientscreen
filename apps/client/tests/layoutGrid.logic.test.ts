import assert from "node:assert/strict";
import test from "node:test";
import {
  computeLayoutFrame,
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
