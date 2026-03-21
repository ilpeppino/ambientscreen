import { test, expect, afterEach, beforeEach, vi } from "vitest";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import { widgetDataService } from "../src/modules/widgetData/widget-data.service";
import { resolveCalendarWidgetData } from "../src/modules/widgetData/resolvers/calendar.resolver";
import { resolveWeatherWidgetData } from "../src/modules/widgetData/resolvers/weather.resolver";

beforeEach(() => {
  vi.spyOn(widgetsRepository, "findByIdForUser").mockImplementation(async () => {
    return {
      id: "widget-clock",
      profileId: "user-1",
      type: "clockDate",
      config: {},
      layout: { x: 0, y: 0, w: 1, h: 1 },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("widgetDataService returns normalized payload for clockDate widget", async () => {
  const result = await widgetDataService.getWidgetDataForUser("widget-clock", "user-1");

  expect(result).toBeTruthy();
  expect(result!.widgetKey).toBe("clockDate");
  expect(result!.state).toBe("ready");
  expect(result!.data).toBeTruthy();
  expect(typeof result!.data!.formattedTime).toBe("string");
  expect(typeof result!.data!.formattedDate).toBe("string");
});

test("widgetDataService returns null for another user's widget", async () => {
  vi.spyOn(widgetsRepository, "findByIdForUser").mockResolvedValueOnce(null as never);

  const result = await widgetDataService.getWidgetDataForUser("widget-clock", "user-2");
  expect(result).toBeNull();
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

  expect(result.widgetKey).toBe("weather");
  expect(result.state).toBe("ready");
  expect(result.data).toEqual({
    location: "Amsterdam, North Holland, Netherlands",
    temperatureC: 12.2,
    conditionLabel: "Rain",
  });
  expect(result.meta?.source).toBe("open-meteo");
  expect(result.meta?.fetchedAt).toBe("2026-03-20T12:34:56.000Z");
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

  expect(result.state).toBe("empty");
  expect(result.data).toEqual({
    location: "Unknown City",
    temperatureC: null,
    conditionLabel: null,
  });
  expect(result.meta?.errorCode).toBe("WEATHER_LOCATION_NOT_FOUND");
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

  expect(result.state).toBe("stale");
  expect(result.data).toEqual({
    location: "Amsterdam",
    temperatureC: null,
    conditionLabel: null,
  });
  expect(result.meta?.errorCode).toBe("WEATHER_PROVIDER_UNAVAILABLE");
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

  expect(result.widgetKey).toBe("calendar");
  expect(result.state).toBe("ready");
  expect(result.data?.upcomingCount).toBe(2);
  expect(result.data?.events[0]).toEqual({
    id: "event-1",
    title: "All Day Planning",
    startIso: "2026-03-21T00:00:00.000Z",
    endIso: null,
    allDay: true,
    location: null,
  });
  expect(result.data?.events[1]).toEqual({
    id: "event-2",
    title: "Client Sync",
    startIso: "2026-03-21T14:00:00.000Z",
    endIso: "2026-03-21T14:30:00.000Z",
    allDay: false,
    location: "Room 4A",
  });
  expect(result.meta?.source).toBe("ical");
  expect(result.meta?.fetchedAt).toBe("2026-03-20T12:34:56.000Z");
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

  expect(result.state).toBe("empty");
  expect(result.data).toEqual({
    upcomingCount: 0,
    events: [],
  });
  expect(result.meta?.errorCode).toBe("CALENDAR_FEED_NOT_CONFIGURED");
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

  expect(result.state).toBe("stale");
  expect(result.data).toEqual({
    upcomingCount: 0,
    events: [],
  });
  expect(result.meta?.errorCode).toBe("CALENDAR_PROVIDER_UNAVAILABLE");
});
