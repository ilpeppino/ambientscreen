import { test, expect, describe } from "vitest";
import { widgetBuiltinDefinitions, widgetConfigRegistry } from "@ambient/shared-contracts";

describe("calendar shared contracts", () => {
  const def = widgetBuiltinDefinitions.calendar;
  const registry = widgetConfigRegistry.calendar;

  describe("manifest", () => {
    test("key is 'calendar'", () => {
      expect(def.manifest.key).toBe("calendar");
    });

    test("name is present", () => {
      expect(typeof def.manifest.name).toBe("string");
      expect(def.manifest.name.length).toBeGreaterThan(0);
    });

    test("version is present", () => {
      expect(typeof def.manifest.version).toBe("string");
    });

    test("category is present", () => {
      expect(typeof def.manifest.category).toBe("string");
    });

    test("refresh policy is slower than clock (>= 30s)", () => {
      const ms = def.manifest.refreshPolicy.intervalMs;
      expect(ms).not.toBeNull();
      expect(ms!).toBeGreaterThanOrEqual(30_000);
    });

    test("premium is not set to true", () => {
      expect(def.manifest.premium).toBeFalsy();
    });

    test("defaultLayout has positive dimensions", () => {
      expect(def.manifest.defaultLayout.w).toBeGreaterThan(0);
      expect(def.manifest.defaultLayout.h).toBeGreaterThan(0);
    });
  });

  describe("defaultConfig", () => {
    test("registry defaultConfig matches builtin defaultConfig", () => {
      expect(def.defaultConfig).toEqual(registry.defaultConfig);
    });

    test("provider defaults to 'ical'", () => {
      expect(def.defaultConfig.provider).toBe("ical");
    });

    test("maxItems has a sensible default", () => {
      expect(typeof def.defaultConfig.maxItems).toBe("number");
      expect(def.defaultConfig.maxItems!).toBeGreaterThanOrEqual(1);
      expect(def.defaultConfig.maxItems!).toBeLessThanOrEqual(20);
    });

    test("includeAllDay defaults to true", () => {
      expect(def.defaultConfig.includeAllDay).toBe(true);
    });

    test("timeWindow has a valid default", () => {
      expect(["today", "next24h", "next7d"]).toContain(def.defaultConfig.timeWindow);
    });
  });

  describe("configSchema", () => {
    test("provider field is an enum with ical and google", () => {
      const schema = def.configSchema;
      expect(Array.isArray(schema.provider)).toBe(true);
      const values = schema.provider as string[];
      expect(values).toContain("ical");
      expect(values).toContain("google");
    });

    test("integrationConnectionId field is string type", () => {
      expect(def.configSchema.integrationConnectionId).toBe("string");
    });

    test("maxItems field is number type", () => {
      expect(def.configSchema.maxItems).toBe("number");
    });

    test("includeAllDay field is boolean type", () => {
      expect(def.configSchema.includeAllDay).toBe("boolean");
    });

    test("calendarIds field is string[] type", () => {
      expect(def.configSchema.calendarIds).toBe("string[]");
    });

    test("timeWindow enum contains all expected values", () => {
      const values = def.configSchema.timeWindow as string[];
      expect(values).toContain("today");
      expect(values).toContain("next24h");
      expect(values).toContain("next7d");
    });
  });
});
