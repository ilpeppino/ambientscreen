import { test, expect } from "vitest";
import { fetchGoogleCalendarEvents } from "../src/modules/widgetData/providers/googleCalendar.provider";

function makeEventRaw(overrides: {
  id?: string;
  summary?: string;
  startDateTime?: string;
  startDate?: string;
  endDateTime?: string;
  endDate?: string;
  location?: string;
} = {}) {
  return {
    id: overrides.id ?? "event-1",
    summary: overrides.summary ?? "Test Event",
    start: overrides.startDateTime
      ? { dateTime: overrides.startDateTime }
      : { date: overrides.startDate ?? "2026-03-25" },
    end: overrides.endDateTime
      ? { dateTime: overrides.endDateTime }
      : { date: overrides.endDate ?? "2026-03-25" },
    ...(overrides.location ? { location: overrides.location } : {}),
  };
}

function makeFetchImpl(
  items: unknown[],
  status = 200,
): (url: string, init: RequestInit) => Promise<Response> {
  return async () =>
    new Response(JSON.stringify({ items }), { status });
}

test("fetchGoogleCalendarEvents normalizes a timed event", async () => {
  const result = await fetchGoogleCalendarEvents({
    accessToken: "token-123",
    calendarId: "primary",
    timeMin: "2026-03-25T00:00:00.000Z",
    timeMax: "2026-04-01T00:00:00.000Z",
    maxResults: 10,
    fetchImpl: makeFetchImpl([
      makeEventRaw({
        id: "evt-1",
        summary: "Team Standup",
        startDateTime: "2026-03-25T09:00:00+01:00",
        endDateTime: "2026-03-25T09:30:00+01:00",
        location: "Zoom",
      }),
    ]),
  });

  expect(result.events).toHaveLength(1);
  const evt = result.events[0];
  expect(evt.id).toBe("evt-1");
  expect(evt.title).toBe("Team Standup");
  expect(evt.allDay).toBe(false);
  expect(evt.endIso).not.toBeNull();
  expect(evt.location).toBe("Zoom");
  expect(typeof result.fetchedAtIso).toBe("string");
});

test("fetchGoogleCalendarEvents normalizes an all-day event", async () => {
  const result = await fetchGoogleCalendarEvents({
    accessToken: "token-123",
    calendarId: "primary",
    timeMin: "2026-03-25T00:00:00.000Z",
    timeMax: "2026-04-01T00:00:00.000Z",
    maxResults: 10,
    fetchImpl: makeFetchImpl([
      makeEventRaw({
        id: "all-day-1",
        summary: "Company Holiday",
        startDate: "2026-03-27",
        endDate: "2026-03-28",
      }),
    ]),
  });

  expect(result.events).toHaveLength(1);
  const evt = result.events[0];
  expect(evt.id).toBe("all-day-1");
  expect(evt.title).toBe("Company Holiday");
  expect(evt.allDay).toBe(true);
  expect(evt.endIso).toBeNull();
  expect(evt.startIso).toBe("2026-03-27T00:00:00.000Z");
  expect(evt.location).toBeNull();
});

test("fetchGoogleCalendarEvents uses '(No title)' for events without summary", async () => {
  const result = await fetchGoogleCalendarEvents({
    accessToken: "token-123",
    calendarId: "primary",
    timeMin: "2026-03-25T00:00:00.000Z",
    timeMax: "2026-04-01T00:00:00.000Z",
    maxResults: 10,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          items: [{ id: "no-title", start: { dateTime: "2026-03-25T10:00:00Z" }, end: { dateTime: "2026-03-25T11:00:00Z" } }],
        }),
        { status: 200 },
      ),
  });

  expect(result.events[0].title).toBe("(No title)");
});

test("fetchGoogleCalendarEvents returns empty events array when items is absent", async () => {
  const result = await fetchGoogleCalendarEvents({
    accessToken: "token-123",
    calendarId: "primary",
    timeMin: "2026-03-25T00:00:00.000Z",
    timeMax: "2026-04-01T00:00:00.000Z",
    maxResults: 10,
    fetchImpl: async () => new Response(JSON.stringify({}), { status: 200 }),
  });

  expect(result.events).toHaveLength(0);
});

test("fetchGoogleCalendarEvents throws on non-ok response", async () => {
  await expect(
    fetchGoogleCalendarEvents({
      accessToken: "bad-token",
      calendarId: "primary",
      timeMin: "2026-03-25T00:00:00.000Z",
      timeMax: "2026-04-01T00:00:00.000Z",
      maxResults: 10,
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: { message: "Unauthorized" } }), { status: 401 }),
    }),
  ).rejects.toThrow("Google Calendar API error: 401");
});

test("fetchGoogleCalendarEvents sends Authorization header", async () => {
  let capturedHeader = "";

  await fetchGoogleCalendarEvents({
    accessToken: "my-access-token",
    calendarId: "primary",
    timeMin: "2026-03-25T00:00:00.000Z",
    timeMax: "2026-04-01T00:00:00.000Z",
    maxResults: 5,
    fetchImpl: async (_url, init) => {
      capturedHeader = (init.headers as Record<string, string>).Authorization ?? "";
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    },
  });

  expect(capturedHeader).toBe("Bearer my-access-token");
});

test("fetchGoogleCalendarEvents includes calendarId and query params in URL", async () => {
  let capturedUrl = "";

  await fetchGoogleCalendarEvents({
    accessToken: "token",
    calendarId: "work@example.com",
    timeMin: "2026-03-25T00:00:00.000Z",
    timeMax: "2026-04-01T00:00:00.000Z",
    maxResults: 7,
    fetchImpl: async (url) => {
      capturedUrl = url;
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    },
  });

  expect(capturedUrl).toContain(encodeURIComponent("work@example.com"));
  expect(capturedUrl).toContain("maxResults=7");
  expect(capturedUrl).toContain("singleEvents=true");
  expect(capturedUrl).toContain("orderBy=startTime");
});
