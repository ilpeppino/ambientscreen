import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import { widgetDataService } from "../src/modules/widgetData/widget-data.service";
import { resolveCalendarWidgetData } from "../src/modules/widgetData/resolvers/calendar.resolver";
import { resolveWeatherWidgetData } from "../src/modules/widgetData/resolvers/weather.resolver";

const originalFindById = widgetsRepository.findById;
const mutableWidgetsRepository = widgetsRepository as unknown as {
  findById: (id: string) => Promise<{
    id: string;
    userId: string;
    type: string;
    config: Record<string, unknown>;
    position: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null>;
};

beforeEach(() => {
  mutableWidgetsRepository.findById = async () => {
    return {
      id: "widget-clock",
      userId: "user-1",
      type: "clockDate",
      config: {},
      position: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };
});

after(() => {
  mutableWidgetsRepository.findById =
    originalFindById as typeof mutableWidgetsRepository.findById;
});

test("widgetDataService returns normalized payload for clockDate widget", async () => {
  const result = await widgetDataService.getWidgetData("widget-clock");

  assert.ok(result);
  assert.equal(result.widgetKey, "clockDate");
  assert.equal(result.state, "ready");
  assert.ok(result.data);
  assert.equal(typeof result.data.formattedTime, "string");
  assert.equal(typeof result.data.formattedDate, "string");
});

test("weather resolver returns normalized ready payload from provider data", async () => {
  const result = await resolveWeatherWidgetData({
    widgetInstanceId: "widget-weather",
    widgetConfig: {
      location: "Amsterdam",
      units: "metric",
    },
    fetchWeatherData: async () => {
      return {
        locationLabel: "Amsterdam, North Holland, Netherlands",
        temperature: 12.24,
        temperatureUnit: "celsius",
        conditionLabel: "Rain",
        fetchedAtIso: "2026-03-20T12:34:56.000Z",
      };
    },
  });

  assert.equal(result.widgetKey, "weather");
  assert.equal(result.state, "ready");
  assert.deepEqual(result.data, {
    location: "Amsterdam, North Holland, Netherlands",
    temperatureC: 12.2,
    conditionLabel: "Rain",
  });
  assert.equal(result.meta?.source, "open-meteo");
  assert.equal(result.meta?.fetchedAt, "2026-03-20T12:34:56.000Z");
});

test("weather resolver returns empty payload when location cannot be resolved", async () => {
  const result = await resolveWeatherWidgetData({
    widgetInstanceId: "widget-weather",
    widgetConfig: {
      location: "Unknown City",
      units: "metric",
    },
    fetchWeatherData: async () => null,
  });

  assert.equal(result.state, "empty");
  assert.deepEqual(result.data, {
    location: "Unknown City",
    temperatureC: null,
    conditionLabel: null,
  });
  assert.equal(result.meta?.errorCode, "WEATHER_LOCATION_NOT_FOUND");
});

test("weather resolver returns stale payload when provider call fails", async () => {
  const result = await resolveWeatherWidgetData({
    widgetInstanceId: "widget-weather",
    widgetConfig: {
      location: "Amsterdam",
      units: "metric",
    },
    fetchWeatherData: async () => {
      throw new Error("provider unavailable");
    },
  });

  assert.equal(result.state, "stale");
  assert.deepEqual(result.data, {
    location: "Amsterdam",
    temperatureC: null,
    conditionLabel: null,
  });
  assert.equal(result.meta?.errorCode, "WEATHER_PROVIDER_UNAVAILABLE");
});

test("calendar resolver returns normalized events with all-day and timed entries", async () => {
  const result = await resolveCalendarWidgetData({
    widgetInstanceId: "widget-calendar",
    widgetConfig: {
      provider: "ical",
      account: "https://calendar.example.com/feed.ics",
      timeWindow: "next7d",
      includeAllDay: true,
      maxEvents: 5,
    },
    fetchCalendarData: async () => {
      return {
        fetchedAtIso: "2026-03-20T12:34:56.000Z",
        events: [
          {
            id: "event-1",
            title: "All Day Planning",
            startIso: "2026-03-21T00:00:00.000Z",
            endIso: null,
            allDay: true,
            location: null,
          },
          {
            id: "event-2",
            title: "Client Sync",
            startIso: "2026-03-21T14:00:00.000Z",
            endIso: "2026-03-21T14:30:00.000Z",
            allDay: false,
            location: "Room 4A",
          },
        ],
      };
    },
  });

  assert.equal(result.widgetKey, "calendar");
  assert.equal(result.state, "ready");
  assert.equal(result.data?.upcomingCount, 2);
  assert.deepEqual(result.data?.events[0], {
    id: "event-1",
    title: "All Day Planning",
    startIso: "2026-03-21T00:00:00.000Z",
    endIso: null,
    allDay: true,
    location: null,
  });
  assert.deepEqual(result.data?.events[1], {
    id: "event-2",
    title: "Client Sync",
    startIso: "2026-03-21T14:00:00.000Z",
    endIso: "2026-03-21T14:30:00.000Z",
    allDay: false,
    location: "Room 4A",
  });
  assert.equal(result.meta?.source, "ical");
  assert.equal(result.meta?.fetchedAt, "2026-03-20T12:34:56.000Z");
});

test("calendar resolver returns empty when account is missing", async () => {
  const result = await resolveCalendarWidgetData({
    widgetInstanceId: "widget-calendar",
    widgetConfig: {
      provider: "ical",
      timeWindow: "next7d",
      maxEvents: 5,
      includeAllDay: true,
    },
  });

  assert.equal(result.state, "empty");
  assert.deepEqual(result.data, {
    upcomingCount: 0,
    events: [],
  });
  assert.equal(result.meta?.errorCode, "CALENDAR_FEED_NOT_CONFIGURED");
});

test("calendar resolver returns stale when provider fails", async () => {
  const result = await resolveCalendarWidgetData({
    widgetInstanceId: "widget-calendar",
    widgetConfig: {
      provider: "ical",
      account: "https://calendar.example.com/feed.ics",
      timeWindow: "next7d",
      includeAllDay: false,
      maxEvents: 3,
    },
    fetchCalendarData: async () => {
      throw new Error("provider unavailable");
    },
  });

  assert.equal(result.state, "stale");
  assert.deepEqual(result.data, {
    upcomingCount: 0,
    events: [],
  });
  assert.equal(result.meta?.errorCode, "CALENDAR_PROVIDER_UNAVAILABLE");
});
