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
  });
  assert.equal(clock.success, true);

  const weather = createWidgetSchema.safeParse({
    type: "weather",
    config: { location: "Amsterdam", units: "metric" },
  });
  assert.equal(weather.success, true);

  const calendar = createWidgetSchema.safeParse({
    type: "calendar",
    config: { lookAheadDays: 7 },
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
    config: { lookAheadDays: 45 },
  });
  assert.equal(invalidCalendar.success, false);
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
    sourceType: "ical",
    lookAheadDays: 7,
    maxEvents: 10,
    includeAllDay: true,
  });
});

test("M2-1: widget manifests expose refresh policy rules", () => {
  assert.equal(widgetManifests.clockDate.refreshPolicy.intervalMs, 1000);
  assert.equal(widgetManifests.weather.refreshPolicy.intervalMs, 300000);
  assert.equal(widgetManifests.calendar.refreshPolicy.intervalMs, 60000);
});
