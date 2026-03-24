import React from "react";
import TestRenderer from "react-test-renderer";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { DisplayLayoutWidgetEnvelope } from "../src/services/api/displayLayoutApi";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    View: (props: Record<string, unknown>) => ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
    Pressable: (props: Record<string, unknown>) => ReactRuntime.createElement("pressable", props, props.children),
    ScrollView: (props: Record<string, unknown>) => ReactRuntime.createElement("scroll-view", props, props.children),
    TextInput: (props: Record<string, unknown>) => ReactRuntime.createElement("text-input", props),
    ActivityIndicator: (props: Record<string, unknown>) => ReactRuntime.createElement("activity-indicator", props),
    NativeModules: {
      SourceCode: {
        scriptURL: "http://localhost:8081/index.bundle",
      },
    },
    Platform: {
      OS: "web",
      select: <T,>(spec: { web?: T; default?: T }) => spec.web ?? spec.default,
    },
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

vi.mock("../src/features/entitlements/entitlements.context", () => ({
  useEntitlements: () => ({
    plan: "free",
    hasFeature: () => true,
  }),
}));

vi.mock("../src/features/entitlements/UpgradeModal", () => {
  const ReactRuntime = require("react");
  return {
    UpgradeModal: (props: Record<string, unknown>) => ReactRuntime.createElement("mock-upgrade-modal", props),
  };
});

vi.mock("../src/features/profiles/useCloudProfiles", () => ({
  useCloudProfiles: () => ({
    profiles: [{ id: "profile-1", userId: "user-1", name: "Home", isDefault: true, createdAt: "" }],
    activeProfileId: "profile-1",
    profilesError: null,
    activateProfile: vi.fn(),
    createProfile: vi.fn(),
    renameProfile: vi.fn(),
    deleteProfile: vi.fn(),
  }),
}));

vi.mock("../src/features/display/hooks/useRealtimeDisplaySync", () => ({
  useRealtimeDisplaySync: () => "connected",
}));

let mockLayoutWidgets: DisplayLayoutWidgetEnvelope[] = [];
let mockLoadDisplayLayout = vi.fn();

vi.mock("../src/features/display/hooks/useDisplayData", () => ({
  useDisplayData: () => ({
    widgets: mockLayoutWidgets,
    loadingLayout: false,
    error: null,
    loadDisplayLayout: mockLoadDisplayLayout,
    saveWidgetLayouts: vi.fn(),
  }),
}));

vi.mock("../src/features/display/hooks/useEditMode", () => {
  const ReactRuntime = require("react");
  return {
    useEditModeOps: () => {
      const [selectedWidgetId, setSelectedWidgetId] = ReactRuntime.useState(null as string | null);
      return {
        selectedWidgetId,
        setSelectedWidgetId,
        hasLayoutChanges: false,
        layoutWidgets: mockLayoutWidgets,
        layoutError: null,
        savingLayout: false,
        handleWidgetLayoutChange: vi.fn(),
        handleCancelLayout: vi.fn(),
        handleSaveLayout: vi.fn(),
        handleToggleEditMode: vi.fn(),
      };
    },
  };
});

const mockClearProfileWidgets = vi.fn();

vi.mock("../src/services/api/profilesApi", () => ({
  clearProfileWidgets: (profileId: string) => mockClearProfileWidgets(profileId),
}));

vi.mock("../src/services/api/widgetsApi", () => ({
  createWidget: vi.fn(),
  deleteWidget: vi.fn(),
}));

vi.mock("../src/services/api/displayLayoutApi", () => ({
  updateWidgetConfig: vi.fn(),
}));

vi.mock("../src/services/api/devicesApi", () => ({
  getDevices: vi.fn().mockResolvedValue([]),
  deleteDevice: vi.fn(),
  updateDeviceName: vi.fn(),
}));

vi.mock("../src/widgets/registerBuiltinPlugins", () => ({
  registerBuiltinWidgetPlugins: () => undefined,
}));

vi.mock("../src/features/admin/components/WidgetSidebar", () => {
  const ReactRuntime = require("react");
  return {
    WidgetSidebar: (props: Record<string, unknown>) => ReactRuntime.createElement(
      "view",
      { "data-testid": "widget-sidebar" },
      ReactRuntime.createElement(
        "text",
        { "data-testid": "sidebar-state" },
        `selected:${(props.selectedWidget as { widgetInstanceId?: string } | null)?.widgetInstanceId ?? "none"}|mode:${String(props.inspectorMode)}|library:${String(props.selectedLibraryWidgetType)}`,
      ),
      ReactRuntime.createElement(
        "pressable",
        {
          accessibilityLabel: "Select library weather",
          onPress: () => (props.onSelectLibraryWidget as ((type: string) => void) | undefined)?.("weather"),
        },
      ),
    ),
  };
});

vi.mock("../src/features/admin/components/DashboardCanvas", () => {
  const ReactRuntime = require("react");
  return {
    DashboardCanvas: (props: Record<string, unknown>) => {
      const widgets = (props.widgets as Array<{ widgetInstanceId: string }>) ?? [];
      return ReactRuntime.createElement(
        "view",
        { "data-testid": "dashboard-canvas" },
        ReactRuntime.createElement("text", { "data-testid": "canvas-count" }, `widgets:${widgets.length}`),
        widgets.length > 0
          ? ReactRuntime.createElement("pressable", {
              accessibilityLabel: "Select first canvas widget",
              onPress: () => (props.onSelectWidget as ((widgetId: string) => void) | undefined)?.(widgets[0].widgetInstanceId),
            })
          : null,
      );
    },
  };
});

