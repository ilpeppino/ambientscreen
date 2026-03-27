import { test, expect, describe } from "vitest";
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
    config: { city: "Amsterdam", units: "metric" },
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
  expect(invalidWeather.success).toBe(false); // "kelvin" not in ["metric","imperial","standard"]

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
    hour12: false,
    showSeconds: false,
    timezone: "local",
  });

  const normalizedWeather = normalizeWidgetConfig("weather", null);
  expect(normalizedWeather).toEqual({
    city: "Amsterdam",
    units: "metric",
    forecastSlots: 3,
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

describe("clockDate config normalization (format → hour12)", () => {
  test("hour12 provided directly is preserved", () => {
    const result = normalizeWidgetConfig("clockDate", { hour12: true });
    expect(result).toEqual({ hour12: true, showSeconds: false, timezone: "local" });
  });

  test("legacy format='12h' is converted to hour12=true", () => {
    const result = normalizeWidgetConfig("clockDate", { format: "12h" });
    expect(result).toEqual({ hour12: true, showSeconds: false, timezone: "local" });
  });

  test("legacy format='24h' is converted to hour12=false", () => {
    const result = normalizeWidgetConfig("clockDate", { format: "24h" });
    expect(result).toEqual({ hour12: false, showSeconds: false, timezone: "local" });
  });

  test("format wins on the write path when both hour12 and format are provided", () => {
    // On the write path, format always converts to hour12. This ensures legacy API callers
    // who send format get the intended behavior even if hour12 is also present (e.g., from
    // a previous normalization pass of the existing config during a PATCH).
    const result = normalizeWidgetConfig("clockDate", { hour12: false, format: "12h" });
    expect(result).toEqual({ hour12: true, showSeconds: false, timezone: "local" });
  });

  test("neither field defaults to hour12=false (24h)", () => {
    const result = normalizeWidgetConfig("clockDate", { timezone: "Europe/London" });
    expect(result).toEqual({ hour12: false, showSeconds: false, timezone: "Europe/London" });
  });

  test("format field is never persisted in output", () => {
    const result = normalizeWidgetConfig("clockDate", { format: "12h" }) as Record<string, unknown>;
    expect(result).not.toHaveProperty("format");
  });

  test("createWidgetSchema still accepts format on input for backward compatibility", () => {
    const parsed = createWidgetSchema.safeParse({
      type: "clockDate",
      config: { format: "12h", showSeconds: true, timezone: "UTC" },
      layout: { x: 0, y: 0, w: 1, h: 1 },
    });
    expect(parsed.success).toBe(true);
  });
});

test("M2-1: widget manifests expose refresh policy rules", () => {
  expect(widgetManifests.clockDate.refreshPolicy.intervalMs).toBe(1000);
  expect(widgetManifests.weather.refreshPolicy.intervalMs).toBe(300000);
  expect(widgetManifests.calendar.refreshPolicy.intervalMs).toBe(60000);
});
