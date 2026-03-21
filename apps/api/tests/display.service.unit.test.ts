import { test, expect, afterEach, beforeEach, vi } from "vitest";
import { displayService } from "../src/modules/display/display.service";
import { widgetResolvers } from "../src/modules/widgetData/widget-resolvers";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";

beforeEach(() => {
  vi.spyOn(widgetsRepository, "findAll").mockImplementation(async () => {
    return [
      {
        id: "widget-1",
        profileId: "user-1",
        type: "clockDate",
        config: {},
        layout: { x: 0, y: 0, w: 2, h: 1 },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "widget-2",
        profileId: "user-1",
        type: "weather",
        config: { location: "Amsterdam" },
        layout: { x: 2, y: 0, w: 2, h: 1 },
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never;
  });

  vi.spyOn(widgetResolvers, "clockDate").mockImplementation(async ({ widgetInstanceId }) => {
    return {
      widgetInstanceId,
      widgetKey: "clockDate",
      state: "ready",
      data: {
        nowIso: "2026-03-21T10:00:00.000Z",
        formattedTime: "10:00:00",
        formattedDate: "21 March 2026",
        weekdayLabel: "Saturday",
      },
      meta: {
        source: "system",
        fetchedAt: "2026-03-21T10:00:00.000Z",
      },
    } as never;
  });

  vi.spyOn(widgetResolvers, "weather").mockImplementation(async ({ widgetInstanceId }) => {
    return {
      widgetInstanceId,
      widgetKey: "weather",
      state: "ready",
      data: {
        location: "Amsterdam",
        temperatureC: 10.1,
        conditionLabel: "Rain",
      },
      meta: {
        source: "open-meteo",
        fetchedAt: "2026-03-21T10:01:00.000Z",
      },
    } as never;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("displayService resolves all widgets and attaches layout", async () => {
  const result = await displayService.getDisplayLayout("user-1");

  expect(result.widgets.length).toBe(2);
  expect(result.widgets[0].widgetInstanceId).toBe("widget-1");
  expect(result.widgets[0].widgetKey).toBe("clockDate");
  expect(result.widgets[0].layout).toEqual({ x: 0, y: 0, w: 2, h: 1 });
  expect(result.widgets[0].state).toBe("ready");
  expect(typeof result.widgets[0].meta.resolvedAt).toBe("string");

  expect(result.widgets[1].widgetInstanceId).toBe("widget-2");
  expect(result.widgets[1].widgetKey).toBe("weather");
  expect(result.widgets[1].layout).toEqual({ x: 2, y: 0, w: 2, h: 1 });
  expect(result.widgets[1].state).toBe("ready");
  expect(typeof result.widgets[1].meta.resolvedAt).toBe("string");
});

test("displayService continues when one resolver throws", async () => {
  vi.spyOn(widgetResolvers, "weather").mockImplementation(async () => {
    throw new Error("resolver failed");
  });

  const result = await displayService.getDisplayLayout("user-1");
  expect(result.widgets.length).toBe(2);

  const clockWidget = result.widgets.find((widget) => widget.widgetKey === "clockDate");
  const weatherWidget = result.widgets.find((widget) => widget.widgetKey === "weather");

  expect(clockWidget).toBeTruthy();
  expect(clockWidget!.state).toBe("ready");

  expect(weatherWidget).toBeTruthy();
  expect(weatherWidget!.state).toBe("error");
  expect(weatherWidget!.meta.errorCode).toBe("WIDGET_RESOLUTION_FAILED");
});
