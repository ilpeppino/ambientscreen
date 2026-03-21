import { test, expect } from "vitest";
import { resolveWidgetRendererKind } from "../src/widgets/widgetRendererMap.logic";

test("resolveWidgetRendererKind maps clockDate", () => {
  expect(resolveWidgetRendererKind("clockDate")).toBe("clockDate");
});

test("resolveWidgetRendererKind maps weather", () => {
  expect(resolveWidgetRendererKind("weather")).toBe("weather");
});

test("resolveWidgetRendererKind maps calendar", () => {
  expect(resolveWidgetRendererKind("calendar")).toBe("calendar");
});
