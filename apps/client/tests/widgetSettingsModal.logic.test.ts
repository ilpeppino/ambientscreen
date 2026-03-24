import { test, expect } from "vitest";
import {
  applyWidgetConfigUpdate,
  buildConfigDraft,
  buildFieldDescriptors,
  validateConfigDraft,
} from "../src/features/display/components/WidgetSettingsModal.logic";

test("settings form builds descriptors from schema", () => {
  const descriptors = buildFieldDescriptors({
    format: ["12h", "24h"],
    showSeconds: "boolean",
    timezone: "string",
  });

  expect(descriptors).toEqual([
    { key: "format", label: "Format", kind: "enum", options: ["12h", "24h"] },
    { key: "showSeconds", label: "Show Seconds", kind: "boolean" },
    { key: "timezone", label: "Timezone", kind: "string" },
  ]);
});

test("settings form draft uses schema defaults for missing values", () => {
  const draft = buildConfigDraft({
    schema: {
      format: ["12h", "24h"],
      showSeconds: "boolean",
      timezone: "string",
    },
    config: {
      format: "24h",
    },
  });

  expect(draft).toEqual({
    format: "24h",
    showSeconds: false,
    timezone: "",
  });
});

test("settings form validation rejects invalid enum values", () => {
  const validation = validateConfigDraft(
    {
      format: ["12h", "24h"],
      showSeconds: "boolean",
      timezone: "string",
    },
    {
      format: "30h",
      showSeconds: true,
      timezone: "UTC",
    },
  );

  expect(validation.valid).toBe(false);
});

test("saving widget config updates widget list immediately", () => {
  const updatedWidgets = applyWidgetConfigUpdate(
    [
      {
        widgetInstanceId: "widget-1",
        config: { format: "24h", showSeconds: false, timezone: "local" },
      },
      {
        widgetInstanceId: "widget-2",
        config: { location: "Amsterdam", units: "metric" },
      },
    ],
    "widget-1",
    { format: "12h", showSeconds: true, timezone: "UTC" },
  );

  expect(updatedWidgets[0].config).toEqual({
    format: "12h",
    showSeconds: true,
    timezone: "UTC",
  });
  expect(updatedWidgets[1].config).toEqual({
    location: "Amsterdam",
    units: "metric",
  });
});
