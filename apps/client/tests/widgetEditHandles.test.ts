import React from "react";
import TestRenderer from "react-test-renderer";
import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    View: (props: Record<string, unknown>) => ReactRuntime.createElement("view", props, props.children),
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

let WidgetEditHandles: typeof import("../src/features/display/components/WidgetEditHandles").WidgetEditHandles;

beforeAll(async () => {
  WidgetEditHandles = (await import("../src/features/display/components/WidgetEditHandles")).WidgetEditHandles;
});

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (!Array.isArray(style)) return style as Record<string, unknown>;
  return style.reduce<Record<string, unknown>>((acc, entry) => {
    if (!entry || typeof entry !== "object") return acc;
    return { ...acc, ...(entry as Record<string, unknown>) };
  }, {});
}

describe("WidgetEditHandles", () => {
  test("renders nothing when not visible", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetEditHandles, { visible: false }),
    );
    expect(tree.toJSON()).toBeNull();
  });

  test("renders selection outline and four corner resize handles when visible", () => {
    const tree = TestRenderer.create(
      React.createElement(WidgetEditHandles, { visible: true }),
    );

    const views = tree.root.findAllByType("view" as any);
    const outline = views.find((node: { props: { style?: unknown } }) => {
      const style = flattenStyle(node.props.style);
      return style.borderWidth === 2 && style.borderColor === "#2d8cffCC";
    });
    expect(outline).toBeDefined();

    const corners = views.filter((node: { props: { style?: unknown } }) => {
      const style = flattenStyle(node.props.style);
      return style.width === 10 && style.height === 10;
    });
    expect(corners.length).toBe(4);
  });
});
