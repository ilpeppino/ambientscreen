import { test, expect } from "vitest";
import {
  createWidgetSchema,
  normalizeWidgetConfig,
  widgetManifests,
} from "../src/modules/widgets/widget-contracts";

test("M2-1: createWidgetSchema accepts valid per-widget config shapes", () => {
  const clock = createWidgetSchema.safeParse({
    type: "clockDate",
    config: { timezone: "UTC", format: "12h", showSeconds: true },
    layout: { x: 0, y: 0, w: 1, h: 1 },
  });
  expect(clock.success).toBe(true);

  const weather = createWidgetSchema.safeParse({
    type: "weather",
    config: { location: "Amsterdam", units: "metric" },
  });
  expect(weather.success).toBe(true);

  const calendar = createWidgetSchema.safeParse({
    type: "calendar",
    config: { provider: "ical", timeWindow: "next7d" },
  });
  expect(calendar.success).toBe(true);
});

test("M2-1: createWidgetSchema rejects config shape mismatches", () => {
  const invalidClock = createWidgetSchema.safeParse({
    type: "clockDate",
    config: { hour12: "false" },
  });
  expect(invalidClock.success).toBe(false);

  const invalidWeather = createWidgetSchema.safeParse({
    type: "weather",
    config: { units: "kelvin" },
  });
  expect(invalidWeather.success).toBe(false);

  const invalidCalendar = createWidgetSchema.safeParse({
    type: "calendar",
    config: { provider: "googleCalendar" },
  });
  expect(invalidCalendar.success).toBe(false);

  const invalidLayout = createWidgetSchema.safeParse({
    type: "clockDate",
    layout: { x: -1, y: 0, w: 1, h: 1 },
  });
  expect(invalidLayout.success).toBe(false);
});

test("M2-1: createWidgetSchema allows missing layout for backward compatibility", () => {
  const clock = createWidgetSchema.safeParse({
    type: "clockDate",
    config: { timezone: "UTC" },
  });
  expect(clock.success).toBe(true);
});

test("M2-1: normalizeWidgetConfig falls back to defaults for invalid input", () => {
  const normalizedClock = normalizeWidgetConfig("clockDate", { hour12: "nope" });
  expect(normalizedClock).toEqual({
    format: "24h",
    showSeconds: false,
    timezone: "local",
  });

  const normalizedWeather = normalizeWidgetConfig("weather", null);
  expect(normalizedWeather).toEqual({
    location: "Amsterdam",
    units: "metric",
  });

  const normalizedCalendar = normalizeWidgetConfig("calendar", {});
  expect(normalizedCalendar).toEqual({
    provider: "ical",
    account: "",
    timeWindow: "next7d",
    maxEvents: 10,
    includeAllDay: true,
  });
});

test("M4-3: normalizeWidgetConfig maps legacy calendar config to V1 admin shape", () => {
  const normalizedCalendar = normalizeWidgetConfig("calendar", {
    sourceType: "ical",
    feedUrl: "https://calendar.example.com/feed.ics",
    lookAheadDays: 7,
    maxEvents: 5,
  });

  expect(normalizedCalendar).toEqual({
    provider: "ical",
    account: "https://calendar.example.com/feed.ics",
    timeWindow: "next7d",
    maxEvents: 5,
    includeAllDay: true,
  });
});

test("M2-1: widget manifests expose refresh policy rules", () => {
  expect(widgetManifests.clockDate.refreshPolicy.intervalMs).toBe(1000);
  expect(widgetManifests.weather.refreshPolicy.intervalMs).toBe(300000);
  expect(widgetManifests.calendar.refreshPolicy.intervalMs).toBe(60000);
});
