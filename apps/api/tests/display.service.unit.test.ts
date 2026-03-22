import { test, expect, afterEach, beforeEach, vi } from "vitest";
import { displayService } from "../src/modules/display/display.service";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import * as widgetPluginRegistry from "../src/modules/widgets/widgetPluginRegistry";

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

  vi.spyOn(widgetPluginRegistry, "getWidgetPlugin").mockImplementation((widgetKey) => {
    if (widgetKey === "clockDate") {
      return {
        manifest: {
          key: "clockDate",
          version: "1.0.0",
          name: "Clock & Date",
          description: "",
          category: "time",
          defaultLayout: { w: 4, h: 2 },
          refreshPolicy: { intervalMs: 1000 },
        },
        configSchema: {},
        defaultConfig: {},
        api: {
          resolveData: async ({ widgetInstanceId }) => ({
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
          }),
        },
      } as never;
    }

    if (widgetKey === "weather") {
      return {
        manifest: {
          key: "weather",
          version: "1.0.0",
          name: "Weather",
          description: "",
          category: "environment",
          defaultLayout: { w: 4, h: 2 },
          refreshPolicy: { intervalMs: 300000 },
        },
        configSchema: {
          location: "string",
        },
        defaultConfig: {
          location: "Amsterdam",
          units: "metric",
        },
        api: {
          resolveData: async ({ widgetInstanceId }) => ({
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
          }),
        },
      } as never;
    }

    return null;
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
  vi.spyOn(widgetPluginRegistry, "getWidgetPlugin").mockImplementation((widgetKey) => {
    if (widgetKey === "weather") {
      return {
        manifest: {
          key: "weather",
          version: "1.0.0",
          name: "Weather",
          description: "",
          category: "environment",
          defaultLayout: { w: 4, h: 2 },
          refreshPolicy: { intervalMs: 300000 },
        },
        configSchema: {
          location: "string",
          units: ["metric", "imperial"],
        },
        defaultConfig: {
          location: "Amsterdam",
          units: "metric",
        },
        api: {
          resolveData: async () => {
            throw new Error("resolver failed");
          },
        },
      } as never;
    }

    return {
      manifest: {
        key: "clockDate",
        version: "1.0.0",
        name: "Clock & Date",
        description: "",
        category: "time",
        defaultLayout: { w: 4, h: 2 },
        refreshPolicy: { intervalMs: 1000 },
      },
      configSchema: {},
      defaultConfig: {},
      api: {
        resolveData: async ({ widgetInstanceId }) => ({
          widgetInstanceId,
          widgetKey: "clockDate",
          state: "ready",
          data: {
            nowIso: "2026-03-21T10:00:00.000Z",
            formattedTime: "10:00:00",
            formattedDate: "21 March 2026",
            weekdayLabel: "Saturday",
          },
        }),
      },
    } as never;
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
