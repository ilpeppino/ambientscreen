import assert from "node:assert/strict";
import test from "node:test";
import { computeLayoutFrame } from "../src/features/display/components/LayoutGrid.logic";

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
