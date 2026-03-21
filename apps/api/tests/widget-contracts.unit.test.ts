import assert from "node:assert/strict";
import test from "node:test";
import {
  createWidgetSchema,
  normalizeWidgetConfig,
  widgetManifests,
} from "../src/modules/widgets/widget-contracts";

test("M2-1: createWidgetSchema accepts valid per-widget config shapes", () => {
  const clock = createWidgetSchema.safeParse({
    type: "clockDate",
    config: { timezone: "UTC", hour12: false },
    layout: { x: 0, y: 0, w: 1, h: 1 },
  });
  assert.equal(clock.success, true);

  const weather = createWidgetSchema.safeParse({
    type: "weather",
    config: { location: "Amsterdam", units: "metric" },
  });
  assert.equal(weather.success, true);

  const calendar = createWidgetSchema.safeParse({
    type: "calendar",
    config: { provider: "ical", timeWindow: "next7d" },
  });
  assert.equal(calendar.success, true);
});

test("M2-1: createWidgetSchema rejects config shape mismatches", () => {
  const invalidClock = createWidgetSchema.safeParse({
    type: "clockDate",
    config: { hour12: "false" },
  });
  assert.equal(invalidClock.success, false);

  const invalidWeather = createWidgetSchema.safeParse({
    type: "weather",
    config: { units: "kelvin" },
  });
  assert.equal(invalidWeather.success, false);

  const invalidCalendar = createWidgetSchema.safeParse({
    type: "calendar",
    config: { provider: "googleCalendar" },
  });
  assert.equal(invalidCalendar.success, false);

  const invalidLayout = createWidgetSchema.safeParse({
    type: "clockDate",
    layout: { x: -1, y: 0, w: 1, h: 1 },
  });
  assert.equal(invalidLayout.success, false);
});

test("M2-1: createWidgetSchema allows missing layout for backward compatibility", () => {
  const clock = createWidgetSchema.safeParse({
    type: "clockDate",
    config: { timezone: "UTC" },
  });
  assert.equal(clock.success, true);
});

test("M2-1: normalizeWidgetConfig falls back to defaults for invalid input", () => {
  const normalizedClock = normalizeWidgetConfig("clockDate", { hour12: "nope" });
  assert.deepEqual(normalizedClock, {});

  const normalizedWeather = normalizeWidgetConfig("weather", null);
  assert.deepEqual(normalizedWeather, {
    location: "Amsterdam",
    units: "metric",
  });

  const normalizedCalendar = normalizeWidgetConfig("calendar", {});
  assert.deepEqual(normalizedCalendar, {
    provider: "ical",
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

  assert.deepEqual(normalizedCalendar, {
    provider: "ical",
    account: "https://calendar.example.com/feed.ics",
    timeWindow: "next7d",
    maxEvents: 5,
    includeAllDay: true,
  });
});

test("M2-1: widget manifests expose refresh policy rules", () => {
  assert.equal(widgetManifests.clockDate.refreshPolicy.intervalMs, 1000);
  assert.equal(widgetManifests.weather.refreshPolicy.intervalMs, 300000);
  assert.equal(widgetManifests.calendar.refreshPolicy.intervalMs, 60000);
});
