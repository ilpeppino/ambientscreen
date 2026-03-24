/**
 * SettingsScreen unit tests.
 * Covers Account & Plan section, page structure, and interaction behavior.
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
// Page structure
// ---------------------------------------------------------------------------
describe("SettingsScreen — page structure", () => {
  test("renders Profile section", () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, baseProps));

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).toUpperCase().includes("PROFILE"))).toBe(true);
  });

  test("renders Devices section", () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, baseProps));

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).toUpperCase().includes("DEVICE"))).toBe(true);
  });

  test("navigation section is not present in settings", () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, baseProps));

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    // Display Mode and Logout navigation buttons must NOT appear in SettingsScreen
    expect(texts.some((t) => String(t) === "Display Mode")).toBe(false);
    expect(texts.some((t) => String(t) === "Logout")).toBe(false);
    expect(texts.some((t) => String(t) === "Navigation")).toBe(false);
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

  test("shows active profile name on initial render", () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, baseProps));

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t) === "Home")).toBe(true);
  });

  test("profile management actions hidden by default", () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, baseProps));

    const pressables = tree.root.findAllByType("pressable" as any);
    // Create and Rename profile buttons should not be visible initially
    const createBtn = pressables.find((p: { props: { accessibilityLabel?: string } }) =>
      p.props.accessibilityLabel === "Create",
    );
    expect(createBtn).toBeUndefined();
  });

  test("profile actions expand when 'Manage profiles' is pressed", async () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, baseProps));

    const pressables = tree.root.findAllByType("pressable" as any);
    const manageBtn = pressables.find((p: { props: { accessibilityLabel?: string } }) =>
      p.props.accessibilityLabel === "Manage profiles",
    );
    expect(manageBtn).toBeDefined();

    await TestRenderer.act(async () => {
      manageBtn?.props.onPress?.();
    });

    const pressablesAfter = tree.root.findAllByType("pressable" as any);
    const createBtn = pressablesAfter.find((p: { props: { accessibilityLabel?: string } }) =>
      p.props.accessibilityLabel === "Create",
    );
    expect(createBtn).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Device list
// ---------------------------------------------------------------------------
describe("SettingsScreen — device list", () => {
  const deviceProps = {
    ...baseProps,
    devices: [
      {
        id: "d1",
        name: "Living Room TV",
        platform: "web",
        deviceType: "display",
        lastSeenAt: new Date().toISOString(),
        connectionStatus: "online" as const,
        userId: "u1",
        createdAt: "",
      },
    ] as import("@ambient/shared-contracts").Device[],
  };

  test("renders device name", () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, deviceProps));

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Living Room TV"))).toBe(true);
  });

  test("renders rename button for device", () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, deviceProps));

    const pressables = tree.root.findAllByType("pressable" as any);
    const renameBtn = pressables.find((p: { props: { accessibilityLabel?: string } }) =>
      p.props.accessibilityLabel?.includes("Rename device"),
    );
    expect(renameBtn).toBeDefined();
  });

  test("renders delete button for device", () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, deviceProps));

    const pressables = tree.root.findAllByType("pressable" as any);
    const deleteBtn = pressables.find((p: { props: { accessibilityLabel?: string } }) =>
      p.props.accessibilityLabel?.includes("Delete device"),
    );
    expect(deleteBtn).toBeDefined();
  });

  test("calls setConfirmDeleteDeviceId when delete button is pressed", async () => {
    const setConfirmDeleteDeviceId = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(SettingsScreen, { ...deviceProps, setConfirmDeleteDeviceId }),
    );

    const pressables = tree.root.findAllByType("pressable" as any);
    const deleteBtn = pressables.find((p: { props: { accessibilityLabel?: string } }) =>
      p.props.accessibilityLabel?.includes("Delete device"),
    );
    expect(deleteBtn).toBeDefined();
    await TestRenderer.act(async () => {
      deleteBtn?.props.onPress?.();
    });
    expect(setConfirmDeleteDeviceId).toHaveBeenCalledWith("d1");
  });

  test("rename input appears after pressing Rename", async () => {
    const tree = TestRenderer.create(React.createElement(SettingsScreen, deviceProps));

    const pressables = tree.root.findAllByType("pressable" as any);
    const renameBtn = pressables.find((p: { props: { accessibilityLabel?: string } }) =>
      p.props.accessibilityLabel?.includes("Rename device"),
    );
    expect(renameBtn).toBeDefined();

    await TestRenderer.act(async () => {
      renameBtn?.props.onPress?.();
    });

    // Save button should now be visible
    const pressablesAfter = tree.root.findAllByType("pressable" as any);
    const saveBtn = pressablesAfter.find((p: { props: { accessibilityLabel?: string } }) =>
      p.props.accessibilityLabel === "Save",
    );
    expect(saveBtn).toBeDefined();
  });

  test("delete button is disabled for current device", () => {
    const tree = TestRenderer.create(
      React.createElement(SettingsScreen, { ...deviceProps, currentDeviceId: "d1" }),
    );

    const pressables = tree.root.findAllByType("pressable" as any);
    const deleteBtn = pressables.find((p: { props: { accessibilityLabel?: string } }) =>
      p.props.accessibilityLabel?.includes("Delete device"),
    );
    expect(deleteBtn?.props.disabled).toBe(true);
  });
});
