/**
 * AdminTopBar unit tests — profile selector, user menu, global actions.
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

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (!Array.isArray(style)) return style as Record<string, unknown>;
  return style.reduce<Record<string, unknown>>((acc, entry) => {
    if (!entry || typeof entry !== "object") return acc;
    return { ...acc, ...(entry as Record<string, unknown>) };
  }, {});
}

const sampleProfiles = [
  { id: "p-1", userId: "u-1", name: "Home", isDefault: true, createdAt: "", defaultSlideDurationSeconds: 30 },
  { id: "p-2", userId: "u-1", name: "Office", isDefault: false, createdAt: "", defaultSlideDurationSeconds: 30 },
];

const baseProps = {
  profiles: sampleProfiles,
  activeProfileId: "p-1" as string | null,
  plan: "free" as const,
  onActivateProfile: vi.fn(),
  onCreateProfile: vi.fn(),
  onManageProfiles: vi.fn(),
  onOpenSettings: vi.fn(),
  onUpgradePlan: vi.fn(),
  onEnterDisplayMode: vi.fn(),
  onEnterRemoteControlMode: vi.fn(),
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

  test("renders compact global actions with icons", () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const icons = tree.root.findAllByType("mock-icon" as any);
    expect(icons.length).toBeGreaterThanOrEqual(3);
  });

  test("does not render Marketplace or Clear in the top bar", () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const pressables = tree.root.findAllByType("pressable" as any);

    const marketplace = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Marketplace",
    );
    const clear = pressables.find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Clear Canvas",
    );

    expect(marketplace).toBeUndefined();
    expect(clear).toBeUndefined();
  });

  test("uses fixed 60px height with centered row alignment", () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const bar = tree.root.findAllByType("view" as any).find((node: { props: { style?: unknown } }) => {
      const style = flattenStyle(node.props.style);
      return style.height === 60 && style.paddingHorizontal === 16;
    });
    expect(bar).toBeDefined();
    const style = flattenStyle(bar?.props.style);
    expect(style.alignItems).toBe("center");
    expect(style.justifyContent).toBe("space-between");
  });

  test("does not render standalone Mode label", () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => String(n.props.children ?? ""));
    expect(texts).not.toContain("Mode");
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

  test("profile dropdown opens and selecting a profile calls onActivateProfile", async () => {
    const onActivateProfile = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onActivateProfile }),
    );

    const trigger = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => { trigger?.props.onPress?.(); });

    const switchOffice = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Switch to Office",
    );
    await TestRenderer.act(async () => { switchOffice?.props.onPress?.(); });

    expect(onActivateProfile).toHaveBeenCalledWith("p-2");
  });

  test("create/manage profile actions dispatch and close dropdown", async () => {
    const onCreateProfile = vi.fn();
    const onManageProfiles = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onCreateProfile, onManageProfiles }),
    );

    const trigger = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => { trigger?.props.onPress?.(); });

    const createBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Create profile",
    );
    await TestRenderer.act(async () => { createBtn?.props.onPress?.(); });
    expect(onCreateProfile).toHaveBeenCalled();

    await TestRenderer.act(async () => { trigger?.props.onPress?.(); });
    const manageBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Manage profiles",
    );
    await TestRenderer.act(async () => { manageBtn?.props.onPress?.(); });
    expect(onManageProfiles).toHaveBeenCalled();
  });
});

describe("AdminTopBar — user menu", () => {
  test("user menu contains plan, settings, and logout", async () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));

    const menuBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "User menu",
    );
    await TestRenderer.act(async () => { menuBtn?.props.onPress?.(); });

    const texts = tree.root.findAllByType("text").map((n: { props: { children?: unknown } }) => String(n.props.children));
    expect(texts.some((t) => t.includes("Plan: Free"))).toBe(true);
    expect(texts).toContain("Settings");
    expect(texts).toContain("Logout");
  });

  test("settings action calls onOpenSettings", async () => {
    const onOpenSettings = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onOpenSettings }),
    );

    const menuBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "User menu",
    );
    await TestRenderer.act(async () => { menuBtn?.props.onPress?.(); });

    const settingsBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Settings",
    );
    await TestRenderer.act(async () => { settingsBtn?.props.onPress?.(); });

    expect(onOpenSettings).toHaveBeenCalled();
  });

  test("free plan shows upgrade and calls onUpgradePlan", async () => {
    const onUpgradePlan = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, plan: "free", onUpgradePlan }),
    );

    const menuBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "User menu",
    );
    await TestRenderer.act(async () => { menuBtn?.props.onPress?.(); });

    const upgradeBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Upgrade plan",
    );
    expect(upgradeBtn).toBeDefined();

    await TestRenderer.act(async () => { upgradeBtn?.props.onPress?.(); });
    expect(onUpgradePlan).toHaveBeenCalled();
  });

  test("pro plan does not show upgrade action", async () => {
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, plan: "pro" }),
    );

    const menuBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "User menu",
    );
    await TestRenderer.act(async () => { menuBtn?.props.onPress?.(); });

    const upgradeBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Upgrade plan",
    );
    expect(upgradeBtn).toBeUndefined();
  });

  test("logout action calls onLogout and closes menu", async () => {
    const onLogout = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onLogout }),
    );

    const menuBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "User menu",
    );
    await TestRenderer.act(async () => { menuBtn?.props.onPress?.(); });

    const logoutBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Logout",
    );
    await TestRenderer.act(async () => { logoutBtn?.props.onPress?.(); });

    expect(onLogout).toHaveBeenCalled();

    const logoutBtnAfter = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Logout",
    );
    expect(logoutBtnAfter).toBeUndefined();
  });
});

describe("AdminTopBar — global actions", () => {
  test("calls onEnterDisplayMode when Display button is pressed", () => {
    const onEnterDisplayMode = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onEnterDisplayMode }),
    );
    const btn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Display Mode",
    );
    expect(btn).toBeDefined();
    btn?.props.onPress?.();
    expect(onEnterDisplayMode).toHaveBeenCalled();
  });

  test("calls onEnterRemoteControlMode when Remote button is pressed", () => {
    const onEnterRemoteControlMode = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(AdminTopBar, { ...baseProps, onEnterRemoteControlMode }),
    );
    const btn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Remote Control",
    );
    expect(btn).toBeDefined();
    btn?.props.onPress?.();
    expect(onEnterRemoteControlMode).toHaveBeenCalled();
  });

  test("keeps a single active mode style and moves it when mode changes", async () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));

    const displayBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Display Mode",
    );
    const remoteBtn = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Remote Control",
    );
    expect(displayBtn).toBeDefined();
    expect(remoteBtn).toBeDefined();

    const initialDisplayStyle = flattenStyle(displayBtn?.props.style);
    const initialRemoteStyle = flattenStyle(remoteBtn?.props.style);
    expect(initialDisplayStyle.borderColor).toBe("#2d8cff");
    expect(initialRemoteStyle.borderColor).not.toBe("#2d8cff");

    await TestRenderer.act(async () => {
      remoteBtn?.props.onPress?.();
    });

    const displayBtnAfter = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Display Mode",
    );
    const remoteBtnAfter = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Remote Control",
    );

    const nextDisplayStyle = flattenStyle(displayBtnAfter?.props.style);
    const nextRemoteStyle = flattenStyle(remoteBtnAfter?.props.style);
    expect(nextDisplayStyle.borderColor).not.toBe("#2d8cff");
    expect(nextRemoteStyle.borderColor).toBe("#2d8cff");
  });
});

describe("AdminTopBar — dismiss overlay", () => {
  test("dismiss overlay appears when profile dropdown is open", async () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));
    const trigger = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => { trigger?.props.onPress?.(); });

    const overlay = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Close menu",
    );
    expect(overlay).toBeDefined();
  });

  test("pressing dismiss overlay closes dropdowns", async () => {
    const tree = TestRenderer.create(React.createElement(AdminTopBar, baseProps));

    const openProfile = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Profile selector",
    );
    await TestRenderer.act(async () => { openProfile?.props.onPress?.(); });

    const overlay = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Close menu",
    );
    await TestRenderer.act(async () => { overlay?.props.onPress?.(); });

    const switchOffice = tree.root.findAllByType("pressable" as any).find(
      (p: { props: { accessibilityLabel?: string } }) => p.props.accessibilityLabel === "Switch to Office",
    );
    expect(switchOffice).toBeUndefined();
  });
});
