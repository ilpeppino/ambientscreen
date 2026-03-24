import { test, expect } from "vitest";
import {
  buildCreateWidgetInput,
  CALENDAR_PROVIDERS,
  CALENDAR_TIME_WINDOWS,
  CREATABLE_WIDGET_TYPES,
  WEATHER_UNITS,
} from "../src/features/admin/adminHome.logic";

test("CREATABLE_WIDGET_TYPES exposes the initial M1-2 widget set", () => {
  expect(CREATABLE_WIDGET_TYPES).toEqual(["clockDate", "weather", "calendar"]);
});

test("WEATHER_UNITS exposes weather unit options for admin config", () => {
  expect(WEATHER_UNITS).toEqual(["metric", "imperial"]);
});

test("calendar admin config options expose providers and time windows", () => {
  expect(CALENDAR_PROVIDERS).toEqual(["ical"]);
  expect(CALENDAR_TIME_WINDOWS).toEqual(["today", "next24h", "next7d"]);
});

test("buildCreateWidgetInput omits config for non-weather widgets", () => {
  const payload = buildCreateWidgetInput({
    widgetType: "clockDate",
    weatherConfig: {
      location: "Amsterdam",
      units: "metric"
    },
    calendarConfig: {
      provider: "ical",
      account: "https://calendar.example.com/feed.ics",
      timeWindow: "next7d",
    },
  });

  expect(payload).toEqual({ type: "clockDate" });
});

test("buildCreateWidgetInput includes weather config for weather widgets", () => {
  const payload = buildCreateWidgetInput({
    widgetType: "weather",
    weatherConfig: {
      location: "Berlin",
      units: "imperial"
    },
    calendarConfig: {
      provider: "ical",
      account: "https://calendar.example.com/feed.ics",
      timeWindow: "today",
    },
  });

  expect(payload).toEqual({
    type: "weather",
    config: {
      location: "Berlin",
      units: "imperial"
    }
  });
});

test("buildCreateWidgetInput includes calendar config for calendar widgets", () => {
  const payload = buildCreateWidgetInput({
    widgetType: "calendar",
    weatherConfig: {
      location: "Berlin",
      units: "metric",
    },
    calendarConfig: {
      provider: "ical",
      account: "https://calendar.example.com/work.ics",
      timeWindow: "next24h",
      maxEvents: 5,
      includeAllDay: false,
    },
  });

  expect(payload).toEqual({
    type: "calendar",
    config: {
      provider: "ical",
      account: "https://calendar.example.com/work.ics",
      timeWindow: "next24h",
      maxEvents: 5,
      includeAllDay: false,
    },
  });
});
