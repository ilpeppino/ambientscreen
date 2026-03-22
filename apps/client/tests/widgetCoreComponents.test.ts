import React from "react";
import TestRenderer from "react-test-renderer";
import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");

  return {
    View: (props: Record<string, unknown>) => ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
    ActivityIndicator: (props: Record<string, unknown>) => ReactRuntime.createElement("activity-indicator", props),
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
  };
});

vi.mock("../src/shared/ui/components/AppIcon", () => {
  const ReactRuntime = require("react");

  return {
    AppIcon: (props: Record<string, unknown>) => ReactRuntime.createElement("mock-icon", props),
  };
});

let WidgetSurface: typeof import("../src/shared/ui/widgets").WidgetSurface;
let WidgetHeader: typeof import("../src/shared/ui/widgets").WidgetHeader;
let WidgetState: typeof import("../src/shared/ui/widgets").WidgetState;

beforeAll(async () => {
  const widgetsModule = await import("../src/shared/ui/widgets");
  WidgetSurface = widgetsModule.WidgetSurface;
  WidgetHeader = widgetsModule.WidgetHeader;
  WidgetState = widgetsModule.WidgetState;
});

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) {
    return {};
  }

  if (!Array.isArray(style)) {
    return style as Record<string, unknown>;
  }

  return style.reduce<Record<string, unknown>>((accumulator, entry) => {
    if (!entry) {
      return accumulator;
    }

    return {
      ...accumulator,
      ...(entry as Record<string, unknown>),
    };
  }, {});
}

describe("widget core components", () => {
  test("WidgetSurface renders and applies selected style", () => {
    const tree = TestRenderer.create(
      React.createElement(
        WidgetSurface,
        { isSelected: true },
        React.createElement("inner", { testID: "inner" }),
      ),
    );

    const rootView = tree.root.findByType("view");
    const style = flattenStyle(rootView.props.style);

    expect(style.borderColor).toBe("#F5A623");
    expect(style.padding).toBe(24);
  });

  test("WidgetHeader renders title, icon, and right-side content", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetHeader, {
        title: "Clock",
        icon: "clock",
        rightContent: React.createElement("text", null, "Actions"),
      }),
    );

    const icon = tree.root.findByType("mock-icon" as any);
    expect(icon.props.name).toBe("clock");

    const textNodes = tree.root.findAllByType("text");
    const textValues = textNodes.map((node: { props: { children?: unknown } }) => node.props.children);
    expect(textValues).toContain("Clock");
    expect(textValues).toContain("Actions");
  });

  test("WidgetState supports loading/error/empty variants", () => {
    const loading = TestRenderer.create(
      React.createElement(WidgetState, { type: "loading" }),
    );
    expect(loading.root.findAllByType("activity-indicator" as any).length).toBe(1);

    const error = TestRenderer.create(
      React.createElement(WidgetState, { type: "error", message: "Failed to load" }),
    );
    const errorIcon = error.root.findByType("mock-icon" as any);
    expect(errorIcon.props.color).toBe("error");

    const empty = TestRenderer.create(
      React.createElement(WidgetState, { type: "empty", message: "No widgets" }),
    );
    const emptyTexts = empty.root.findAllByType("text").map((node: { props: { children?: unknown } }) => node.props.children);
    expect(emptyTexts).toContain("No widgets");
  });
});
