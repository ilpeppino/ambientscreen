/**
 * Phase 5 — AdminTopBar unit tests.
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

let AdminTopBar: typeof import("../src/features/admin/components/AdminTopBar").AdminTopBar;

beforeAll(async () => {
  const mod = await import("../src/features/admin/components/AdminTopBar");
  AdminTopBar = mod.AdminTopBar;
});

const baseProps = {
  activeProfileName: "Home",
  plan: "free" as const,
  onOpenSettings: vi.fn(),
  onClearCanvas: vi.fn(),
  clearCanvasDisabled: false,
  clearingCanvas: false,
  onEnterDisplayMode: vi.fn(),
  onEnterMarketplace: vi.fn(),
};

describe("AdminTopBar", () => {
  test("renders title and profile name", () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Dashboard Editor"))).toBe(true);
    expect(texts.some((t) => String(t).includes("Home"))).toBe(true);
  });

  test("shows plan badge for free plan", () => {
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, plan: "free" }),
    );

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t) === "Free")).toBe(true);
  });

  test("shows plan badge for pro plan", () => {
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, plan: "pro" }),
    );

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t) === "Pro")).toBe(true);
  });

  test("renders action buttons with icons", () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));

    const icons = tree.root.findAllByType("mock-icon" as any);
    // Marketplace (star), Display (grid), Settings (settings), plan badge (grid/star)
    expect(icons.length).toBeGreaterThanOrEqual(3);
  });

  test("calls onEnterDisplayMode when Display button is pressed", () => {
    const onEnterDisplayMode = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onEnterDisplayMode }),
    );

    const pressables = tree.root.findAllByType("pressable" as any);
    const displayBtn = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Display Mode",
    );
    expect(displayBtn).toBeDefined();
    displayBtn?.props.onPress?.();
    expect(onEnterDisplayMode).toHaveBeenCalled();
  });

  test("calls onOpenSettings when Settings button is pressed", () => {
    const onOpenSettings = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onOpenSettings }),
    );

    const pressables = tree.root.findAllByType("pressable" as any);
    const settingsBtn = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Settings",
    );
    expect(settingsBtn).toBeDefined();
    settingsBtn?.props.onPress?.();
    expect(onOpenSettings).toHaveBeenCalled();
  });

  test("calls onClearCanvas when Clear Canvas button is pressed", () => {
    const onClearCanvas = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onClearCanvas }),
    );

    const pressables = tree.root.findAllByType("pressable" as any);
    const clearCanvasBtn = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Clear Canvas",
    );
    expect(clearCanvasBtn).toBeDefined();
    clearCanvasBtn?.props.onPress?.();
    expect(onClearCanvas).toHaveBeenCalled();
  });

  test("calls onEnterMarketplace when Marketplace button is pressed", () => {
    const onEnterMarketplace = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onEnterMarketplace }),
    );

    const pressables = tree.root.findAllByType("pressable" as any);
    const marketplaceBtn = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Marketplace",
    );
    expect(marketplaceBtn).toBeDefined();
    marketplaceBtn?.props.onPress?.();
    expect(onEnterMarketplace).toHaveBeenCalled();
  });

  test("omits profile name when null", () => {
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, activeProfileName: null }),
    );

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    // Title still present
    expect(texts.some((t) => String(t).includes("Dashboard Editor"))).toBe(true);
    // Profile name "Home" not present
    expect(texts.some((t) => String(t) === "Home")).toBe(false);
  });
});
