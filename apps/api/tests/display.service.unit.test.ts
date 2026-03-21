import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
import { displayService } from "../src/modules/display/display.service";
import { widgetResolvers } from "../src/modules/widgetData/widget-resolvers";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";

const originalFindAll = widgetsRepository.findAll;
const originalClockResolver = widgetResolvers.clockDate;
const originalWeatherResolver = widgetResolvers.weather;

const mutableWidgetsRepository = widgetsRepository as unknown as {
  findAll: (profileId: string) => Promise<Array<{
    id: string;
    profileId: string;
    type: string;
    config: Record<string, unknown>;
    layout: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>>;
};

beforeEach(() => {
  mutableWidgetsRepository.findAll = async () => {
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
    ];
  };

  widgetResolvers.clockDate = async ({ widgetInstanceId }) => {
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
    };
  };

  widgetResolvers.weather = async ({ widgetInstanceId }) => {
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
    };
  };
});

after(() => {
  mutableWidgetsRepository.findAll =
    originalFindAll as typeof mutableWidgetsRepository.findAll;
  widgetResolvers.clockDate = originalClockResolver;
  widgetResolvers.weather = originalWeatherResolver;
});

test("displayService resolves all widgets and attaches layout", async () => {
  const result = await displayService.getDisplayLayout("user-1");

  assert.equal(result.widgets.length, 2);
  assert.equal(result.widgets[0].widgetInstanceId, "widget-1");
  assert.equal(result.widgets[0].widgetKey, "clockDate");
  assert.deepEqual(result.widgets[0].layout, { x: 0, y: 0, w: 2, h: 1 });
  assert.equal(result.widgets[0].state, "ready");
  assert.equal(typeof result.widgets[0].meta.resolvedAt, "string");

  assert.equal(result.widgets[1].widgetInstanceId, "widget-2");
  assert.equal(result.widgets[1].widgetKey, "weather");
  assert.deepEqual(result.widgets[1].layout, { x: 2, y: 0, w: 2, h: 1 });
  assert.equal(result.widgets[1].state, "ready");
  assert.equal(typeof result.widgets[1].meta.resolvedAt, "string");
});

test("displayService continues when one resolver throws", async () => {
  widgetResolvers.weather = async () => {
    throw new Error("resolver failed");
  };

  const result = await displayService.getDisplayLayout("user-1");
  assert.equal(result.widgets.length, 2);

  const clockWidget = result.widgets.find((widget) => widget.widgetKey === "clockDate");
  const weatherWidget = result.widgets.find((widget) => widget.widgetKey === "weather");

  assert.ok(clockWidget);
  assert.equal(clockWidget.state, "ready");

  assert.ok(weatherWidget);
  assert.equal(weatherWidget.state, "error");
  assert.equal(weatherWidget.meta.errorCode, "WIDGET_RESOLUTION_FAILED");
});
