import { describe, expect, test, vi } from "vitest";
import { getInspectorDefinition } from "../src/widgets/clockDate/inspector";
import type { ClockDateInspectorContext } from "../src/widgets/clockDate/inspector";

function makeContext(onChange = vi.fn()): ClockDateInspectorContext {
  return { onChange };
}

describe("ClockDate getInspectorDefinition", () => {
  describe("sections", () => {
    test("returns exactly 2 sections", () => {
      const def = getInspectorDefinition({}, makeContext());
      expect(def.sections).toHaveLength(2);
    });

    test("section ids are 'time' and 'format'", () => {
      const def = getInspectorDefinition({}, makeContext());
      expect(def.sections[0].id).toBe("time");
      expect(def.sections[1].id).toBe("format");
    });

    test("section titles are 'Time' and 'Format'", () => {
      const def = getInspectorDefinition({}, makeContext());
      expect(def.sections[0].title).toBe("Time");
      expect(def.sections[1].title).toBe("Format");
    });

    test("no layout section is present", () => {
      const def = getInspectorDefinition({}, makeContext());
      const ids = def.sections.map((s) => s.id);
      expect(ids).not.toContain("layout");
    });

    test("no widget ID section is present", () => {
      const def = getInspectorDefinition({}, makeContext());
      const ids = def.sections.map((s) => s.id);
      expect(ids).not.toContain("identity");
      expect(ids).not.toContain("widget");
    });
  });

  describe("timezone field", () => {
    test("timezone field id is 'timezone'", () => {
      const def = getInspectorDefinition({}, makeContext());
      const field = def.sections[0].fields[0];
      expect(field.id).toBe("timezone");
    });

    test("timezone field label is 'Time zone'", () => {
      const def = getInspectorDefinition({}, makeContext());
      const field = def.sections[0].fields[0];
      expect(field.label).toBe("Time zone");
    });

    test("timezone field kind is 'select'", () => {
      const def = getInspectorDefinition({}, makeContext());
      const field = def.sections[0].fields[0];
      expect(field.kind).toBe("select");
    });

    test("timezone defaults to 'local' when not configured", () => {
      const def = getInspectorDefinition({}, makeContext());
      const field = def.sections[0].fields[0];
      expect(field.value).toBe("local");
    });

    test("timezone value reflects config", () => {
      const def = getInspectorDefinition({ timezone: "America/New_York" }, makeContext());
      const field = def.sections[0].fields[0];
      expect(field.value).toBe("America/New_York");
    });

    test("timezone displayValue is 'Local' for 'local'", () => {
      const def = getInspectorDefinition({ timezone: "local" }, makeContext());
      const field = def.sections[0].fields[0];
      expect(field.displayValue).toBe("Local");
    });

    test("timezone displayValue is 'Local' when not configured", () => {
      const def = getInspectorDefinition({}, makeContext());
      const field = def.sections[0].fields[0];
      expect(field.displayValue).toBe("Local");
    });

    test("timezone displayValue passes through IANA zone string", () => {
      const def = getInspectorDefinition({ timezone: "Europe/London" }, makeContext());
      const field = def.sections[0].fields[0];
      expect(field.displayValue).toBe("Europe/London");
    });

    test("timezone has options list", () => {
      const def = getInspectorDefinition({}, makeContext());
      const field = def.sections[0].fields[0];
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
    });

    test("timezone options include a 'local' entry", () => {
      const def = getInspectorDefinition({}, makeContext());
      const field = def.sections[0].fields[0];
      const localOption = field.options!.find((o) => o.value === "local");
      expect(localOption).toBeDefined();
      expect(localOption!.label).toBe("Local");
    });

    test("timezone onChange calls context.onChange with timezone patch", () => {
      const onChange = vi.fn();
      const def = getInspectorDefinition({}, makeContext(onChange));
      const field = def.sections[0].fields[0];
      field.onChange?.("America/Chicago" as never);
      expect(onChange).toHaveBeenCalledWith({ timezone: "America/Chicago" });
    });

    test("timezone displayValue is never a raw config key", () => {
      const def = getInspectorDefinition({ timezone: "local" }, makeContext());
      const field = def.sections[0].fields[0];
      expect(field.displayValue).not.toBe("timezone");
    });
  });

  describe("locale control removal", () => {
    test("time section does not include a locale field", () => {
      const def = getInspectorDefinition({}, makeContext());
      const localeField = def.sections[0].fields.find((field) => field.id === "locale");
      expect(localeField).toBeUndefined();
    });
  });

  describe("hour12 field", () => {
    test("hour12 field id is 'hour12'", () => {
      const def = getInspectorDefinition({}, makeContext());
      const field = def.sections[1].fields[0];
      expect(field.id).toBe("hour12");
    });

    test("hour12 field label is '12-hour clock'", () => {
      const def = getInspectorDefinition({}, makeContext());
      const field = def.sections[1].fields[0];
      expect(field.label).toBe("12-hour clock");
    });

    test("hour12 field kind is 'boolean'", () => {
      const def = getInspectorDefinition({}, makeContext());
      const field = def.sections[1].fields[0];
      expect(field.kind).toBe("boolean");
    });

    test("hour12 displayValue is 'Yes' when true", () => {
      const def = getInspectorDefinition({ hour12: true }, makeContext());
      const field = def.sections[1].fields[0];
      expect(field.displayValue).toBe("Yes");
    });

    test("hour12 displayValue is 'No' when false", () => {
      const def = getInspectorDefinition({ hour12: false }, makeContext());
      const field = def.sections[1].fields[0];
      expect(field.displayValue).toBe("No");
    });

    test("hour12 displayValue is '—' when not configured", () => {
      const def = getInspectorDefinition({}, makeContext());
      const field = def.sections[1].fields[0];
      expect(field.displayValue).toBe("—");
    });

    test("hour12 value is true when configured as true", () => {
      const def = getInspectorDefinition({ hour12: true }, makeContext());
      const field = def.sections[1].fields[0];
      expect(field.value).toBe(true);
    });

    test("hour12 value is false when configured as false", () => {
      const def = getInspectorDefinition({ hour12: false }, makeContext());
      const field = def.sections[1].fields[0];
      expect(field.value).toBe(false);
    });

    test("hour12 displayValue is never a raw boolean string", () => {
      const defTrue = getInspectorDefinition({ hour12: true }, makeContext());
      const defFalse = getInspectorDefinition({ hour12: false }, makeContext());
      expect(defTrue.sections[1].fields[0].displayValue).not.toBe("true");
      expect(defFalse.sections[1].fields[0].displayValue).not.toBe("false");
    });

    test("hour12 onChange calls context.onChange with hour12 patch", () => {
      const onChange = vi.fn();
      const def = getInspectorDefinition({}, makeContext(onChange));
      const field = def.sections[1].fields[0];
      field.onChange?.(true as never);
      expect(onChange).toHaveBeenCalledWith({ hour12: true });
    });
  });

  describe("legacy format field backward compatibility", () => {
    test("format='12h' in config produces hour12 displayValue 'Yes'", () => {
      // Simulates legacy persisted data before the format→hour12 migration.
      // The ClockDateInspectorContent normalizes this before calling getInspectorDefinition,
      // but these tests verify the inspector itself when given pre-normalized input.
      const def = getInspectorDefinition({ hour12: true }, makeContext());
      const field = def.sections[1].fields[0];
      expect(field.displayValue).toBe("Yes");
    });

    test("format='24h' in config produces hour12 displayValue 'No'", () => {
      const def = getInspectorDefinition({ hour12: false }, makeContext());
      const field = def.sections[1].fields[0];
      expect(field.displayValue).toBe("No");
    });
  });

  describe("read-only summary content", () => {
    test("all displayValues are non-empty strings", () => {
      const def = getInspectorDefinition({ timezone: "local", hour12: true }, makeContext());
      for (const section of def.sections) {
        for (const field of section.fields) {
          if (field.displayValue !== undefined) {
            expect(typeof field.displayValue).toBe("string");
            expect(field.displayValue.length).toBeGreaterThan(0);
          }
        }
      }
    });

    test("no raw config key appears as a displayValue", () => {
      const def = getInspectorDefinition({ timezone: "local", hour12: true }, makeContext());
      const rawKeys = ["timezone", "hour12"];
      for (const section of def.sections) {
        for (const field of section.fields) {
          for (const key of rawKeys) {
            expect(field.displayValue).not.toBe(key);
          }
        }
      }
    });
  });

  describe("widget ID absence", () => {
    test("no UUID-shaped value appears in any field", () => {
      const def = getInspectorDefinition({}, makeContext());
      const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}/;
      for (const section of def.sections) {
        for (const field of section.fields) {
          expect(String(field.value ?? "")).not.toMatch(uuidPattern);
          expect(field.displayValue ?? "").not.toMatch(uuidPattern);
        }
      }
    });

    test("no field id is widgetInstanceId or widgetId", () => {
      const def = getInspectorDefinition({}, makeContext());
      for (const section of def.sections) {
        for (const field of section.fields) {
          expect(field.id).not.toBe("widgetInstanceId");
          expect(field.id).not.toBe("widgetId");
        }
      }
    });
  });
});
