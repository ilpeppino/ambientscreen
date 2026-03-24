import { describe, expect, test } from "vitest";
import type { DisplayLayoutWidgetEnvelope } from "../src/services/api/displayLayoutApi";
import { getWidgetDefaultSize, resolveClickAddLayout } from "../src/features/admin/widgetPlacement.logic";

function makeWidget(id: string, layout: { x: number; y: number; w: number; h: number }): DisplayLayoutWidgetEnvelope {
  return {
    widgetInstanceId: id,
    widgetKey: "clockDate",
    layout,
    state: "ready",
    config: {},
    configSchema: {},
    data: null,
    meta: { resolvedAt: "2026-03-23T00:00:00.000Z" },
  };
}

describe("widgetPlacement.logic", () => {
  test("uses manifest default size for built-in widgets", () => {
    expect(getWidgetDefaultSize("clockDate")).toEqual({ w: 4, h: 2 });
    expect(getWidgetDefaultSize("calendar")).toEqual({ w: 6, h: 3 });
  });

  test("click-to-add picks first free slot with manifest dimensions", () => {
    const widgets = [
      makeWidget("w1", { x: 0, y: 0, w: 4, h: 2 }),
      makeWidget("w2", { x: 4, y: 0, w: 4, h: 2 }),
    ];

    const layout = resolveClickAddLayout(widgets, "clockDate");
    expect(layout).toEqual({ x: 8, y: 0, w: 4, h: 2 });
  });

  test("click-to-add shifts to next row when current row has no room", () => {
    const widgets = [
      makeWidget("a", { x: 0, y: 0, w: 6, h: 3 }),
      makeWidget("b", { x: 6, y: 0, w: 6, h: 3 }),
    ];

    const layout = resolveClickAddLayout(widgets, "calendar");
    expect(layout).toEqual({ x: 0, y: 3, w: 6, h: 3 });
  });
});
