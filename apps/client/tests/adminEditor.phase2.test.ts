/**
 * Phase 2 admin editor tests — canvas, library panel, properties panel.
 */
import React from "react";
import TestRenderer from "react-test-renderer";
import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    View: (props: Record<string, unknown>) => ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
    Pressable: (props: Record<string, unknown>) => ReactRuntime.createElement("pressable", props, props.children),
    ScrollView: (props: Record<string, unknown>) => ReactRuntime.createElement("scroll-view", props, props.children),
    TextInput: (props: Record<string, unknown>) => ReactRuntime.createElement("text-input", props),
    ActivityIndicator: (props: Record<string, unknown>) => ReactRuntime.createElement("activity-indicator", props),
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
  };
});

vi.mock("../src/shared/ui/components/AppIcon", () => {
  const ReactRuntime = require("react");
  return {
    AppIcon: (props: Record<string, unknown>) => ReactRuntime.createElement("mock-icon", props),
  };
});

// WidgetLibraryPanel
let WidgetLibraryPanel: typeof import("../src/features/admin/components/WidgetLibraryPanel").WidgetLibraryPanel;
// WidgetPropertiesPanel
let WidgetPropertiesPanel: typeof import("../src/features/admin/components/WidgetPropertiesPanel").WidgetPropertiesPanel;
// DashboardCanvas
let DashboardCanvas: typeof import("../src/features/admin/components/DashboardCanvas").DashboardCanvas;

// LayoutGrid mock — avoid rendering the real grid in unit tests
vi.mock("../src/features/display/components/LayoutGrid", () => {
  const ReactRuntime = require("react");
  return {
    LayoutGrid: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("mock-layout-grid", { "data-testid": "layout-grid", ...props }),
  };
});

vi.mock("../src/widgets/registerBuiltinPlugins", () => ({
  registerBuiltinWidgetPlugins: () => undefined,
}));

beforeAll(async () => {
  const libraryModule = await import("../src/features/admin/components/WidgetLibraryPanel");
  WidgetLibraryPanel = libraryModule.WidgetLibraryPanel;

  const propertiesModule = await import("../src/features/admin/components/WidgetPropertiesPanel");
  WidgetPropertiesPanel = propertiesModule.WidgetPropertiesPanel;

  const canvasModule = await import("../src/features/admin/components/DashboardCanvas");
  DashboardCanvas = canvasModule.DashboardCanvas;
});

