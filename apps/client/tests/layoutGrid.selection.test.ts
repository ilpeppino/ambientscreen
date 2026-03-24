import React from "react";
import TestRenderer from "react-test-renderer";
import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    View: (props: Record<string, unknown>) => ReactRuntime.createElement("view", props, props.children),
    Pressable: (props: Record<string, unknown>) => ReactRuntime.createElement("pressable", props, props.children),
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
      absoluteFillObject: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
    useWindowDimensions: () => ({ width: 1200, height: 600 }),
  };
});

vi.mock("../src/features/display/components/WidgetContainer", () => {
  const ReactRuntime = require("react");
  return {
    WidgetContainer: (props: Record<string, unknown>) => ReactRuntime.createElement("mock-widget-container", props),
  };
});

vi.mock("../src/features/display/components/GridOverlay", () => {
  const ReactRuntime = require("react");
  return {
    GridOverlay: (props: Record<string, unknown>) => ReactRuntime.createElement("mock-grid-overlay", props),
  };
});

let LayoutGrid: typeof import("../src/features/display/components/LayoutGrid").LayoutGrid;

beforeAll(async () => {
  LayoutGrid = (await import("../src/features/display/components/LayoutGrid")).LayoutGrid;
});

describe("LayoutGrid selection", () => {
  const widgets = [
    {
      widgetInstanceId: "w1",
      widgetKey: "clockDate" as const,
      layout: { x: 0, y: 0, w: 4, h: 2 },
      state: "ready" as const,
      config: {},
      configSchema: {},
      data: null,
      meta: { resolvedAt: "2026-01-01T00:00:00Z" },
    },
    {
      widgetInstanceId: "w2",
      widgetKey: "weather" as const,
      layout: { x: 4, y: 0, w: 4, h: 2 },
      state: "ready" as const,
      config: {},
      configSchema: {},
      data: null,
      meta: { resolvedAt: "2026-01-01T00:00:00Z" },
    },
  ];

  test("passes selected state to widget containers", () => {
    const tree = TestRenderer.create(
      React.createElement(LayoutGrid, {
        widgets,
        editMode: true,
        selectedWidgetId: "w1",
      }),
    );

    const containers = tree.root.findAllByType("mock-widget-container" as any);
    expect(containers.length).toBe(2);

    const selected = containers.find((node: { props: { widget?: { widgetInstanceId?: string }; isSelected?: boolean } }) =>
      node.props.widget?.widgetInstanceId === "w1",
    );
    const unselected = containers.find((node: { props: { widget?: { widgetInstanceId?: string }; isSelected?: boolean } }) =>
      node.props.widget?.widgetInstanceId === "w2",
    );

    expect(selected?.props.isSelected).toBe(true);
    expect(selected?.props.hasSelectedWidget).toBe(true);
    expect(unselected?.props.isSelected).toBe(false);
    expect(unselected?.props.hasSelectedWidget).toBe(true);
  });

  test("background press clears selection in edit mode", () => {
    const onClearWidgetSelection = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(LayoutGrid, {
        widgets,
        editMode: true,
        selectedWidgetId: "w1",
        onClearWidgetSelection,
      }),
    );

    const clearLayer = tree.root.findAllByType("pressable" as any)
      .find((node: { props: { onPress?: () => void } }) => typeof node.props.onPress === "function");
    expect(clearLayer).toBeDefined();

    clearLayer?.props.onPress?.();
    expect(onClearWidgetSelection).toHaveBeenCalled();
  });

  test("selection changes keep all widget containers rendered with stable widget ids", () => {
    const renderer = TestRenderer.create(
      React.createElement(LayoutGrid, {
        widgets,
        editMode: true,
        selectedWidgetId: "w1",
      }),
    );

    const readWidgetIds = () => renderer.root
      .findAllByType("mock-widget-container" as any)
      .map((node: { props: { widget?: { widgetInstanceId?: string } } }) => node.props.widget?.widgetInstanceId)
      .sort();

    expect(readWidgetIds()).toEqual(["w1", "w2"]);

    TestRenderer.act(() => {
      renderer.update(
        React.createElement(LayoutGrid, {
          widgets,
          editMode: true,
          selectedWidgetId: "w2",
        }),
      );
    });

    expect(readWidgetIds()).toEqual(["w1", "w2"]);
  });
});
