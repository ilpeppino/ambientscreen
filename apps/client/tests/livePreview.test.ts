/**
 * Live preview + unsaved-changes indicator tests.
 *
 * Verifies that:
 * - Inspector onChange calls onDraftConfigChange immediately
 * - isDirty / unsaved indicator appears only after a real change
 * - Save button is disabled when nothing has changed
 * - Cancel clears the draft and restores read mode
 * - Save button becomes enabled after a change and clears draft on success
 */
import React from "react";
import TestRenderer from "react-test-renderer";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    View: (props: Record<string, unknown>) => ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
    Pressable: (props: Record<string, unknown>) => ReactRuntime.createElement("pressable", props, props.children),
    ScrollView: (props: Record<string, unknown>) => ReactRuntime.createElement("scroll-view", props, props.children),
    TextInput: (props: Record<string, unknown>) => ReactRuntime.createElement("text-input", props),
    Switch: (props: Record<string, unknown>) => ReactRuntime.createElement("switch", props),
    ActivityIndicator: (props: Record<string, unknown>) => ReactRuntime.createElement("activity-indicator", props),
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
      flatten: (style: unknown) => style,
      absoluteFillObject: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
    },
    Platform: { OS: "web" },
    NativeModules: { SourceCode: { scriptURL: "http://localhost:3000" } },
    useWindowDimensions: () => ({ width: 1280, height: 720, scale: 1, fontScale: 1 }),
  };
});

vi.mock("../src/shared/ui/components/AppIcon", () => {
  const ReactRuntime = require("react");
  return {
    AppIcon: (props: Record<string, unknown>) => ReactRuntime.createElement("mock-icon", props),
  };
});

vi.mock("../src/widgets/registerBuiltinPlugins", () => ({
  registerBuiltinWidgetPlugins: () => undefined,
}));

import { WidgetPropertiesPanel } from "../src/features/admin/components/WidgetPropertiesPanel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = { props: Record<string, any>; type: string };

function findByLabel(tree: TestRenderer.ReactTestRenderer, label: string): AnyNode | undefined {
  return (tree.root.findAllByType("pressable" as any) as AnyNode[]).find(
    (n) => n.props.accessibilityLabel === label,
  );
}

function allTexts(tree: TestRenderer.ReactTestRenderer): string[] {
  return (tree.root.findAllByType("text" as any) as AnyNode[])
    .map((n) => String(n.props.children ?? ""));
}

// A weather widget — uses InlineFieldEditor (string TextInput) so we can
// directly exercise the generic edit path without custom inspector content.
const weatherWidget = {
  widgetInstanceId: "w-weather-1",
  widgetKey: "weather" as const,
  layout: { x: 0, y: 0, w: 4, h: 2 },
  state: "ready" as const,
  config: { city: "Berlin", units: "metric" },
  configSchema: {
    city: "string" as import("@ambient/shared-contracts").WidgetConfigFieldSchema,
    units: ["metric", "imperial"] as unknown as import("@ambient/shared-contracts").WidgetConfigFieldSchema,
  },
  data: null,
  meta: { resolvedAt: "2026-01-01T00:00:00Z" },
};

