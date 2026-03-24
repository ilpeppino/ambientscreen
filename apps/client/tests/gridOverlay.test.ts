import React from "react";
import TestRenderer from "react-test-renderer";
import { beforeAll, expect, test, vi } from "vitest";

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

let GridOverlay: typeof import("../src/features/display/components/GridOverlay").GridOverlay;

beforeAll(async () => {
  GridOverlay = (await import("../src/features/display/components/GridOverlay")).GridOverlay;
});

test("GridOverlay is hidden in display mode", () => {
  const tree = TestRenderer.create(
    React.createElement(GridOverlay, {
      visible: false,
      columns: 12,
      rows: 6,
    }),
  );

  expect(tree.toJSON()).toBeNull();
});

test("GridOverlay renders current grid guides in edit mode", () => {
  const tree = TestRenderer.create(
    React.createElement(GridOverlay, {
      visible: true,
      columns: 12,
      rows: 6,
    }),
  );

  const root = tree.root.findByType("view");
  const children = React.Children.toArray(root.props.children);

  expect(children.length).toBe(16);
});
