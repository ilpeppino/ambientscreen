import assert from "node:assert/strict";
import test from "node:test";
import { resolveWidgetRendererKind } from "../src/widgets/widgetRendererMap.logic";

test("resolveWidgetRendererKind maps clockDate", () => {
  assert.equal(resolveWidgetRendererKind("clockDate"), "clockDate");
});

test("resolveWidgetRendererKind maps weather", () => {
  assert.equal(resolveWidgetRendererKind("weather"), "weather");
});

test("resolveWidgetRendererKind maps calendar", () => {
  assert.equal(resolveWidgetRendererKind("calendar"), "calendar");
});
