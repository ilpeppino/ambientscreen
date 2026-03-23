/**
 * Phase 4 — SettingsScreen unit tests.
 * Verifies Account & Plan section and overall settings structure.
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

vi.mock("react-native-safe-area-context", () => {
  const ReactRuntime = require("react");
  return {
    SafeAreaView: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("safe-area-view", props, props.children),
  };
});

vi.mock("../src/shared/ui/components/AppIcon", () => {
  const ReactRuntime = require("react");
  return {
    AppIcon: (props: Record<string, unknown>) => ReactRuntime.createElement("mock-icon", props),
  };
});

vi.mock("../src/shared/ui/components/Text", () => {
  const ReactRuntime = require("react");
  return {
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
  };
});

vi.mock("../src/shared/ui/overlays/ConfirmDialog", () => {
  const ReactRuntime = require("react");
  return {
    ConfirmDialog: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("mock-confirm-dialog", props),
  };
});

vi.mock("../src/features/devices/DeviceCard", () => {
  const ReactRuntime = require("react");
  return {
    DeviceCard: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("mock-device-card", props, props.children),
  };
});

let SettingsScreen: typeof import("../src/features/admin/screens/SettingsScreen").SettingsScreen;

beforeAll(async () => {
  const mod = await import("../src/features/admin/screens/SettingsScreen");
  SettingsScreen = mod.SettingsScreen;
});

const baseProps = {
  onBack: vi.fn(),
  plan: "free" as const,
  onUpgradePress: vi.fn(),
  profiles: [{ id: "p1", name: "Home", userId: "u1", isDefault: true, createdAt: "" }] as import("@ambient/shared-contracts").Profile[],
  activeProfileId: "p1",
  profileError: null,
  newProfileName: "",
  setNewProfileName: vi.fn(),
  renameProfileName: "",
  setRenameProfileName: vi.fn(),
  creatingProfile: false,
  renamingProfile: false,
  deletingProfile: false,
  confirmDeleteProfile: false,
  setConfirmDeleteProfile: vi.fn(),
  onActivateProfile: vi.fn(),
  onCreateProfile: vi.fn(),
  onRenameProfile: vi.fn(),
  onDeleteProfile: vi.fn(),
  devices: [] as import("@ambient/shared-contracts").Device[],
  loadingDevices: false,
  devicesError: null,
  currentDeviceId: null,
  renameDraftByDeviceId: {},
  onChangeDeviceNameDraft: vi.fn(),
  renamingDeviceId: null,
  deletingDeviceId: null,
  confirmDeleteDeviceId: null,
  setConfirmDeleteDeviceId: vi.fn(),
  onRenameDevice: vi.fn(),
  onDeleteDevice: vi.fn(),
  onRetryLoadDevices: vi.fn(),
  onEnterDisplayMode: vi.fn(),
  onEnterRemoteControlMode: vi.fn(),
  onEnterMarketplace: vi.fn(),
  onLogout: vi.fn(),
} as const;

// ---------------------------------------------------------------------------
// Account & Plan section
// ---------------------------------------------------------------------------
describe("SettingsScreen — Account & Plan section", () => {
  test("shows 'Free Plan' label for free plan users", () => {
    const tree = TestRenderer.create(
      React.createElement(SettingsScreen, { ...baseProps, plan: "free" }),
    );

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Free Plan"))).toBe(true);
  });

  test("shows 'Pro Plan' label for pro plan users", () => {
    const tree = TestRenderer.create(
      React.createElement(SettingsScreen, { ...baseProps, plan: "pro" }),
    );

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Pro Plan"))).toBe(true);
  });

  test("shows Upgrade button for free plan users", () => {
    const tree = TestRenderer.create(
      React.createElement(SettingsScreen, { ...baseProps, plan: "free" }),
    );

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).toLowerCase().includes("upgrade"))).toBe(true);
  });

  test("does not show Upgrade button for pro plan users", () => {
    const tree = TestRenderer.create(
      React.createElement(SettingsScreen, { ...baseProps, plan: "pro" }),
    );

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).toLowerCase().includes("upgrade"))).toBe(false);
  });

  test("calls onUpgradePress when Upgrade button is pressed", async () => {
    const onUpgradePress = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(SettingsScreen, { ...baseProps, plan: "free", onUpgradePress }),
    );

    const pressables = tree.root.findAllByType("pressable" as any);
    const upgradeBtn = pressables.find((p: { props: { accessibilityLabel?: string } }) =>
      p.props.accessibilityLabel?.toLowerCase().includes("upgrade"),
    );
    expect(upgradeBtn).toBeDefined();
    await TestRenderer.act(async () => {
      upgradeBtn?.props.onPress?.();
    });
    expect(onUpgradePress).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Settings page structure
// ---------------------------------------------------------------------------
describe("SettingsScreen — page structure", () => {
  test("renders Profile Management section", () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, baseProps));

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Profile Management"))).toBe(true);
  });

  test("renders Device Management section", () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, baseProps));

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Device Management"))).toBe(true);
  });

  test("renders Navigation section with mode buttons", () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, baseProps));

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Display Mode"))).toBe(true);
    expect(texts.some((t) => String(t).includes("Logout"))).toBe(true);
  });

  test("Back button calls onBack", () => {
    const onBack = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(SettingsScreen, { ...baseProps, onBack }),
    );

    const pressables = tree.root.findAllByType("pressable" as any);
    const backBtn = pressables.find((p: { props: { accessibilityLabel?: string } }) =>
      p.props.accessibilityLabel?.toLowerCase().includes("back"),
    );
    expect(backBtn).toBeDefined();
    backBtn?.props.onPress?.();
    expect(onBack).toHaveBeenCalled();
  });
});
