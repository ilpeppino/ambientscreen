import { test, expect, afterEach, beforeEach, vi, describe } from "vitest";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import { widgetDataService } from "../src/modules/widgetData/widget-data.service";
import { resolveCalendarWidgetData } from "../src/modules/widgetData/resolvers/calendar.resolver";
import { resolveClockDateWidgetData } from "../src/modules/widgetData/resolvers/clockDate.resolver";
import { resolveRssNewsWidgetData } from "../src/modules/widgetData/resolvers/rssNews.resolver";
import { resolveWeatherWidgetData } from "../src/modules/widgetData/resolvers/weather.resolver";
import * as widgetPluginRegistry from "../src/modules/widgets/widgetPluginRegistry";

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

test("widgetDataService returns safe error when plugin lookup fails", async () => {
  vi.spyOn(widgetPluginRegistry, "getWidgetPlugin").mockImplementation(() => null);

  const result = await widgetDataService.getWidgetDataForUser("widget-clock", "user-1");
  expect(result?.state).toBe("error");
  expect(result?.meta?.errorCode).toBe("UNSUPPORTED_WIDGET_TYPE");
});

test("widgetDataService returns safe error when config validation fails", async () => {
  vi.spyOn(widgetsRepository, "findByIdForUser").mockResolvedValueOnce({
    id: "widget-weather",
    profileId: "user-1",
    type: "weather",
    config: {
      units: "kelvin",
    },
    layout: { x: 0, y: 0, w: 1, h: 1 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never);

  const result = await widgetDataService.getWidgetDataForUser("widget-weather", "user-1");
  expect(result?.state).toBe("error");
  expect(result?.meta?.errorCode).toBe("INVALID_WIDGET_CONFIG");
});

describe("clockDate resolver config normalization", () => {
  test("hour12=true produces 12-hour formatted time", async () => {
    const result = await resolveClockDateWidgetData({
      widgetInstanceId: "w1",
      widgetConfig: { hour12: true, timezone: "local" },
    });
    expect(result.state).toBe("ready");
    // 12h format uses AM/PM suffix
    expect(result.data?.formattedTime).toMatch(/AM|PM/i);
  });

  test("hour12=false produces 24-hour formatted time", async () => {
    const result = await resolveClockDateWidgetData({
      widgetInstanceId: "w1",
      widgetConfig: { hour12: false, timezone: "local" },
    });
    expect(result.state).toBe("ready");
    expect(result.data?.formattedTime).not.toMatch(/AM|PM/i);
  });

  test("legacy format='12h' produces 12-hour formatted time (backward compat)", async () => {
    const result = await resolveClockDateWidgetData({
      widgetInstanceId: "w1",
      widgetConfig: { format: "12h", timezone: "local" },
    });
    expect(result.state).toBe("ready");
    expect(result.data?.formattedTime).toMatch(/AM|PM/i);
  });

  test("legacy format='24h' produces 24-hour formatted time (backward compat)", async () => {
    const result = await resolveClockDateWidgetData({
      widgetInstanceId: "w1",
      widgetConfig: { format: "24h", timezone: "local" },
    });
    expect(result.state).toBe("ready");
    expect(result.data?.formattedTime).not.toMatch(/AM|PM/i);
  });

  test("empty config defaults to 24-hour formatted time", async () => {
    const result = await resolveClockDateWidgetData({
      widgetInstanceId: "w1",
      widgetConfig: {},
    });
    expect(result.state).toBe("ready");
    expect(result.data?.formattedTime).not.toMatch(/AM|PM/i);
  });

  test("hour12 wins over format on the read path (resolver)", async () => {
    // In the resolver, hour12 is checked first; format is only a fallback for legacy data.
    // If a stale persisted record somehow has both, hour12 takes precedence.
    const result = await resolveClockDateWidgetData({
      widgetInstanceId: "w1",
      widgetConfig: { hour12: false, format: "12h", timezone: "local" },
    });
    expect(result.state).toBe("ready");
    expect(result.data?.formattedTime).not.toMatch(/AM|PM/i);
  });
});

test("weather resolver returns normalized ready payload from provider data", async () => {
  const result = await resolveWeatherWidgetData({
    widgetInstanceId: "widget-weather",
    widgetConfig: {
      city: "Amsterdam",
      units: "metric",
    },
    fetchWeatherData: async () => {
      return {
        locationLabel: "Amsterdam, NL",
        temperatureC: 12.2,
        conditionLabel: "Rain",
        forecast: [
          { timeIso: "2026-03-20T12:00:00.000Z", temperatureC: 11.0, conditionLabel: "Rain" },
        ],
        fetchedAtIso: "2026-03-20T12:34:56.000Z",
      };
    },
  });

  expect(result.widgetKey).toBe("weather");
  expect(result.state).toBe("ready");
  expect(result.data).toEqual({
    location: "Amsterdam, NL",
    temperatureC: 12.2,
    conditionLabel: "Rain",
    forecast: [
      { timeIso: "2026-03-20T12:00:00.000Z", temperatureC: 11.0, conditionLabel: "Rain" },
    ],
  });
  expect(result.meta?.source).toBe("openweather");
  expect(result.meta?.fetchedAt).toBe("2026-03-20T12:34:56.000Z");
});

test("weather resolver returns empty payload when location cannot be resolved", async () => {
  const result = await resolveWeatherWidgetData({
    widgetInstanceId: "widget-weather",
    widgetConfig: {
      city: "Unknown City",
      units: "metric",
    },
    fetchWeatherData: async () => null,
  });

  expect(result.state).toBe("empty");
  expect(result.data).toEqual({
    location: "Unknown City",
    temperatureC: null,
    conditionLabel: null,
    forecast: [],
  });
  expect(result.meta?.errorCode).toBe("WEATHER_LOCATION_NOT_FOUND");
});

test("weather resolver returns stale payload when provider call fails", async () => {
  const result = await resolveWeatherWidgetData({
    widgetInstanceId: "widget-weather",
    widgetConfig: {
      city: "Amsterdam",
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
    forecast: [],
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

test("rssNews resolver returns normalized ready payload from provider data", async () => {
  const result = await resolveRssNewsWidgetData({
    widgetInstanceId: "widget-rss",
    widgetConfig: {
      feedUrl: "https://news.example.com/rss.xml",
      maxItems: 2,
      showImages: true,
      showPublishedAt: true,
      layout: "headline-list",
      title: "Tech Brief",
    },
    fetchFeedData: async () => ({
      format: "rss",
      fetchedAtIso: "2026-03-27T10:00:00.000Z",
      feedUrl: "https://news.example.com/rss.xml",
      channel: {
        title: "Example News",
        link: "https://news.example.com",
      },
      items: [
        {
          id: "a1",
          title: "First headline",
          link: "https://news.example.com/a1",
          summary: "Summary 1",
          publishedAt: "2026-03-27T09:00:00Z",
          imageUrl: "https://cdn.example.com/a1.jpg",
        },
        {
          id: "a2",
          title: "Second headline",
          link: "https://news.example.com/a2",
          summary: "Summary 2",
          publishedAt: "2026-03-27T08:30:00Z",
        },
      ],
    }),
  });

  expect(result.widgetKey).toBe("rssNews");
  expect(result.state).toBe("ready");
  expect(result.data).toEqual({
    title: "Tech Brief",
    siteTitle: "Example News",
    feedUrl: "https://news.example.com/rss.xml",
    items: [
      {
        id: "a1",
        title: "First headline",
        link: "https://news.example.com/a1",
        summary: "Summary 1",
        publishedAt: "2026-03-27T09:00:00.000Z",
        imageUrl: "https://cdn.example.com/a1.jpg",
      },
      {
        id: "a2",
        title: "Second headline",
        link: "https://news.example.com/a2",
        summary: "Summary 2",
        publishedAt: "2026-03-27T08:30:00.000Z",
        imageUrl: undefined,
      },
    ],
  });
  expect(result.meta?.source).toBe("rss");
  expect(result.meta?.fetchedAt).toBe("2026-03-27T10:00:00.000Z");
});

test("rssNews resolver returns empty when feedUrl is missing", async () => {
  const result = await resolveRssNewsWidgetData({
    widgetInstanceId: "widget-rss",
    widgetConfig: {
      title: "Headlines",
    },
  });

  expect(result.state).toBe("empty");
  expect(result.data).toEqual({
    title: "Headlines",
    siteTitle: undefined,
    feedUrl: "",
    items: [],
  });
  expect(result.meta?.errorCode).toBe("RSS_FEED_NOT_CONFIGURED");
});

test("rssNews resolver returns stale when provider call fails", async () => {
  const result = await resolveRssNewsWidgetData({
    widgetInstanceId: "widget-rss",
    widgetConfig: {
      feedUrl: "https://news.example.com/rss.xml",
      title: "Headlines",
    },
    fetchFeedData: async () => {
      throw new Error("provider unavailable");
    },
  });

  expect(result.state).toBe("stale");
  expect(result.data).toEqual({
    title: "Headlines",
    siteTitle: undefined,
    feedUrl: "https://news.example.com/rss.xml",
    items: [],
  });
  expect(result.meta?.errorCode).toBe("RSS_PROVIDER_UNAVAILABLE");
});