// ---------------------------------------------------------------------------
// WidgetLibraryPanel
// ---------------------------------------------------------------------------
describe("WidgetLibraryPanel", () => {
  const defaultProps = {
    selectedLibraryWidgetType: null,
    hasFeature: (_key: string) => true,
    onSelectLibraryWidget: vi.fn(),
    onUpgradePress: vi.fn(),
  } as const;

  test("renders all built-in widget types", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetLibraryPanel, defaultProps),
    );

    const texts = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Clock"))).toBe(true);
    expect(texts.some((t) => String(t).includes("Weather"))).toBe(true);
    expect(texts.some((t) => String(t).includes("Calendar"))).toBe(true);
  });

  test("calls onSelectLibraryWidget when a widget row is pressed", () => {
    const onSelectLibraryWidget = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(WidgetLibraryPanel, { ...defaultProps, onSelectLibraryWidget }),
    );

    // Find the first pressable (first widget row after the search field area is a pressable)
    const pressables = tree.root.findAllByType("pressable" as any);
    pressables[0]?.props.onPress();
    expect(onSelectLibraryWidget).toHaveBeenCalled();
  });

  test("removes + Add label and duplicate widget key text", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetLibraryPanel, defaultProps),
    );

    const texts = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("+ Add"))).toBe(false);
    expect(texts.some((t) => String(t) === "clockDate")).toBe(false);
  });

  test("search input filters widget list", async () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetLibraryPanel, defaultProps),
    );

    const input = tree.root.findByType("text-input" as any);
    await TestRenderer.act(async () => {
      input.props.onChangeText("weather");
    });

    const texts = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).toLowerCase().includes("weather"))).toBe(true);
    expect(texts.some((t) => String(t).includes("Clock"))).toBe(false);
  });

  test("short press does not start drag mode", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetLibraryPanel, defaultProps),
    );

    // Find a widget row that has onDragStart — draggable attribute starts false until long-press arms
    const draggableRow = tree.root.findAllByType("pressable" as any)
      .find((node: { props: { onDragStart?: (event: unknown) => void } }) => (
        typeof node.props.onDragStart === "function"
      ));

    expect(draggableRow).toBeDefined();

    const setData = vi.fn();
    const preventDefault = vi.fn();
    draggableRow?.props.onMouseDown?.();
    draggableRow?.props.onDragStart?.({
      preventDefault,
      dataTransfer: {
        setData,
      },
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(setData).not.toHaveBeenCalled();
  });

  test("long press publishes widget drag metadata on drag start", async () => {
    vi.useFakeTimers();
    const tree = TestRenderer.create(
      React.createElement(WidgetLibraryPanel, defaultProps),
    );

    // Find a widget row with onDragStart — draggable attribute starts false until long-press arms
    const draggableRow = tree.root.findAllByType("pressable" as any)
      .find((node: { props: { onDragStart?: (event: unknown) => void } }) => (
        typeof node.props.onDragStart === "function"
      ));

    expect(draggableRow).toBeDefined();

    const setData = vi.fn();
    const setDragImage = vi.fn();
    draggableRow?.props.onMouseDown?.();
    await TestRenderer.act(async () => {
      vi.advanceTimersByTime(330);
    });
    draggableRow?.props.onDragStart?.({
      dataTransfer: {
        setData,
        setDragImage,
        effectAllowed: "copy",
      },
    });

    expect(setData).toHaveBeenCalledWith("application/x-ambient-widget", expect.any(String));
    expect(setData).toHaveBeenCalledWith("application/x-ambient-widget-payload", expect.any(String));
    expect(setData).toHaveBeenCalledWith("text/plain", expect.any(String));
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// WidgetPropertiesPanel
// ---------------------------------------------------------------------------
describe("WidgetPropertiesPanel", () => {
  const emptyProps = {
    selectedWidget: null,
  } as const;

  const clockWidget = {
    widgetInstanceId: "abc-123",
    widgetKey: "clockDate" as const,
    layout: { x: 0, y: 0, w: 4, h: 2 },
    state: "ready" as const,
    config: { format: "24h" },
    configSchema: { format: ["12h", "24h"] as unknown as import("@ambient/shared-contracts").WidgetConfigFieldSchema },
    data: null,
    meta: { resolvedAt: "2026-01-01T00:00:00Z" },
  };

  test("shows empty state when no widget is selected", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, emptyProps),
    );

    const texts = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).toLowerCase().includes("no widget selected"))).toBe(true);
  });

  test("shows widget type metadata in library inspector mode", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: null,
        inspectorMode: "library",
        selectedLibraryWidgetType: "weather",
      }),
    );

    const texts = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Weather"))).toBe(true);
    expect(texts.some((t) => String(t).includes("Default Size"))).toBe(true);
    expect(texts.some((t) => String(t).includes("Long press and drag"))).toBe(true);
  });

  test("shows widget details when a widget is selected", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: clockWidget,
      }),
    );

    const texts = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => n.props.children);
    // Should show the widget name and config key
    expect(texts.some((t) => String(t).includes("Clock"))).toBe(true);
    expect(texts.some((t) => String(t).includes("format"))).toBe(true);
    expect(texts.some((t) => String(t).includes("24h"))).toBe(true);
  });

  test("shows pencil icon when onSaveConfig is provided", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: clockWidget,
        onSaveConfig: vi.fn(),
      }),
    );

    const pressables = tree.root.findAllByType("pressable" as any);
    const editButton = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Edit config",
    );
    expect(editButton).toBeDefined();
  });

  test("switches to edit mode when pencil is pressed", async () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: clockWidget,
        onSaveConfig: vi.fn(),
      }),
    );

    const pressables = tree.root.findAllByType("pressable" as any);
    const editButton = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Edit config",
    );
    await TestRenderer.act(async () => {
      editButton?.props.onPress();
    });

    // Should now show save and cancel buttons
    const updatedPressables = tree.root.findAllByType("pressable" as any);
    const saveButton = updatedPressables.find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Save config",
    );
    expect(saveButton).toBeDefined();
    const cancelButton = updatedPressables.find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Cancel edit",
    );
    expect(cancelButton).toBeDefined();
  });

  test("calls onSaveConfig with updated draft when save is pressed", async () => {
    const onSaveConfig = vi.fn().mockResolvedValue(undefined);
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: clockWidget,
        onSaveConfig,
      }),
    );

    // Enter edit mode
    const pressables = tree.root.findAllByType("pressable" as any);
    const editButton = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Edit config",
    );
    await TestRenderer.act(async () => {
      editButton?.props.onPress();
    });

    // Press save
    const updatedPressables = tree.root.findAllByType("pressable" as any);
    const saveButton = updatedPressables.find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Save config",
    );
    await TestRenderer.act(async () => {
      await saveButton?.props.onPress();
    });

    expect(onSaveConfig).toHaveBeenCalledWith("abc-123", expect.objectContaining({ format: "24h" }));
  });

  test("returns to read mode when cancel is pressed", async () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetPropertiesPanel, {
        selectedWidget: clockWidget,
        onSaveConfig: vi.fn(),
      }),
    );

    // Enter edit mode
    const pressables = tree.root.findAllByType("pressable" as any);
    const editButton = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Edit config",
    );
    await TestRenderer.act(async () => {
      editButton?.props.onPress();
    });

    // Press cancel
    const updatedPressables = tree.root.findAllByType("pressable" as any);
    const cancelButton = updatedPressables.find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Cancel edit",
    );
    await TestRenderer.act(async () => {
      cancelButton?.props.onPress();
    });

    // Should be back in read mode — pencil button visible again
    const finalPressables = tree.root.findAllByType("pressable" as any);
    const pencilButton = finalPressables.find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Edit config",
    );
    expect(pencilButton).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// DashboardCanvas
