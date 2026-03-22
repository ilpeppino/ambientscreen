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

let InlineStatusBadge: typeof import("../src/shared/ui/management").InlineStatusBadge;
let EmptyPanel: typeof import("../src/shared/ui/management").EmptyPanel;
let FilterChips: typeof import("../src/shared/ui/management").FilterChips;
let ManagementActionButton: typeof import("../src/shared/ui/management").ManagementActionButton;

beforeAll(async () => {
  const module = await import("../src/shared/ui/management");
  InlineStatusBadge = module.InlineStatusBadge;
  EmptyPanel = module.EmptyPanel;
  FilterChips = module.FilterChips;
  ManagementActionButton = module.ManagementActionButton;
});

describe("management ui components", () => {
  test("InlineStatusBadge renders icon and label", () => {
    const tree = TestRenderer.create(
      React.createElement(InlineStatusBadge, {
        label: "Installed",
        tone: "success",
        icon: "check",
      }),
    );

    const icon = tree.root.findByType("mock-icon" as any);
    expect(icon.props.name).toBe("check");

    const labels = tree.root.findAllByType("text").map((node: { props: { children?: unknown } }) => node.props.children);
    expect(labels).toContain("Installed");
  });

  test("EmptyPanel supports loading and error variants", () => {
    const loading = TestRenderer.create(
      React.createElement(EmptyPanel, {
        variant: "loading",
        title: "Loading",
        message: "Please wait",
      }),
    );
    expect(loading.root.findAllByType("activity-indicator" as any).length).toBe(1);

    const error = TestRenderer.create(
      React.createElement(EmptyPanel, {
        variant: "error",
        title: "Error",
        message: "Failed",
      }),
    );

    const icon = error.root.findByType("mock-icon" as any);
    expect(icon.props.color).toBe("error");
  });

  test("FilterChips invokes callback when chip is pressed", () => {
    const onChange = vi.fn();

    const tree = TestRenderer.create(
      React.createElement(FilterChips, {
        items: [
          { key: "all", label: "All" },
          { key: "installed", label: "Installed", icon: "check" },
        ],
        activeKey: "all",
        onChange,
      }),
    );

    const chips = tree.root.findAllByType("pressable" as any);
    chips[1]?.props.onPress();
    expect(onChange).toHaveBeenCalledWith("installed");
  });

  test("ManagementActionButton shows loading label", () => {
    const tree = TestRenderer.create(
      React.createElement(ManagementActionButton, {
        label: "Install",
        loading: true,
        onPress: () => undefined,
      }),
    );

    const labels = tree.root.findAllByType("text").map((node: { props: { children?: unknown } }) => node.props.children);
    expect(labels).toContain("Install...");
  });
});
