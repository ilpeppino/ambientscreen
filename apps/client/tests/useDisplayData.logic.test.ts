import { expect, test } from "vitest";
import type { DisplayLayoutResponse } from "../src/services/api/displayLayoutApi";
import { resolveSlideComposition } from "../src/features/display/hooks/useDisplayData";

function buildWidget(widgetInstanceId: string, x: number) {
  return {
    widgetInstanceId,
    widgetKey: "clockDate" as const,
    layout: { x, y: 0, w: 2, h: 1 },
    state: "ready" as const,
    config: {},
    configSchema: {},
    data: {
      nowIso: "2026-03-24T10:00:00.000Z",
      formattedTime: "10:00",
      formattedDate: "24 March",
      weekdayLabel: "Tuesday",
    },
    meta: {
      resolvedAt: "2026-03-24T10:00:00.000Z",
    },
  };
}

test("resolveSlideComposition prefers explicit slide envelope", () => {
  const response: DisplayLayoutResponse = {
    slide: {
      id: "slide-1",
      name: "Primary",
      order: 0,
      durationSeconds: 30,
      isEnabled: true,
      widgets: [buildWidget("widget-1", 2)],
    },
    widgets: [buildWidget("legacy-widget", 8)],
  };

  const slide = resolveSlideComposition(response);
  expect(slide.id).toBe("slide-1");
  expect(slide.widgets).toHaveLength(1);
  expect(slide.widgets[0].widgetInstanceId).toBe("widget-1");
});

test("resolveSlideComposition creates default slide from legacy widgets payload", () => {
  const response: DisplayLayoutResponse = {
    widgets: [buildWidget("widget-1", 2)],
  };

  const slide = resolveSlideComposition(response);
  expect(slide.id).toBe("default-slide-v0");
  expect(slide.name).toBe("Default");
  expect(slide.widgets).toHaveLength(1);
  expect(slide.widgets[0].widgetInstanceId).toBe("widget-1");
});