// ---------------------------------------------------------------------------
describe("DashboardCanvas", () => {
  const baseProps = {
    widgets: [] as import("../src/services/api/displayLayoutApi").DisplayLayoutWidgetEnvelope[],
    selectedWidgetId: null,
    onSelectWidget: vi.fn(),
    onClearSelection: vi.fn(),
    onWidgetLayoutChange: vi.fn(),
    loadingLayout: false,
    error: null,
    onRetry: vi.fn(),
    hasLayoutChanges: false,
    savingLayout: false,
    layoutError: null,
    onSaveLayout: vi.fn(),
    onCancelLayout: vi.fn(),
  } as const;

  test("renders empty canvas state when no widgets", () => {
    const tree = TestRenderer.create(
      React.createElement(DashboardCanvas, baseProps),
    );

    const texts = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).toLowerCase().includes("canvas is empty"))).toBe(true);
    expect(texts.some((t) => String(t).includes("+ Add"))).toBe(false);
  });

  test("renders LayoutGrid when widgets are present", () => {
    const widget = {
      widgetInstanceId: "w1",
      widgetKey: "clockDate" as const,
      layout: { x: 0, y: 0, w: 4, h: 2 },
      state: "ready" as const,
      config: {},
      configSchema: {},
      data: null,
      meta: { resolvedAt: "2026-01-01T00:00:00Z" },
    };

    const tree = TestRenderer.create(
      React.createElement(DashboardCanvas, { ...baseProps, widgets: [widget] }),
    );

    const grid = tree.root.findByType("mock-layout-grid" as any);
    expect(grid).toBeDefined();
    expect(grid.props.editMode).toBe(true);
  });

  test("shows Save Layout button when there are layout changes", () => {
    const tree = TestRenderer.create(
      React.createElement(DashboardCanvas, { ...baseProps, hasLayoutChanges: true }),
    );

    const texts = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Save Layout"))).toBe(true);
  });

  test("shows loading state when fetching layout", () => {
    const tree = TestRenderer.create(
      React.createElement(DashboardCanvas, { ...baseProps, loadingLayout: true }),
    );

    const texts = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).toLowerCase().includes("loading"))).toBe(true);
  });

  test("drop forwards widget type and default-sized layout to onWidgetDropped", () => {
    const onWidgetDropped = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(DashboardCanvas, {
        ...baseProps,
        onWidgetDropped,
      }),
    );

    const dropZone = tree.root.findAllByType("view" as any)
      .find((node: { props: { onDrop?: (event: unknown) => void } }) => typeof node.props.onDrop === "function");
    expect(dropZone).toBeDefined();

    dropZone?.props.onDrop?.({
      preventDefault: vi.fn(),
      clientX: 300,
      clientY: 100,
      currentTarget: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 600 }),
      },
      dataTransfer: {
        getData: (mime: string) => (mime === "application/x-ambient-widget" ? "calendar" : ""),
      },
    });

    expect(onWidgetDropped).toHaveBeenCalledTimes(1);
    expect(onWidgetDropped).toHaveBeenCalledWith(
      "calendar",
      expect.objectContaining({ w: 6, h: 3 }),
    );
  });

  test("drop ignores unsupported widget type safely", () => {
    const onWidgetDropped = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(DashboardCanvas, {
        ...baseProps,
        onWidgetDropped,
      }),
    );

    const dropZone = tree.root.findAllByType("view" as any)
      .find((node: { props: { onDrop?: (event: unknown) => void } }) => typeof node.props.onDrop === "function");
    dropZone?.props.onDrop?.({
      preventDefault: vi.fn(),
      clientX: 300,
      clientY: 100,
      currentTarget: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 600 }),
      },
      dataTransfer: {
        getData: () => "unsupportedWidget",
      },
    });

    expect(onWidgetDropped).not.toHaveBeenCalled();
  });
});
