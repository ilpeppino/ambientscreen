import assert from "node:assert/strict";
import test from "node:test";
import { selectAdminActiveWidget } from "../src/features/admin/adminHome.logic";

const widgetA = {
  id: "widget-a",
  userId: "user-1",
  type: "calendar",
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

test("selectAdminActiveWidget returns first active widget", () => {
  const selected = selectAdminActiveWidget([widgetA, widgetB]);
  assert.equal(selected?.id, "widget-b");
});

test("selectAdminActiveWidget returns null when there is no active widget", () => {
  const selected = selectAdminActiveWidget([widgetA]);
  assert.equal(selected, null);
});
