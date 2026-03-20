import assert from "node:assert/strict";
import test from "node:test";
import {
  getDisplayRefreshIntervalMs,
  selectDisplayWidget,
} from "../src/features/display/displayScreen.logic";

const widgetA = {
  id: "widget-a",
  userId: "user-1",
  type: "weather",
  config: {},
  position: 0,
  isActive: false,
  createdAt: "2026-03-20T12:00:00.000Z",
  updatedAt: "2026-03-20T12:00:00.000Z",
};

const widgetB = {
  id: "widget-b",
  userId: "user-1",
  type: "clockDate",
  config: {},
  position: 1,
  isActive: true,
  createdAt: "2026-03-20T12:00:00.000Z",
  updatedAt: "2026-03-20T12:00:00.000Z",
};

test("selectDisplayWidget picks the first widget when there is no previous selection", () => {
  const selected = selectDisplayWidget([widgetA, widgetB], null);
  assert.equal(selected?.id, "widget-a");
});

test("selectDisplayWidget keeps previous selection if it still exists", () => {
  const selected = selectDisplayWidget([widgetA, widgetB], widgetB);
  assert.equal(selected?.id, "widget-b");
});

test("selectDisplayWidget falls back to first widget when previous is gone", () => {
  const selected = selectDisplayWidget([widgetA], widgetB);
  assert.equal(selected?.id, "widget-a");
});

test("getDisplayRefreshIntervalMs returns 1s only for clockDate", () => {
  assert.equal(getDisplayRefreshIntervalMs("clockDate"), 1000);
  assert.equal(getDisplayRefreshIntervalMs("weather"), null);
  assert.equal(getDisplayRefreshIntervalMs(undefined), null);
});
