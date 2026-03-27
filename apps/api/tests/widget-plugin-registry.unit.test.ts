import { afterEach, expect, test } from "vitest";
import type { WidgetApiPluginModule } from "@ambient/shared-contracts";
import {
  registerWidgetPlugin,
  getWidgetPlugin,
  resetWidgetPluginRegistryForTests,
} from "../src/modules/widgets/widgetPluginRegistry";

afterEach(() => {
  resetWidgetPluginRegistryForTests();
});

function createTestPlugin(key: "clockDate" | "weather" | "rssNews"): WidgetApiPluginModule<typeof key> {
  return {
    manifest: {
      key,
      version: "1.0.0",
      name: `Test ${key}`,
      description: "test plugin",
      category: "test",
      defaultLayout: { w: 1, h: 1 },
      refreshPolicy: { intervalMs: 1000 },
    },
    configSchema: {},
    defaultConfig: {},
    api: {
      resolveData: async ({ widgetInstanceId, widgetKey }) => ({
        widgetInstanceId,
        widgetKey,
        state: "ready",
        data: null,
      }) as never,
    },
  };
}

test("widgetPluginRegistry registers and resolves plugins", () => {
  registerWidgetPlugin(createTestPlugin("clockDate"));
  const plugin = getWidgetPlugin("clockDate");

  expect(plugin).toBeTruthy();
  expect(plugin?.manifest.key).toBe("clockDate");
});

test("widgetPluginRegistry rejects duplicate keys", () => {
  registerWidgetPlugin(createTestPlugin("weather"));

  expect(() => registerWidgetPlugin(createTestPlugin("weather"))).toThrowError(
    "Duplicate widget plugin key: weather",
  );
});
