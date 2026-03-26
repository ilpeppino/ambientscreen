import { test, expect, describe } from "vitest";
import { resolveCalendarWidgetData } from "../src/modules/widgetData/resolvers/calendar.resolver";
import type { GoogleCalendarResult } from "../src/modules/widgetData/providers/googleCalendar.provider";

const BASE_CONFIG = {
  provider: "google" as const,
  integrationConnectionId: "conn-001",
  calendarId: "primary",
  timeWindow: "next7d" as const,
  maxEvents: 10,
  includeAllDay: true,
};

function makeResult(events: GoogleCalendarResult["events"]): GoogleCalendarResult {
  return { events, fetchedAtIso: "2026-03-25T08:00:00.000Z" };
}

const noopIcal = async () => ({ events: [], fetchedAtIso: new Date().toISOString() });
const alwaysToken = async () => "tok";

describe("calendar event normalization", () => {
  test("all-day event has allDay=true in resolved data", async () => {
    const result = await resolveCalendarWidgetData({
      widgetInstanceId: "w-1",
      widgetConfig: BASE_CONFIG,
      userId: "user-1",
      fetchCalendarData: noopIcal,
      getGoogleAccessToken: alwaysToken,
      fetchGoogleEvents: async () =>
        makeResult([
          {
            id: "all-day-evt",
            title: "Company Holiday",
            startIso: "2026-03-26T00:00:00.000Z",
            endIso: null,
            allDay: true,
            location: null,
          },
        ]),
    });

    expect(result.state).toBe("ready");
    const event = result.data!.events[0];
    expect(event.allDay).toBe(true);
    expect(event.title).toBe("Company Holiday");
    expect(event.endIso).toBeNull();
  });

  test("timed event has allDay=false and endIso set", async () => {
    const result = await resolveCalendarWidgetData({
      widgetInstanceId: "w-1",
      widgetConfig: BASE_CONFIG,
      userId: "user-1",
      fetchCalendarData: noopIcal,
      getGoogleAccessToken: alwaysToken,
      fetchGoogleEvents: async () =>
        makeResult([
          {
            id: "timed-evt",
            title: "Sprint Planning",
            startIso: "2026-03-26T10:00:00.000Z",
            endIso: "2026-03-26T11:00:00.000Z",
            allDay: false,
            location: "Room A",
          },
        ]),
    });

    expect(result.state).toBe("ready");
    const event = result.data!.events[0];
    expect(event.allDay).toBe(false);
    expect(event.endIso).toBe("2026-03-26T11:00:00.000Z");
    expect(event.location).toBe("Room A");
  });

  test("event without location normalizes to null", async () => {
    const result = await resolveCalendarWidgetData({
      widgetInstanceId: "w-1",
      widgetConfig: BASE_CONFIG,
      userId: "user-1",
      fetchCalendarData: noopIcal,
      getGoogleAccessToken: alwaysToken,
      fetchGoogleEvents: async () =>
        makeResult([
          {
            id: "no-loc",
            title: "Standup",
            startIso: "2026-03-26T09:00:00.000Z",
            endIso: "2026-03-26T09:30:00.000Z",
            allDay: false,
            location: null,
          },
        ]),
    });

    expect(result.state).toBe("ready");
    expect(result.data!.events[0].location).toBeNull();
  });

  test("upcomingCount matches the number of events returned", async () => {
    const events = [
      { id: "1", title: "A", startIso: "2026-03-26T09:00:00.000Z", endIso: null, allDay: false, location: null },
      { id: "2", title: "B", startIso: "2026-03-27T10:00:00.000Z", endIso: null, allDay: false, location: null },
      { id: "3", title: "C", startIso: "2026-03-28T11:00:00.000Z", endIso: null, allDay: true, location: null },
    ];

    const result = await resolveCalendarWidgetData({
      widgetInstanceId: "w-1",
      widgetConfig: BASE_CONFIG,
      userId: "user-1",
      fetchCalendarData: noopIcal,
      getGoogleAccessToken: alwaysToken,
      fetchGoogleEvents: async () => makeResult(events),
    });

    expect(result.state).toBe("ready");
    expect(result.data!.upcomingCount).toBe(3);
    expect(result.data!.events).toHaveLength(3);
  });

  test("provider error maps to stale state with safe error code", async () => {
    const result = await resolveCalendarWidgetData({
      widgetInstanceId: "w-1",
      widgetConfig: BASE_CONFIG,
      userId: "user-1",
      fetchCalendarData: noopIcal,
      getGoogleAccessToken: alwaysToken,
      fetchGoogleEvents: async () => {
        throw new Error("Google Calendar API error: 500");
      },
    });

    expect(result.state).toBe("stale");
    expect(result.meta?.errorCode).toBe("CALENDAR_PROVIDER_UNAVAILABLE");
    // Raw provider error must not leak to client
    expect(result.meta?.message).not.toContain("500");
  });
});
