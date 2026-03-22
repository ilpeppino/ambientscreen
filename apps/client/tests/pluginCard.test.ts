import React from "react";
import TestRenderer from "react-test-renderer";
import { beforeAll, describe, expect, test, vi } from "vitest";
import type { MarketplacePlugin } from "../src/features/marketplace/marketplace.types";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");

  return {
    View: (props: Record<string, unknown>) => ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
    Switch: (props: Record<string, unknown>) => ReactRuntime.createElement("switch", props),
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
  };
});

vi.mock("../src/shared/ui/management", () => {
  const ReactRuntime = require("react");

  return {
    ManagementCard: (props: Record<string, any>) => ReactRuntime.createElement(
      "management-card",
      props,
      props.badges,
      props.children,
      props.footer,
    ),
    InlineStatusBadge: (props: Record<string, unknown>) => ReactRuntime.createElement("status-badge", props),
    ActionRow: (props: Record<string, unknown>) => ReactRuntime.createElement("action-row", props, props.children),
    ManagementActionButton: (props: Record<string, unknown>) => ReactRuntime.createElement("action-button", props),
  };
});

let PluginCard: typeof import("../src/features/marketplace/components/PluginCard").PluginCard;

beforeAll(async () => {
  const module = await import("../src/features/marketplace/components/PluginCard");
  PluginCard = module.PluginCard;
});

function makePlugin(overrides: Partial<MarketplacePlugin>): MarketplacePlugin {
  return {
    id: "plugin-1",
    key: "weather",
    name: "Weather",
    description: "Weather plugin",
    category: "weather",
    isPremium: false,
    activeVersion: { version: "1.0.0" },
    isInstalled: false,
    isEnabled: false,
    installationId: null,
    ...overrides,
  };
}

describe("PluginCard", () => {
  test("renders install primary action when not installed", () => {
    const tree = TestRenderer.create(
      React.createElement(PluginCard, {
        plugin: makePlugin({ isInstalled: false, isEnabled: false }),
        actionInProgress: false,
        isPremiumLocked: false,
        isInstallationLocked: false,
        onInstall: () => undefined,
        onUninstall: () => undefined,
        onToggleEnabled: () => undefined,
        onViewDetails: () => undefined,
      }),
    );

    const actions = tree.root.findAllByType("action-button" as any);
    const labels = actions.map((node: { props: { label?: string } }) => node.props.label);

    expect(labels).toContain("Install");
    expect(labels).toContain("View details");
    expect(labels).not.toContain("Uninstall");
  });

  test("renders uninstall action and enabled badge for installed plugin", () => {
    const tree = TestRenderer.create(
      React.createElement(PluginCard, {
        plugin: makePlugin({ isInstalled: true, isEnabled: true }),
        actionInProgress: false,
        isPremiumLocked: false,
        isInstallationLocked: false,
        onInstall: () => undefined,
        onUninstall: () => undefined,
        onToggleEnabled: () => undefined,
        onViewDetails: () => undefined,
      }),
    );

    const actions = tree.root.findAllByType("action-button" as any);
    const labels = actions.map((node: { props: { label?: string } }) => node.props.label);
    expect(labels).toContain("Uninstall");

    const badges = tree.root.findAllByType("status-badge" as any);
    const badgeLabels = badges.map((node: { props: { label?: string } }) => node.props.label);
    expect(badgeLabels).toContain("Enabled");
    expect(badgeLabels).toContain("Installed");
  });

  test("does not render install action when installation is locked", () => {
    const tree = TestRenderer.create(
      React.createElement(PluginCard, {
        plugin: makePlugin({ isInstalled: false, isEnabled: false, isPremium: true }),
        actionInProgress: false,
        isPremiumLocked: true,
        isInstallationLocked: true,
        onInstall: () => undefined,
        onUninstall: () => undefined,
        onToggleEnabled: () => undefined,
        onViewDetails: () => undefined,
      }),
    );

    const actions = tree.root.findAllByType("action-button" as any);
    const labels = actions.map((node: { props: { label?: string } }) => node.props.label);

    expect(labels).toContain("View details");
    expect(labels).not.toContain("Install");
  });
});