// ---------------------------------------------------------------------------
// Draft propagation
// ---------------------------------------------------------------------------
describe("live preview — draft propagation", () => {
  test("onDraftConfigChange is NOT called before editing starts", () => {
    const onDraftConfigChange = vi.fn();
    TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: weatherWidget,
        onSaveConfig: vi.fn(),
        onDraftConfigChange,
        onClearDraftConfig: vi.fn(),
      }),
    );

    // No editing started — should not have been called.
    expect(onDraftConfigChange).not.toHaveBeenCalled();
  });

  test("onDraftConfigChange is called when editing starts (initial draft broadcast)", async () => {
    const onDraftConfigChange = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: weatherWidget,
        onSaveConfig: vi.fn(),
        onDraftConfigChange,
        onClearDraftConfig: vi.fn(),
      }),
    );

    await TestRenderer.act(async () => {
      findByLabel(tree, "Edit config")?.props.onPress?.();
    });

    expect(onDraftConfigChange).toHaveBeenCalledWith(
      "w-weather-1",
      expect.objectContaining({ city: "Berlin" }),
    );
  });

  test("onDraftConfigChange is called again when a field value changes", async () => {
    const onDraftConfigChange = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: weatherWidget,
        onSaveConfig: vi.fn(),
        onDraftConfigChange,
        onClearDraftConfig: vi.fn(),
      }),
    );

    await TestRenderer.act(async () => {
      findByLabel(tree, "Edit config")?.props.onPress?.();
    });

    onDraftConfigChange.mockClear();

    // Change the city text field.
    const inputs = tree.root.findAllByType("text-input" as any) as AnyNode[];
    const cityInput = inputs.find((n) => (n.props.value as string) === "Berlin");
    await TestRenderer.act(async () => {
      cityInput?.props.onChangeText?.("Amsterdam");
    });

    expect(onDraftConfigChange).toHaveBeenCalledWith(
      "w-weather-1",
      expect.objectContaining({ city: "Amsterdam" }),
    );
  });

  test("canvas draft merges onto persisted config (non-schema fields preserved)", async () => {
    const onDraftConfigChange = vi.fn();
    const widgetWithExtra = {
      ...weatherWidget,
      config: { city: "Berlin", units: "metric", extraField: "keep-me" },
    };

    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: widgetWithExtra,
        onSaveConfig: vi.fn(),
        onDraftConfigChange,
        onClearDraftConfig: vi.fn(),
      }),
    );

    await TestRenderer.act(async () => {
      findByLabel(tree, "Edit config")?.props.onPress?.();
    });

    onDraftConfigChange.mockClear();

    const inputs = tree.root.findAllByType("text-input" as any) as AnyNode[];
    const cityInput = inputs.find((n) => (n.props.value as string) === "Berlin");
    await TestRenderer.act(async () => {
      cityInput?.props.onChangeText?.("Paris");
    });

    expect(onDraftConfigChange).toHaveBeenCalledWith(
      "w-weather-1",
      expect.objectContaining({ city: "Paris", extraField: "keep-me" }),
    );
  });
});

