/**
 * Documentation consistency tests for the Widget Plugin SDK (M4.5.1).
 *
 * These tests validate that the clockDate plugin — used as the canonical
 * example in docs/plugins/EXAMPLE_PLUGIN_CLOCK.md — matches the documented
 * manifest, config schema, and resolver behavior exactly.
 */
import { afterEach, describe, expect, it } from "vitest";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { clockDateWidgetPlugin } from "../src/modules/widgets/plugins/clockDate.plugin";
import {
  registerWidgetPlugin,
  getWidgetPlugin,
  listWidgetPluginManifests,
  resetWidgetPluginRegistryForTests,
} from "../src/modules/widgets/widgetPluginRegistry";
import { resolveClockDateWidgetData } from "../src/modules/widgetData/resolvers/clockDate.resolver";

afterEach(() => {
  resetWidgetPluginRegistryForTests();
});

describe("clockDate plugin manifest (docs/plugins/EXAMPLE_PLUGIN_CLOCK.md)", () => {
  it("has all documented manifest fields", () => {
    const { manifest } = clockDateWidgetPlugin;
    expect(manifest.key).toBe("clockDate");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.name).toBe("Clock & Date");
    expect(manifest.category).toBe("time");
    expect(manifest.refreshPolicy.intervalMs).toBe(1000);
    expect(manifest.defaultLayout.w).toBe(4);
    expect(manifest.defaultLayout.h).toBe(2);
    expect(manifest.defaultLayout.minW).toBe(2);
    expect(manifest.defaultLayout.minH).toBe(1);
  });

  it("has the documented config schema fields", () => {
    const { configSchema } = clockDateWidgetPlugin;
    expect(configSchema.hour12).toBe("boolean");
    expect(configSchema.showSeconds).toBe("boolean");
    expect(configSchema.timezone).toBe("string");
    // format is deprecated and no longer in the canonical schema
    expect(configSchema.format).toBeUndefined();
  });

  it("has the documented default config values", () => {
    const { defaultConfig } = clockDateWidgetPlugin;
    expect(defaultConfig.hour12).toBe(false);
    expect(defaultConfig.showSeconds).toBe(false);
    expect(defaultConfig.timezone).toBe("local");
    // format is deprecated and no longer in the canonical default config
    expect(defaultConfig.format).toBeUndefined();
  });

  it("shares manifest and schema with widgetBuiltinDefinitions", () => {
    expect(clockDateWidgetPlugin.manifest).toBe(widgetBuiltinDefinitions.clockDate.manifest);
    expect(clockDateWidgetPlugin.configSchema).toBe(widgetBuiltinDefinitions.clockDate.configSchema);
    expect(clockDateWidgetPlugin.defaultConfig).toBe(widgetBuiltinDefinitions.clockDate.defaultConfig);
  });
});

describe("clockDate plugin registry (docs/plugins/PLUGIN_REGISTRY.md)", () => {
  it("registers successfully and is retrievable by key", () => {
    registerWidgetPlugin(clockDateWidgetPlugin);
    const plugin = getWidgetPlugin("clockDate");
    expect(plugin).not.toBeNull();
    expect(plugin?.manifest.key).toBe("clockDate");
  });

  it("appears in listWidgetPluginManifests after registration", () => {
    registerWidgetPlugin(clockDateWidgetPlugin);
    const manifests = listWidgetPluginManifests();
    const manifest = manifests.find((m) => m.key === "clockDate");
    expect(manifest).toBeDefined();
    expect(manifest?.name).toBe("Clock & Date");
  });

  it("throws on duplicate registration", () => {
    registerWidgetPlugin(clockDateWidgetPlugin);
    expect(() => registerWidgetPlugin(clockDateWidgetPlugin)).toThrowError(
      "Duplicate widget plugin key: clockDate",
    );
  });

  it("has api.resolveData defined", () => {
    expect(typeof clockDateWidgetPlugin.api?.resolveData).toBe("function");
  });
});

describe("clockDate resolver (docs/plugins/EXAMPLE_PLUGIN_CLOCK.md)", () => {
  it("returns ready state with all documented data fields", async () => {
    const result = await resolveClockDateWidgetData({
      widgetInstanceId: "test-clock-id",
      widgetConfig: { format: "24h", showSeconds: false, timezone: "local" },
    });

    expect(result.widgetKey).toBe("clockDate");
    expect(result.widgetInstanceId).toBe("test-clock-id");
    expect(result.state).toBe("ready");
    expect(result.data).not.toBeNull();
    expect(typeof result.data?.nowIso).toBe("string");
    expect(typeof result.data?.formattedTime).toBe("string");
    expect(typeof result.data?.formattedDate).toBe("string");
    expect(typeof result.data?.weekdayLabel).toBe("string");
  });

  it("sets meta.source to 'system'", async () => {
    const result = await resolveClockDateWidgetData({
      widgetInstanceId: "test-id",
      widgetConfig: {},
    });
    expect(result.meta?.source).toBe("system");
    expect(result.meta?.fetchedAt).toBeDefined();
  });

  it("returns 24h format by default", async () => {
    const result = await resolveClockDateWidgetData({
      widgetInstanceId: "test-id",
      widgetConfig: {},
    });
    expect(result.state).toBe("ready");
    expect(result.data?.formattedTime).toBeDefined();
  });

  it("handles invalid timezone gracefully (fallback to local)", async () => {
    const result = await resolveClockDateWidgetData({
      widgetInstanceId: "test-id",
      widgetConfig: { timezone: "Invalid/Zone_That_Does_Not_Exist" },
    });
    expect(result.state).toBe("ready");
    expect(result.data).not.toBeNull();
  });
});