vi.mock("../src/features/admin/screens/SettingsScreen", () => {
  const ReactRuntime = require("react");
  return {
    SettingsScreen: (props: Record<string, unknown>) => ReactRuntime.createElement("mock-settings-screen", props),
  };
});

vi.mock("../src/shared/ui/overlays", () => {
  const ReactRuntime = require("react");
  return {
    ConfirmDialog: (props: Record<string, unknown>) => (
      props.visible
        ? ReactRuntime.createElement(
          "view",
          { "data-testid": "confirm-dialog" },
          ReactRuntime.createElement("text", null, props.title),
          ReactRuntime.createElement("pressable", {
            accessibilityLabel: "Confirm clear canvas",
            onPress: () => (props.onConfirm as (() => void) | undefined)?.(),
          }),
          ReactRuntime.createElement("pressable", {
            accessibilityLabel: "Cancel clear canvas",
            onPress: () => (props.onCancel as (() => void) | undefined)?.(),
          }),
        )
        : null
    ),
  };
});

let AdminEditorScreen: typeof import("../src/features/admin/screens/AdminEditorScreen").AdminEditorScreen;

beforeAll(async () => {
  const mod = await import("../src/features/admin/screens/AdminEditorScreen");
  AdminEditorScreen = mod.AdminEditorScreen;
});

beforeEach(() => {
  mockLayoutWidgets = [
    {
      widgetInstanceId: "w-1",
      widgetKey: "clockDate",
      layout: { x: 0, y: 0, w: 2, h: 2 },
      state: "ready",
      config: {},
      configSchema: {},
      data: null,
      meta: { resolvedAt: "2026-03-23T10:00:00.000Z" },
    },
    {
      widgetInstanceId: "w-2",
      widgetKey: "weather",
      layout: { x: 2, y: 0, w: 2, h: 2 },
      state: "ready",
      config: {},
      configSchema: {},
      data: null,
      meta: { resolvedAt: "2026-03-23T10:00:00.000Z" },
    },
  ];
  mockLoadDisplayLayout = vi.fn().mockResolvedValue(undefined);
  mockClearProfileWidgets.mockReset();
  mockClearProfileWidgets.mockResolvedValue({ deletedCount: 2 });
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderScreen() {
  return TestRenderer.create(
    React.createElement(AdminEditorScreen, {
      currentDeviceId: null,
      onEnterDisplayMode: vi.fn(),
      onEnterRemoteControlMode: vi.fn(),
      onEnterMarketplace: vi.fn(),
      onLogout: vi.fn(),
    }),
  );
}

describe("AdminEditorScreen clear canvas", () => {
  test("shows clear canvas button and cancel keeps canvas unchanged", async () => {
    const tree = renderScreen();

    const clearButton = tree.root.findAllByType("pressable" as any)
      .find((node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Clear Canvas");
    expect(clearButton).toBeDefined();

    await TestRenderer.act(async () => {
      clearButton?.props.onPress?.();
    });

    const cancelButton = tree.root.findAllByType("pressable" as any)
      .find((node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Cancel clear canvas");
    expect(cancelButton).toBeDefined();

    await TestRenderer.act(async () => {
      cancelButton?.props.onPress?.();
    });

    expect(mockClearProfileWidgets).not.toHaveBeenCalled();
    const texts = tree.root.findAllByType("text").map((node: { props: { children?: unknown } }) => String(node.props.children));
    expect(texts).toContain("widgets:2");
  });

  test("confirm clears current profile canvas, resets selection, and keeps library inspector when selected", async () => {
    const tree = renderScreen();

    const selectLibrary = tree.root.findAllByType("pressable" as any)
      .find((node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Select library weather");
    await TestRenderer.act(async () => {
      selectLibrary?.props.onPress?.();
    });

    const selectWidget = tree.root.findAllByType("pressable" as any)
      .find((node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Select first canvas widget");
    await TestRenderer.act(async () => {
      selectWidget?.props.onPress?.();
    });

    mockClearProfileWidgets.mockImplementation(async () => {
      mockLayoutWidgets = [];
      return { deletedCount: 2 };
    });

    const clearButton = tree.root.findAllByType("pressable" as any)
      .find((node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Clear Canvas");
    await TestRenderer.act(async () => {
      clearButton?.props.onPress?.();
    });

    const confirmButton = tree.root.findAllByType("pressable" as any)
      .find((node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Confirm clear canvas");

    await TestRenderer.act(async () => {
      await confirmButton?.props.onPress?.();
    });

    expect(mockClearProfileWidgets).toHaveBeenCalledWith("profile-1");
    expect(mockLoadDisplayLayout).toHaveBeenCalledWith(false);

    const texts = tree.root.findAllByType("text").map((node: { props: { children?: unknown } }) => String(node.props.children));
    expect(texts).toContain("widgets:0");
    expect(texts).toContain("selected:none|mode:library|library:weather");
  });
});
