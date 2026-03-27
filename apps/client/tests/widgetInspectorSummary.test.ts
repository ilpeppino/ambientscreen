import { describe, test, expect } from "vitest";
import {
  formatInspectorValue,
  buildWidgetReadOnlyFields,
  INSPECTOR_LABELS,
} from "../src/features/admin/widgetInspectorSummary";

describe("formatInspectorValue", () => {
  describe("provider", () => {
    test("google → Google Calendar", () => {
      expect(formatInspectorValue("provider", "google")).toBe("Google Calendar");
    });

    test("ical → iCal Feed", () => {
      expect(formatInspectorValue("provider", "ical")).toBe("iCal Feed");
    });
  });

  describe("timeWindow", () => {
    test("today → Today", () => {
      expect(formatInspectorValue("timeWindow", "today")).toBe("Today");
    });

    test("next24h → Next 24 hours", () => {
      expect(formatInspectorValue("timeWindow", "next24h")).toBe("Next 24 hours");
    });

    test("next7d → Next 7 days", () => {
      expect(formatInspectorValue("timeWindow", "next7d")).toBe("Next 7 days");
    });
  });

  describe("units", () => {
    test("metric → °C (Metric)", () => {
      expect(formatInspectorValue("units", "metric")).toBe("°C (Metric)");
    });

    test("imperial → °F (Imperial)", () => {
      expect(formatInspectorValue("units", "imperial")).toBe("°F (Imperial)");
    });

    test("standard → Kelvin (Standard)", () => {
      expect(formatInspectorValue("units", "standard")).toBe("Kelvin (Standard)");
    });
  });

  describe("format", () => {
    test("12h → 12-hour", () => {
      expect(formatInspectorValue("format", "12h")).toBe("12-hour");
    });

    test("24h → 24-hour", () => {
      expect(formatInspectorValue("format", "24h")).toBe("24-hour");
    });
  });

  describe("booleans", () => {
    test("true → Yes", () => {
      expect(formatInspectorValue("showSeconds", true)).toBe("Yes");
    });

    test("false → No", () => {
      expect(formatInspectorValue("showSeconds", false)).toBe("No");
    });
  });

  describe("numbers", () => {
    test("10 → 10", () => {
      expect(formatInspectorValue("maxEvents", 10)).toBe("10");
    });

    test("3 → 3", () => {
      expect(formatInspectorValue("forecastSlots", 3)).toBe("3");
    });
  });

  describe("null/undefined/empty", () => {
    test("null → empty string", () => {
      expect(formatInspectorValue("timezone", null)).toBe("");
    });

    test("undefined → empty string", () => {
      expect(formatInspectorValue("timezone", undefined)).toBe("");
    });
  });

  describe("default case", () => {
    test("unknown key with string → converted to string", () => {
      expect(formatInspectorValue("unknownKey", "Amsterdam")).toBe("Amsterdam");
    });

    test("city → Amsterdam", () => {
      expect(formatInspectorValue("city", "Amsterdam")).toBe("Amsterdam");
    });
  });
});