// ---------------------------------------------------------------------------
// isDirty / unsaved-changes indicator
// ---------------------------------------------------------------------------
describe("live preview — isDirty indicator", () => {
  test("no unsaved indicator in read-only mode", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: weatherWidget,
        onSaveConfig: vi.fn(),
        onDraftConfigChange: vi.fn(),
        onClearDraftConfig: vi.fn(),
      }),
    );

    expect(allTexts(tree).some((t) => t.toLowerCase().includes("unsaved"))).toBe(false);
  });

  test("no unsaved indicator immediately after edit mode opens (nothing changed)", async () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: weatherWidget,
        onSaveConfig: vi.fn(),
        onDraftConfigChange: vi.fn(),
        onClearDraftConfig: vi.fn(),
      }),
    );

    await TestRenderer.act(async () => {
      findByLabel(tree, "Edit config")?.props.onPress?.();
    });

    expect(allTexts(tree).some((t) => t.toLowerCase().includes("unsaved"))).toBe(false);
  });

  test("unsaved indicator appears after a field change", async () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: weatherWidget,
        onSaveConfig: vi.fn(),
        onDraftConfigChange: vi.fn(),
        onClearDraftConfig: vi.fn(),
      }),
    );

    await TestRenderer.act(async () => {
      findByLabel(tree, "Edit config")?.props.onPress?.();
    });

    const inputs = tree.root.findAllByType("text-input" as any) as AnyNode[];
    const cityInput = inputs.find((n) => (n.props.value as string) === "Berlin");
    await TestRenderer.act(async () => {
      cityInput?.props.onChangeText?.("Tokyo");
    });

    expect(allTexts(tree).some((t) => t.toLowerCase().includes("unsaved"))).toBe(true);
  });

  test("unsaved indicator disappears after reverting to original value", async () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: weatherWidget,
        onSaveConfig: vi.fn(),
        onDraftConfigChange: vi.fn(),
        onClearDraftConfig: vi.fn(),
      }),
    );

    await TestRenderer.act(async () => {
      findByLabel(tree, "Edit config")?.props.onPress?.();
    });

    const inputs = () => tree.root.findAllByType("text-input" as any) as AnyNode[];

    // Change to a different value.
    await TestRenderer.act(async () => {
      inputs().find((n) => (n.props.value as string) === "Berlin")?.props.onChangeText?.("Tokyo");
    });

    expect(allTexts(tree).some((t) => t.toLowerCase().includes("unsaved"))).toBe(true);

    // Revert to original.
    await TestRenderer.act(async () => {
      inputs().find((n) => (n.props.value as string) === "Tokyo")?.props.onChangeText?.("Berlin");
    });

    expect(allTexts(tree).some((t) => t.toLowerCase().includes("unsaved"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Save button state
// ---------------------------------------------------------------------------
describe("live preview — Save button state", () => {
  test("Save button is disabled when editing just opened (no changes)", async () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: weatherWidget,
        onSaveConfig: vi.fn(),
        onDraftConfigChange: vi.fn(),
        onClearDraftConfig: vi.fn(),
      }),
    );

    await TestRenderer.act(async () => {
      findByLabel(tree, "Edit config")?.props.onPress?.();
    });

    const saveBtn = findByLabel(tree, "Save config");
    expect(saveBtn).toBeDefined();
    expect(saveBtn?.props.disabled).toBe(true);
  });

  test("Save button is enabled after a field change", async () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: weatherWidget,
        onSaveConfig: vi.fn(),
        onDraftConfigChange: vi.fn(),
        onClearDraftConfig: vi.fn(),
      }),
    );

    await TestRenderer.act(async () => {
      findByLabel(tree, "Edit config")?.props.onPress?.();
    });

    const inputs = tree.root.findAllByType("text-input" as any) as AnyNode[];
    await TestRenderer.act(async () => {
      inputs.find((n) => (n.props.value as string) === "Berlin")?.props.onChangeText?.("Oslo");
    });

    const saveBtn = findByLabel(tree, "Save config");
    expect(saveBtn?.props.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cancel / Save lifecycle
// ---------------------------------------------------------------------------
describe("live preview — Cancel / Save lifecycle", () => {
  test("Cancel calls onClearDraftConfig and returns to read mode", async () => {
    const onClearDraftConfig = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: weatherWidget,
        onSaveConfig: vi.fn(),
        onDraftConfigChange: vi.fn(),
        onClearDraftConfig,
      }),
    );

    await TestRenderer.act(async () => {
      findByLabel(tree, "Edit config")?.props.onPress?.();
    });

    await TestRenderer.act(async () => {
      findByLabel(tree, "Cancel edit")?.props.onPress?.();
    });

    expect(onClearDraftConfig).toHaveBeenCalledWith("w-weather-1");
    // Should be back to read mode.
    expect(findByLabel(tree, "Edit config")).toBeDefined();
  });

  test("successful Save calls onClearDraftConfig and returns to read mode", async () => {
    const onSaveConfig = vi.fn().mockResolvedValue(undefined);
    const onClearDraftConfig = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: weatherWidget,
        onSaveConfig,
        onDraftConfigChange: vi.fn(),
        onClearDraftConfig,
      }),
    );

    await TestRenderer.act(async () => {
      findByLabel(tree, "Edit config")?.props.onPress?.();
    });

    // Make a change so Save is enabled.
    const inputs = tree.root.findAllByType("text-input" as any) as AnyNode[];
    await TestRenderer.act(async () => {
      inputs.find((n) => (n.props.value as string) === "Berlin")?.props.onChangeText?.("Lisbon");
    });

    await TestRenderer.act(async () => {
      await findByLabel(tree, "Save config")?.props.onPress?.();
    });

    expect(onSaveConfig).toHaveBeenCalledWith(
      "w-weather-1",
      expect.objectContaining({ city: "Lisbon" }),
    );
    expect(onClearDraftConfig).toHaveBeenCalledWith("w-weather-1");
    expect(findByLabel(tree, "Edit config")).toBeDefined();
  });
});
