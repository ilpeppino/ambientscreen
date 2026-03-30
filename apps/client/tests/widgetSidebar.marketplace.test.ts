import React from "react";
import TestRenderer from "react-test-renderer";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    View: (props: Record<string, unknown>) => ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
    Pressable: (props: Record<string, unknown>) => ReactRuntime.createElement("pressable", props, props.children),
    ScrollView: (props: Record<string, unknown>) => ReactRuntime.createElement("scroll-view", props, props.children),
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

vi.mock("../src/features/admin/components/WidgetLibraryPanel", () => {
  const ReactRuntime = require("react");
  return {
    WidgetLibraryPanel: () => ReactRuntime.createElement("text", null, "LIBRARY_PANEL"),
  };
});

vi.mock("../src/features/admin/components/WidgetPropertiesPanel", () => {
  const ReactRuntime = require("react");
  return {
    WidgetPropertiesPanel: () => ReactRuntime.createElement("text", null, "PROPERTIES_PANEL"),
  };
});

const mockInstall = vi.fn();
const mockUninstall = vi.fn();
const mockToggleEnabled = vi.fn();

vi.mock("../src/features/marketplace/hooks/useMarketplace", () => ({
  useMarketplace: () => ({
    plugins: [
      {
        id: "plugin-weather-pro",
        key: "weather-pro",
        name: "Weather Pro",
        description: "Premium weather data",
        category: "weather",
        isPremium: true,
        activeVersion: { version: "1.0.0" },
        isInstalled: false,
        isEnabled: false,
        installationId: null,
      },
      {
        id: "plugin-calendar",
        key: "calendar-plus",
        name: "Calendar Plus",
        description: "Calendar integration",
        category: "calendar",
        isPremium: false,
        activeVersion: { version: "2.1.0" },
        isInstalled: true,
        isEnabled: true,
        installationId: "inst-1",
      },
    ],
    loading: false,
    error: null,
    actionError: null,
    actionInProgress: null,
    refresh: vi.fn(),
    install: mockInstall,
    uninstall: mockUninstall,
    toggleEnabled: mockToggleEnabled,
    clearActionError: vi.fn(),
  }),
}));

import { WidgetSidebar } from "../src/features/admin/components/WidgetSidebar";

beforeEach(() => {
  mockInstall.mockReset();
  mockUninstall.mockReset();
  mockToggleEnabled.mockReset();
});

describe("WidgetSidebar marketplace", () => {
  const baseProps = {
    plan: "free" as const,
    hasFeature: (key: string) => key !== "premium_widgets",
    onUpgradePress: vi.fn(),
    selectedLibraryWidgetType: null,
    onSelectLibraryWidget: vi.fn(),
    inspectorMode: null,
    selectedWidget: null,
    onSaveConfig: vi.fn().mockResolvedValue(undefined),
    onDraftConfigChange: vi.fn(),
    onClearDraftConfig: vi.fn(),
  };

  test("defaults to Library tab and switches to Marketplace", async () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetSidebar, baseProps),
    );

    const libraryTabBefore = tree.root.findAllByType("pressable" as any).find(
      (node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Sidebar tab library",
    );
    const styleBefore = Array.isArray(libraryTabBefore?.props.style)
      ? libraryTabBefore?.props.style
      : [libraryTabBefore?.props.style];
    const isLibraryActiveBefore = styleBefore.some(
      (s: unknown) => s && typeof s === "object" && (s as Record<string, unknown>).borderColor === "#2d8cff",
    );
    expect(isLibraryActiveBefore).toBe(true);

    const textsBefore = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => String(n.props.children));
    expect(textsBefore).toContain("LIBRARY_PANEL");

    const marketplaceTab = tree.root.findAllByType("pressable" as any).find(
      (node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Sidebar tab marketplace",
    );
    await TestRenderer.act(async () => {
      marketplaceTab?.props.onPress?.();
    });

    const textsAfter = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => String(n.props.children));
    expect(textsAfter).toContain("Weather Pro");
    expect(textsAfter).toContain("Calendar Plus");

    const marketplaceTabAfter = tree.root.findAllByType("pressable" as any).find(
      (node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Sidebar tab marketplace",
    );
    const styleAfter = Array.isArray(marketplaceTabAfter?.props.style)
      ? marketplaceTabAfter?.props.style
      : [marketplaceTabAfter?.props.style];
    const isMarketplaceActiveAfter = styleAfter.some(
      (s: unknown) => s && typeof s === "object" && (s as Record<string, unknown>).borderColor === "#2d8cff",
    );
    expect(isMarketplaceActiveAfter).toBe(true);
  });

  test("marketplace actions are reachable from sidebar", async () => {
    const onUpgradePress = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(WidgetSidebar, { ...baseProps, onUpgradePress }),
    );

    const marketplaceTab = tree.root.findAllByType("pressable" as any).find(
      (node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Sidebar tab marketplace",
    );
    await TestRenderer.act(async () => {
      marketplaceTab?.props.onPress?.();
    });

    const installWeatherPro = tree.root.findAllByType("pressable" as any).find(
      (node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Install Weather Pro",
    );
    await TestRenderer.act(async () => {
      installWeatherPro?.props.onPress?.();
    });

    expect(onUpgradePress).toHaveBeenCalled();

    const uninstallCalendar = tree.root.findAllByType("pressable" as any).find(
      (node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel === "Uninstall Calendar Plus",
    );
    await TestRenderer.act(async () => {
      uninstallCalendar?.props.onPress?.();
    });

    expect(mockUninstall).toHaveBeenCalledWith("plugin-calendar");
  });

  test("uses renamed section headers and inspector subtitle without Type prefix", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetSidebar, {
        ...baseProps,
        inspectorMode: "canvas",
        selectedWidget: {
          widgetInstanceId: "widget-weather-1",
          widgetKey: "weather",
          layout: { x: 0, y: 0, w: 4, h: 3 },
          state: "ready",
          config: {},
          configSchema: {},
          data: null,
          meta: { resolvedAt: "2026-01-01T00:00:00Z" },
        },
      }),
    );

    const texts = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => String(n.props.children));
    expect(texts).toContain("Library");
    expect(texts).toContain("Inspector");
    expect(texts).not.toContain("Widget System");
    expect(texts).not.toContain("Properties");
    expect(texts.some((label) => label.startsWith("Type: "))).toBe(false);
  });
});
