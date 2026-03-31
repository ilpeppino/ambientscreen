import { test, expect } from "vitest";
import { resolveCalendarWidgetData } from "../src/modules/widgetData/resolvers/calendar.resolver";
import type { GoogleCalendarResult } from "../src/modules/widgetData/providers/googleCalendar.provider";

const BASE_GOOGLE_CONFIG = {
  provider: "google" as const,
  integrationConnectionId: "conn-abc123",
  calendarIds: ["primary"],
  timeWindow: "next7d" as const,
  maxItems: 5,
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

test("Google resolver returns ready state with merged, sorted events", async () => {
  const result = await resolveCalendarWidgetData({
    widgetInstanceId: "widget-1",
    widgetConfig: { ...BASE_GOOGLE_CONFIG, calendarIds: ["work", "personal"] },
    userId: "user-1",
    fetchCalendarData: noopIcal,
    getGoogleAccessToken: async () => "access-token-xyz",
    fetchGoogleEvents: async (input) => {
      if (input.calendarId === "work") {
        return makeGoogleResult([
          makeEvent({ id: "evt-2", title: "Design Review", startIso: "2026-03-26T11:00:00.000Z" }),
        ]);
      }
      return makeGoogleResult([
        makeEvent({ id: "evt-1", title: "Team Standup", startIso: "2026-03-26T09:00:00.000Z" }),
      ]);
    },
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

test("Google resolver fetches every selected calendar", async () => {
  const capturedCalendarIds: string[] = [];

  await resolveCalendarWidgetData({
    widgetInstanceId: "widget-1",
    widgetConfig: { ...BASE_GOOGLE_CONFIG, calendarIds: ["work@example.com", "team@example.com"] },
    userId: "user-1",
    fetchCalendarData: noopIcal,
    getGoogleAccessToken: async () => "token",
    fetchGoogleEvents: async (input) => {
      capturedCalendarIds.push(input.calendarId);
      return makeGoogleResult([]);
    },
  });

  expect(capturedCalendarIds).toEqual(["work@example.com", "team@example.com"]);
});

test("Google resolver uses legacy calendarId when calendarIds is not present", async () => {
  const capturedCalendarIds: string[] = [];

  await resolveCalendarWidgetData({
    widgetInstanceId: "widget-1",
    widgetConfig: {
      provider: "google",
      integrationConnectionId: "conn-abc123",
      calendarId: "legacy@example.com",
      timeWindow: "next7d",
      maxEvents: 5,
    },
    userId: "user-1",
    fetchCalendarData: noopIcal,
    getGoogleAccessToken: async () => "token",
    fetchGoogleEvents: async (input) => {
      capturedCalendarIds.push(input.calendarId);
      return makeGoogleResult([]);
    },
  });

  expect(capturedCalendarIds).toEqual(["legacy@example.com"]);
});

test("Google resolver defaults to 'primary' when no calendar selection is provided", async () => {
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

test("Google resolver applies includeAllDay filter and maxItems after merge", async () => {
  const result = await resolveCalendarWidgetData({
    widgetInstanceId: "widget-1",
    widgetConfig: {
      ...BASE_GOOGLE_CONFIG,
      calendarIds: ["c1", "c2"],
      includeAllDay: false,
      maxItems: 2,
    },
    userId: "user-1",
    fetchCalendarData: noopIcal,
    getGoogleAccessToken: async () => "token",
    fetchGoogleEvents: async (input) => {
      if (input.calendarId === "c1") {
        return makeGoogleResult([
          makeEvent({ id: "all-day", allDay: true, startIso: "2026-03-26T00:00:00.000Z" }),
          makeEvent({ id: "timed-2", startIso: "2026-03-26T10:00:00.000Z" }),
        ]);
      }
      return makeGoogleResult([
        makeEvent({ id: "timed-1", startIso: "2026-03-26T09:00:00.000Z" }),
          makeEvent({ id: "timed-3", startIso: "2026-03-26T11:00:00.000Z" }),
      ]);
    },
  });

  expect(result.state).toBe("ready");
  expect(result.data?.events.map((event) => event.id)).toEqual(["timed-1", "timed-2"]);
  expect(result.data?.upcomingCount).toBe(2);
});

test("iCal resolver still works after Google multi-calendar support", async () => {
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