describe("buildWidgetReadOnlyFields", () => {
  describe("clockDate widget", () => {
    test("shows format, showSeconds, timezone", () => {
      const fields = buildWidgetReadOnlyFields("clockDate", {
        format: "24h",
        showSeconds: false,
        timezone: "UTC",
      });

      expect(fields).toHaveLength(3);
      expect(fields[0]).toEqual({
        key: "format",
        label: "Format",
        value: "24-hour",
      });
      expect(fields[1]).toEqual({
        key: "showSeconds",
        label: "Show seconds",
        value: "No",
      });
      expect(fields[2]).toEqual({
        key: "timezone",
        label: "Timezone",
        value: "UTC",
      });
    });

    test("excludes empty timezone", () => {
      const fields = buildWidgetReadOnlyFields("clockDate", {
        format: "12h",
        showSeconds: true,
        timezone: "",
      });

      expect(fields).toHaveLength(2);
      expect(fields.map((f) => f.key)).not.toContain("timezone");
    });

    test("does not include x/y/w/h layout fields", () => {
      const fields = buildWidgetReadOnlyFields("clockDate", {
        format: "24h",
        x: 0,
        y: 0,
        w: 4,
        h: 2,
      });

      expect(fields.map((f) => f.key)).not.toContain("x");
      expect(fields.map((f) => f.key)).not.toContain("y");
      expect(fields.map((f) => f.key)).not.toContain("w");
      expect(fields.map((f) => f.key)).not.toContain("h");
    });

    test("does not include widgetInstanceId", () => {
      const fields = buildWidgetReadOnlyFields("clockDate", {
        format: "24h",
        widgetInstanceId: "abc-123",
      });

      expect(fields.map((f) => f.key)).not.toContain("widgetInstanceId");
    });
  });

  describe("weather widget", () => {
    test("shows city, units, forecastSlots", () => {
      const fields = buildWidgetReadOnlyFields("weather", {
        city: "Amsterdam",
        units: "metric",
        forecastSlots: 3,
      });

      expect(fields).toHaveLength(3);
      expect(fields[0]).toEqual({
        key: "city",
        label: "City",
        value: "Amsterdam",
      });
      expect(fields[1]).toEqual({
        key: "units",
        label: "Units",
        value: "°C (Metric)",
      });
      expect(fields[2]).toEqual({
        key: "forecastSlots",
        label: "Forecast slots",
        value: "3",
      });
    });

    test("excludes empty countryCode", () => {
      const fields = buildWidgetReadOnlyFields("weather", {
        city: "London",
        countryCode: "",
        units: "imperial",
        forecastSlots: 4,
      });

      expect(fields.map((f) => f.key)).not.toContain("countryCode");
    });

    test("includes countryCode when present", () => {
      const fields = buildWidgetReadOnlyFields("weather", {
        city: "Amsterdam",
        countryCode: "NL",
        units: "metric",
        forecastSlots: 3,
      });

      expect(fields.map((f) => f.key)).toContain("countryCode");
      const ccField = fields.find((f) => f.key === "countryCode");
      expect(ccField?.value).toBe("NL");
    });
  });

  describe("calendar widget — iCal mode", () => {
    test("shows provider, account, timeWindow, maxEvents, includeAllDay", () => {
      const fields = buildWidgetReadOnlyFields("calendar", {
        provider: "ical",
        account: "https://example.com/feed.ics",
        timeWindow: "next7d",
        maxEvents: 10,
        includeAllDay: true,
      });

      expect(fields.length).toBeGreaterThan(0);
      expect(fields.map((f) => f.key)).toContain("provider");
      expect(fields.map((f) => f.key)).toContain("account");
      expect(fields.map((f) => f.key)).toContain("timeWindow");
      expect(fields.map((f) => f.key)).toContain("maxEvents");
      expect(fields.map((f) => f.key)).toContain("includeAllDay");
    });

    test("integrationConnectionId is excluded (async handled by panel)", () => {
      const fields = buildWidgetReadOnlyFields("calendar", {
        provider: "ical",
        account: "https://example.com/feed.ics",
        integrationConnectionId: "conn-123",
      });

      expect(fields.map((f) => f.key)).not.toContain("integrationConnectionId");
    });

    test("calendarId is excluded", () => {
      const fields = buildWidgetReadOnlyFields("calendar", {
        provider: "ical",
        account: "https://example.com/feed.ics",
        calendarId: "primary",
      });

      expect(fields.map((f) => f.key)).not.toContain("calendarId");
    });
  });

  describe("calendar widget — Google mode", () => {
    test("shows provider, timeWindow, maxEvents, includeAllDay", () => {
      const fields = buildWidgetReadOnlyFields("calendar", {
        provider: "google",
        integrationConnectionId: "conn-123",
        calendarId: "primary",
        timeWindow: "today",
        maxEvents: 5,
        includeAllDay: false,
      });

      expect(fields.map((f) => f.key)).toContain("provider");
      expect(fields.map((f) => f.key)).toContain("timeWindow");
      expect(fields.map((f) => f.key)).toContain("maxEvents");
      expect(fields.map((f) => f.key)).toContain("includeAllDay");
    });

    test("account field is excluded when provider is google", () => {
      const fields = buildWidgetReadOnlyFields("calendar", {
        provider: "google",
        account: "should-not-appear@example.com",
        integrationConnectionId: "conn-123",
      });

      expect(fields.map((f) => f.key)).not.toContain("account");
    });

    test("integrationConnectionId is excluded (async handled by panel)", () => {
      const fields = buildWidgetReadOnlyFields("calendar", {
        provider: "google",
        integrationConnectionId: "conn-123",
      });

      expect(fields.map((f) => f.key)).not.toContain("integrationConnectionId");
    });

    test("calendarId is excluded", () => {
      const fields = buildWidgetReadOnlyFields("calendar", {
        provider: "google",
        integrationConnectionId: "conn-123",
        calendarId: "primary",
      });

      expect(fields.map((f) => f.key)).not.toContain("calendarId");
    });
  });

  describe("field values are formatted correctly", () => {
    test("calendar provider values are formatted", () => {
      const fields = buildWidgetReadOnlyFields("calendar", {
        provider: "google",
        timeWindow: "next24h",
        maxEvents: 15,
        includeAllDay: false,
      });

      const providerField = fields.find((f) => f.key === "provider");
      expect(providerField?.value).toBe("Google Calendar");

      const timeWindowField = fields.find((f) => f.key === "timeWindow");
      expect(timeWindowField?.value).toBe("Next 24 hours");

      const includeAllDayField = fields.find((f) => f.key === "includeAllDay");
      expect(includeAllDayField?.value).toBe("No");
    });
  });

  describe("label mapping", () => {
    test("all labels from INSPECTOR_LABELS are used correctly", () => {
      const config = {
        provider: "google",
        timeWindow: "next7d",
        maxEvents: 10,
        includeAllDay: true,
      };

      const fields = buildWidgetReadOnlyFields("calendar", config);

      for (const field of fields) {
        expect(INSPECTOR_LABELS[field.key]).toBe(field.label);
      }
    });
  });
});
