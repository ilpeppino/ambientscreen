import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCreateWidgetInput,
  CALENDAR_PROVIDERS,
  CALENDAR_TIME_WINDOWS,
  CREATABLE_WIDGET_TYPES,
  WEATHER_UNITS,
  selectAdminActiveWidget
} from "../src/features/admin/adminHome.logic";

const widgetA = {
  id: "widget-a",
  userId: "user-1",
  type: "calendar",
  config: {},
  position: 0,
  isActive: false,
  createdAt: "2026-03-20T12:00:00.000Z",
  updatedAt: "2026-03-20T12:00:00.000Z",
};

const widgetB = {
  id: "widget-b",
  userId: "user-1",
  type: "clockDate",
  config: {},
  position: 1,
  isActive: true,
  createdAt: "2026-03-20T12:00:00.000Z",
  updatedAt: "2026-03-20T12:00:00.000Z",
};

test("selectAdminActiveWidget returns first active widget", () => {
  const selected = selectAdminActiveWidget([widgetA, widgetB]);
  assert.equal(selected?.id, "widget-b");
});

test("selectAdminActiveWidget returns null when there is no active widget", () => {
  const selected = selectAdminActiveWidget([widgetA]);
  assert.equal(selected, null);
});

test("CREATABLE_WIDGET_TYPES exposes the initial M1-2 widget set", () => {
  assert.deepEqual(CREATABLE_WIDGET_TYPES, ["clockDate", "weather", "calendar"]);
});

test("WEATHER_UNITS exposes weather unit options for admin config", () => {
  assert.deepEqual(WEATHER_UNITS, ["metric", "imperial"]);
});

test("calendar admin config options expose providers and time windows", () => {
  assert.deepEqual(CALENDAR_PROVIDERS, ["ical"]);
  assert.deepEqual(CALENDAR_TIME_WINDOWS, ["today", "next24h", "next7d"]);
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

  assert.deepEqual(payload, { type: "clockDate" });
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

  assert.deepEqual(payload, {
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

  assert.deepEqual(payload, {
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
