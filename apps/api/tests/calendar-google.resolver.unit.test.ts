import { test, expect } from "vitest";
import { resolveCalendarWidgetData } from "../src/modules/widgetData/resolvers/calendar.resolver";
import type { GoogleCalendarResult } from "../src/modules/widgetData/providers/googleCalendar.provider";

const BASE_GOOGLE_CONFIG = {
  provider: "google" as const,
  integrationConnectionId: "conn-abc123",
  calendarId: "primary",
  timeWindow: "next7d" as const,
  maxEvents: 5,
  includeAllDay: true,
};

function makeGoogleResult(events: GoogleCalendarResult["events"] = []): GoogleCalendarResult {
  return {
    events,
    fetchedAtIso: "2026-03-25T10:00:00.000Z",
  };
}

function makeEvent(overrides: Partial<GoogleCalendarResult["events"][0]> = {}) {
  return {
    id: "evt-1",
    title: "Team Standup",
    startIso: "2026-03-26T09:00:00.000Z",
    endIso: "2026-03-26T09:30:00.000Z",
    allDay: false,
    location: null,
    ...overrides,
  };
}

const noopIcal = async () => ({ events: [], fetchedAtIso: new Date().toISOString() });

test("Google resolver returns ready state with events", async () => {
  const result = await resolveCalendarWidgetData({
    widgetInstanceId: "widget-1",
    widgetConfig: BASE_GOOGLE_CONFIG,
    userId: "user-1",
    fetchCalendarData: noopIcal,
    getGoogleAccessToken: async () => "access-token-xyz",
    fetchGoogleEvents: async () =>
      makeGoogleResult([makeEvent(), makeEvent({ id: "evt-2", title: "Design Review" })]),
  });

  expect(result.widgetKey).toBe("calendar");
  expect(result.state).toBe("ready");
  expect(result.data?.upcomingCount).toBe(2);
  expect(result.data?.events[0].title).toBe("Team Standup");
  expect(result.data?.events[1].title).toBe("Design Review");
  expect(result.meta?.source).toBe("google");
  expect(result.meta?.fetchedAt).toBe("2026-03-25T10:00:00.000Z");
});

test("Google resolver returns empty state when no events", async () => {
  const result = await resolveCalendarWidgetData({
    widgetInstanceId: "widget-1",
    widgetConfig: BASE_GOOGLE_CONFIG,
    userId: "user-1",
    fetchCalendarData: noopIcal,
    getGoogleAccessToken: async () => "access-token-xyz",
    fetchGoogleEvents: async () => makeGoogleResult([]),
  });

  expect(result.state).toBe("empty");
  expect(result.data).toEqual({ upcomingCount: 0, events: [] });
  expect(result.meta?.source).toBe("google");
});

test("Google resolver returns empty state when integrationConnectionId is missing", async () => {
  const result = await resolveCalendarWidgetData({
    widgetInstanceId: "widget-1",
    widgetConfig: { provider: "google", timeWindow: "next7d" },
    userId: "user-1",
    fetchCalendarData: noopIcal,
    getGoogleAccessToken: async () => "token",
    fetchGoogleEvents: async () => makeGoogleResult([]),
  });

  expect(result.state).toBe("empty");
  expect(result.meta?.errorCode).toBe("CALENDAR_CONNECTION_NOT_CONFIGURED");
});

test("Google resolver returns error state when connection is not found", async () => {
  const result = await resolveCalendarWidgetData({
    widgetInstanceId: "widget-1",
    widgetConfig: BASE_GOOGLE_CONFIG,
    userId: "user-1",
    fetchCalendarData: noopIcal,
    getGoogleAccessToken: async () => {
      throw new Error("CONNECTION_NOT_FOUND");
    },
    fetchGoogleEvents: async () => makeGoogleResult([]),
  });

  expect(result.state).toBe("error");
  expect(result.meta?.errorCode).toBe("CALENDAR_CONNECTION_NOT_FOUND");
});

test("Google resolver returns stale state when Google API call fails", async () => {
  const result = await resolveCalendarWidgetData({
    widgetInstanceId: "widget-1",
    widgetConfig: BASE_GOOGLE_CONFIG,
    userId: "user-1",
    fetchCalendarData: noopIcal,
    getGoogleAccessToken: async () => "access-token-xyz",
    fetchGoogleEvents: async () => {
      throw new Error("Google Calendar API error: 503");
    },
  });

  expect(result.state).toBe("stale");
  expect(result.data).toEqual({ upcomingCount: 0, events: [] });
  expect(result.meta?.errorCode).toBe("CALENDAR_PROVIDER_UNAVAILABLE");
  expect(result.meta?.source).toBe("google");
});

test("Google resolver passes calendarId to fetchGoogleEvents", async () => {
  let capturedCalendarId = "";

  await resolveCalendarWidgetData({
    widgetInstanceId: "widget-1",
    widgetConfig: { ...BASE_GOOGLE_CONFIG, calendarId: "work@example.com" },
    userId: "user-1",
    fetchCalendarData: noopIcal,
    getGoogleAccessToken: async () => "token",
    fetchGoogleEvents: async (input) => {
      capturedCalendarId = input.calendarId;
      return makeGoogleResult([]);
    },
  });

  expect(capturedCalendarId).toBe("work@example.com");
});

test("Google resolver defaults calendarId to 'primary' when not specified", async () => {
  let capturedCalendarId = "";

  await resolveCalendarWidgetData({
    widgetInstanceId: "widget-1",
    widgetConfig: {
      provider: "google",
      integrationConnectionId: "conn-abc123",
      timeWindow: "next7d",
    },
    userId: "user-1",
    fetchCalendarData: noopIcal,
    getGoogleAccessToken: async () => "token",
    fetchGoogleEvents: async (input) => {
      capturedCalendarId = input.calendarId;
      return makeGoogleResult([]);
    },
  });

  expect(capturedCalendarId).toBe("primary");
});

test("iCal resolver still works after Google support added", async () => {
  const result = await resolveCalendarWidgetData({
    widgetInstanceId: "widget-2",
    widgetConfig: {
      provider: "ical",
      account: "https://calendar.example.com/feed.ics",
      timeWindow: "next7d",
      maxEvents: 5,
    },
    fetchCalendarData: async () => ({
      fetchedAtIso: "2026-03-25T10:00:00.000Z",
      events: [makeEvent({ id: "ical-1", title: "iCal Event" })],
    }),
  });

  expect(result.state).toBe("ready");
  expect(result.data?.events[0].title).toBe("iCal Event");
  expect(result.meta?.source).toBe("ical");
});
