import { test, expect } from "vitest";
import { fetchIcsCalendarEvents } from "../src/modules/widgetData/providers/ical.provider";

const sampleIcs = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "UID:all-day-1",
  "DTSTART;VALUE=DATE:20260321",
  "SUMMARY:All Day Event",
  "LOCATION:HQ",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:timed-1",
  "DTSTART:20260321T140000Z",
  "DTEND:20260321T150000Z",
  "SUMMARY:Timed Event",
  "LOCATION:Room 4A",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:outside-window",
  "DTSTART:20260430T140000Z",
  "SUMMARY:Future Event",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

test("M4-1: ICS provider normalizes and filters all-day + timed events", async () => {
  const result = await fetchIcsCalendarEvents({
    feedUrl: "https://calendar.example.com/feed.ics",
    windowStartIso: "2026-03-20T00:00:00.000Z",
    windowEndIso: "2026-03-28T00:00:00.000Z",
    includeAllDay: true,
    maxEvents: 10,
    fetchImpl: async () => {
      return new Response(sampleIcs, {
        status: 200,
      });
    },
  });

  expect(result.events.length).toBe(2);
  expect(result.events[0]).toEqual({
    id: "all-day-1",
    title: "All Day Event",
    startIso: "2026-03-21T00:00:00.000Z",
    endIso: null,
    allDay: true,
    location: "HQ",
  });
  expect(result.events[1]).toEqual({
    id: "timed-1",
    title: "Timed Event",
    startIso: "2026-03-21T14:00:00.000Z",
    endIso: "2026-03-21T15:00:00.000Z",
    allDay: false,
    location: "Room 4A",
  });
  expect(typeof result.fetchedAtIso).toBe("string");
});

test("M4-1: ICS provider can exclude all-day events and honor maxEvents", async () => {
  const result = await fetchIcsCalendarEvents({
    feedUrl: "https://calendar.example.com/feed.ics",
    windowStartIso: "2026-03-20T00:00:00.000Z",
    windowEndIso: "2026-03-28T00:00:00.000Z",
    includeAllDay: false,
    maxEvents: 1,
    fetchImpl: async () => {
      return new Response(sampleIcs, {
        status: 200,
      });
    },
  });

  expect(result.events.length).toBe(1);
  expect(result.events[0].id).toBe("timed-1");
  expect(result.events[0].allDay).toBe(false);
});

test("M4-1: ICS provider throws on non-200 response", async () => {
  await expect(async () => {
    await fetchIcsCalendarEvents({
      feedUrl: "https://calendar.example.com/feed.ics",
      windowStartIso: "2026-03-20T00:00:00.000Z",
      windowEndIso: "2026-03-28T00:00:00.000Z",
      includeAllDay: true,
      maxEvents: 10,
      fetchImpl: async () => {
        return new Response("bad", { status: 503 });
      },
    });
  }).rejects.toThrow();
});
