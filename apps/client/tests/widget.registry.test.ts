import { test, expect, beforeEach } from "vitest";
import type { ReactNode } from "react";
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import {
  getWidgetPlugin,
  getWidgetSettingsForm,
  registerWidgetPlugin,
  renderWidgetFromKey,
  resetWidgetPluginRegistryForTests,
} from "../src/widgets/pluginRegistry";

beforeEach(() => {
  resetWidgetPluginRegistryForTests();
});

function createTestPlugin(key: "clockDate" | "weather"): WidgetClientPluginModule<typeof key, ReactNode> {
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
    client: {
      Renderer: () => null,
    },
  };
}

test("plugin registry resolves registered plugin", () => {
  registerWidgetPlugin(createTestPlugin("clockDate"));
  const plugin = getWidgetPlugin("clockDate");

  expect(plugin).toBeTruthy();
  expect(plugin?.manifest.name).toBe("Test clockDate");
});

test("plugin registry rejects duplicate keys", () => {
  registerWidgetPlugin(createTestPlugin("weather"));

  expect(() => registerWidgetPlugin(createTestPlugin("weather"))).toThrowError(
    "Duplicate widget plugin key: weather",
  );
});

test("renderWidgetFromKey uses plugin renderer and returns null for missing plugin", () => {
  registerWidgetPlugin(createTestPlugin("clockDate"));

  const rendered = renderWidgetFromKey("clockDate", {
    widgetInstanceId: "widget-clock",
    state: "ready",
    data: {
      nowIso: "2026-03-21T10:00:00.000Z",
      formattedTime: "10:00:00",
      formattedDate: "21 March 2026",
      weekdayLabel: "Saturday",
    },
  });
  expect(rendered).toBeNull();

  const missing = renderWidgetFromKey("weather", {
    widgetInstanceId: "widget-weather",
    state: "ready",
    data: {
      location: "Amsterdam",
      temperatureC: 10,
      conditionLabel: "Rain",
    },
  });
  expect(missing).toBeNull();
});

test("settings form lookup is available and safely falls back when missing", () => {
  registerWidgetPlugin(createTestPlugin("clockDate"));
  const clockSettingsForm = getWidgetSettingsForm("clockDate");
  expect(clockSettingsForm).toBeUndefined();
});
