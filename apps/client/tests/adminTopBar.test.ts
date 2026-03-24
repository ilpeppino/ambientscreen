/**
 * AdminTopBar unit tests — profile selector, user menu, action groups.
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

const sampleProfiles = [
  { id: "p-1", userId: "u-1", name: "Home", isDefault: true, createdAt: "" },
  { id: "p-2", userId: "u-1", name: "Office", isDefault: false, createdAt: "" },
];

const baseProps = {
  profiles: sampleProfiles,
  activeProfileId: "p-1" as string | null,
  plan: "free" as const,
  onActivateProfile: vi.fn(),
  onCreateProfile: vi.fn(),
  onManageProfiles: vi.fn(),
  onOpenSettings: vi.fn(),
  onClearCanvas: vi.fn(),
  clearCanvasDisabled: false,
  clearingCanvas: false,
  onEnterDisplayMode: vi.fn(),
  onEnterRemoteControlMode: vi.fn(),
  onEnterMarketplace: vi.fn(),
  onLogout: vi.fn(),
};

describe("AdminTopBar — layout", () => {
  test("renders title", () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Dashboard Editor"))).toBe(true);
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
    expect(icons.length).toBeGreaterThanOrEqual(3);
  });
});

describe("AdminTopBar — profile selector", () => {
  test("shows active profile name in selector", () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t) === "Home")).toBe(true);
  });

  test("shows fallback text when no active profile", () => {
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, activeProfileId: null }),
    );
    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(texts.some((t) => String(t).includes("Select profile"))).toBe(true);
  });

  test("profile dropdown is closed by default", () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const pressables = tree.root.findAllByType("pressable" as any);
    const switchOffice = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Switch to Office",
    );
    expect(switchOffice).toBeUndefined();
  });

  test("profile dropdown opens when selector is pressed", async () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const trigger = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => {
      trigger?.props.onPress?.();
    });
    const pressables = tree.root.findAllByType("pressable" as any);
    const switchOffice = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Switch to Office",
    );
    expect(switchOffice).toBeDefined();
  });

  test("profile dropdown closes when selector is pressed again", async () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const trigger = () => tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => { trigger()?.props.onPress?.(); });
    await TestRenderer.act(async () => { trigger()?.props.onPress?.(); });
    const switchOffice = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Switch to Office",
    );
    expect(switchOffice).toBeUndefined();
  });

  test("selecting a profile calls onActivateProfile with correct id", async () => {
    const onActivateProfile = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onActivateProfile }),
    );
    const trigger = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => { trigger?.props.onPress?.(); });

    const switchOffice = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Switch to Office",
    );
    await TestRenderer.act(async () => { switchOffice?.props.onPress?.(); });
    expect(onActivateProfile).toHaveBeenCalledWith("p-2");
  });

  test("selecting a profile closes the dropdown", async () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const trigger = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => { trigger?.props.onPress?.(); });

    const switchHome = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Switch to Home",
    );
    await TestRenderer.act(async () => { switchHome?.props.onPress?.(); });

    const switchOffice = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Switch to Office",
    );
    expect(switchOffice).toBeUndefined();
  });

  test("'Create profile' calls onCreateProfile and closes dropdown", async () => {
    const onCreateProfile = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onCreateProfile }),
    );
    const trigger = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => { trigger?.props.onPress?.(); });

    const createBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Create profile",
    );
    await TestRenderer.act(async () => { createBtn?.props.onPress?.(); });
    expect(onCreateProfile).toHaveBeenCalled();

    // Dropdown should be closed
    const switchOffice = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Switch to Office",
    );
    expect(switchOffice).toBeUndefined();
  });

  test("'Manage profiles' calls onManageProfiles and closes dropdown", async () => {
    const onManageProfiles = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onManageProfiles }),
    );
    const trigger = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => { trigger?.props.onPress?.(); });

    const manageBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Manage profiles",
    );
    await TestRenderer.act(async () => { manageBtn?.props.onPress?.(); });
    expect(onManageProfiles).toHaveBeenCalled();

    const switchOffice = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Switch to Office",
    );
    expect(switchOffice).toBeUndefined();
  });
});

describe("AdminTopBar — user menu", () => {
  test("user menu is closed by default — Logout not visible", () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const logoutBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Logout",
    );
    expect(logoutBtn).toBeUndefined();
  });

  test("user menu opens when user menu button is pressed", async () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const menuBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "User menu",
    );
    await TestRenderer.act(async () => { menuBtn?.props.onPress?.(); });

    const logoutBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Logout",
    );
    expect(logoutBtn).toBeDefined();
  });

  test("Logout calls onLogout and closes user menu", async () => {
    const onLogout = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onLogout }),
    );
    const menuBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "User menu",
    );
    await TestRenderer.act(async () => { menuBtn?.props.onPress?.(); });

    const logoutBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Logout",
    );
    await TestRenderer.act(async () => { logoutBtn?.props.onPress?.(); });
    expect(onLogout).toHaveBeenCalled();

    // Menu should be closed
    const logoutBtnAfter = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Logout",
    );
    expect(logoutBtnAfter).toBeUndefined();
  });
});

describe("AdminTopBar — action buttons", () => {
  test("calls onEnterDisplayMode when Display button is pressed", () => {
    const onEnterDisplayMode = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onEnterDisplayMode }),
    );
    const btn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Display Mode",
    );
    expect(btn).toBeDefined();
    btn?.props.onPress?.();
    expect(onEnterDisplayMode).toHaveBeenCalled();
  });

  test("calls onOpenSettings when Settings button is pressed", () => {
    const onOpenSettings = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onOpenSettings }),
    );
    const btn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Settings",
    );
    expect(btn).toBeDefined();
    btn?.props.onPress?.();
    expect(onOpenSettings).toHaveBeenCalled();
  });

  test("Clear Canvas button is present and calls onClearCanvas", () => {
    const onClearCanvas = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onClearCanvas }),
    );
    const btn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Clear Canvas",
    );
    expect(btn).toBeDefined();
    btn?.props.onPress?.();
    expect(onClearCanvas).toHaveBeenCalled();
  });

  test("calls onEnterMarketplace when Marketplace button is pressed", () => {
    const onEnterMarketplace = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onEnterMarketplace }),
    );
    const btn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Marketplace",
    );
    expect(btn).toBeDefined();
    btn?.props.onPress?.();
    expect(onEnterMarketplace).toHaveBeenCalled();
  });

  test("calls onEnterRemoteControlMode when Remote button is pressed", () => {
    const onEnterRemoteControlMode = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onEnterRemoteControlMode }),
    );
    const btn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Remote Control",
    );
    expect(btn).toBeDefined();
    btn?.props.onPress?.();
    expect(onEnterRemoteControlMode).toHaveBeenCalled();
  });
});

describe("AdminTopBar — dismiss overlay", () => {
  test("dismiss overlay appears when profile dropdown is open", async () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const trigger = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => { trigger?.props.onPress?.(); });

    const overlay = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Close menu",
    );
    expect(overlay).toBeDefined();
  });

  test("pressing dismiss overlay closes both dropdowns", async () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const trigger = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => { trigger?.props.onPress?.(); });

    const overlay = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Close menu",
    );
    await TestRenderer.act(async () => { overlay?.props.onPress?.(); });

    const switchOffice = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) =>
        p.props.accessibilityLabel === "Switch to Office",
    );
    expect(switchOffice).toBeUndefined();
  });
});
