import { test, expect } from "vitest";
import { getWidgetErrorLabel, toWidgetEnvelope } from "../src/features/display/components/WidgetContainer.logic";

test("toWidgetEnvelope keeps normalized envelope fields", () => {
  const envelope = toWidgetEnvelope({
    widgetInstanceId: "widget-1",
    widgetKey: "clockDate",
    layout: { x: 0, y: 0, w: 12, h: 6 },
    state: "ready",
    config: {},
    configSchema: {},
    data: {
      nowIso: "2026-03-27T10:00:00.000Z",
      formattedTime: "10:00",
      formattedDate: "27 March",
      weekdayLabel: "Friday",
    },
    meta: {
      resolvedAt: "2026-03-27T10:00:00.000Z",
      fetchedAt: "2026-03-27T10:00:00.000Z",
      source: "system",
    },
  });

  expect(envelope.widgetInstanceId).toBe("widget-1");
  expect(envelope.widgetKey).toBe("clockDate");
  expect(envelope.meta?.source).toBe("system");
});

test("getWidgetErrorLabel prefers backend message", () => {
  const label = getWidgetErrorLabel({
    widgetInstanceId: "widget-1",
    widgetKey: "weather",
    layout: { x: 0, y: 0, w: 4, h: 2 },
    state: "error",
    config: {},
    configSchema: {},
    data: null,
    meta: {
      resolvedAt: "2026-03-27T10:00:00.000Z",
      message: "Provider unavailable",
    },
  });

  expect(label).toBe("Provider unavailable");
});
