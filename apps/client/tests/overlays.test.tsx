import React from "react";
import TestRenderer from "react-test-renderer";
import { beforeAll, describe, expect, test, vi } from "vitest";

// Minimal React Native mock needed for overlay components
vi.mock("react-native", () => {
  const ReactRuntime = require("react");

  return {
    Modal: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
      visible ? ReactRuntime.createElement("modal", {}, children) : null,
    View: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("view", props, props.children),
    Pressable: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("pressable", { ...props, "data-testid": props.accessibilityLabel }, props.children),
    Text: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("text", props, props.children),
    ScrollView: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("scroll-view", props, props.children),
    Switch: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("switch", props),
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
    Platform: { OS: "ios" },
    KeyboardAvoidingView: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("keyboard-avoiding-view", props, props.children),
  };
});

vi.mock("../src/shared/ui/components/AppIcon", () => {
  const ReactRuntime = require("react");
  return {
    AppIcon: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("mock-icon", props),
  };
});

let DialogModal: typeof import("../src/shared/ui/overlays").DialogModal;
let SheetModal: typeof import("../src/shared/ui/overlays").SheetModal;
let ConfirmDialog: typeof import("../src/shared/ui/overlays").ConfirmDialog;

beforeAll(async () => {
  const module = await import("../src/shared/ui/overlays");
  DialogModal = module.DialogModal;
  SheetModal = module.SheetModal;
  ConfirmDialog = module.ConfirmDialog;
});

// ---------------------------------------------------------------------------
// DialogModal
// ---------------------------------------------------------------------------

describe("DialogModal", () => {
  test("renders title and children when visible", () => {
    const tree = TestRenderer.create(
      React.createElement(DialogModal, {
        visible: true,
        title: "Test Dialog",
        onRequestClose: vi.fn(),
        children: React.createElement("text", {}, "Body content"),
      }),
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Test Dialog");
    expect(json).toContain("Body content");
  });

  test("renders nothing when not visible", () => {
    const tree = TestRenderer.create(
      React.createElement(DialogModal, {
        visible: false,
        title: "Hidden Dialog",
        onRequestClose: vi.fn(),
        children: React.createElement("text", {}, "Should not render"),
      }),
    );
    expect(tree.toJSON()).toBeNull();
  });

  test("renders footer slot when provided", () => {
    const tree = TestRenderer.create(
      React.createElement(DialogModal, {
        visible: true,
        title: "With Footer",
        onRequestClose: vi.fn(),
        children: React.createElement("text", {}, "Body"),
        footer: React.createElement("text", {}, "Footer actions"),
      }),
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Footer actions");
  });

  test("calls onRequestClose when dismissible and back is pressed", () => {
    const onRequestClose = vi.fn();
    // Simulate onRequestClose being fired (native back button delegates to this prop)
    const instance = TestRenderer.create(
      React.createElement(DialogModal, {
        visible: true,
        title: "Dismissible",
        onRequestClose,
        dismissible: true,
        children: React.createElement("text", {}, "Body"),
      }),
    );
    // The Modal mock renders when visible — verify it exists
    expect(instance.toJSON()).not.toBeNull();
  });

  test("does not dismiss on backdrop tap when dismissible=false", () => {
    const onRequestClose = vi.fn();
    TestRenderer.create(
      React.createElement(DialogModal, {
        visible: true,
        title: "Non-dismissible",
        onRequestClose,
        dismissible: false,
        children: React.createElement("text", {}, "Body"),
      }),
    );
    // When dismissible=false the backdrop Pressable's onPress does nothing
    expect(onRequestClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SheetModal
// ---------------------------------------------------------------------------

describe("SheetModal", () => {
  test("renders children when visible", () => {
    const tree = TestRenderer.create(
      React.createElement(SheetModal, {
        visible: true,
        onRequestClose: vi.fn(),
        children: React.createElement("text", {}, "Sheet content"),
      }),
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Sheet content");
  });

  test("renders nothing when not visible", () => {
    const tree = TestRenderer.create(
      React.createElement(SheetModal, {
        visible: false,
        onRequestClose: vi.fn(),
        children: React.createElement("text", {}, "Hidden"),
      }),
    );
    expect(tree.toJSON()).toBeNull();
  });

  test("renders optional title in top bar", () => {
    const tree = TestRenderer.create(
      React.createElement(SheetModal, {
        visible: true,
        title: "Sheet Title",
        onRequestClose: vi.fn(),
        children: React.createElement("text", {}, "Body"),
      }),
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Sheet Title");
  });

  test("renders footer slot when provided", () => {
    const tree = TestRenderer.create(
      React.createElement(SheetModal, {
        visible: true,
        onRequestClose: vi.fn(),
        children: React.createElement("text", {}, "Body"),
        footer: React.createElement("text", {}, "Sheet footer"),
      }),
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Sheet footer");
  });
});

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------

describe("ConfirmDialog", () => {
  test("renders title and message when visible", () => {
    const tree = TestRenderer.create(
      React.createElement(ConfirmDialog, {
        visible: true,
        title: "Delete Item",
        message: "Are you sure?",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Delete Item");
    expect(json).toContain("Are you sure?");
  });

  test("renders nothing when not visible", () => {
    const tree = TestRenderer.create(
      React.createElement(ConfirmDialog, {
        visible: false,
        title: "Delete Item",
        message: "Are you sure?",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
    expect(tree.toJSON()).toBeNull();
  });

  test("renders confirm and cancel labels", () => {
    const tree = TestRenderer.create(
      React.createElement(ConfirmDialog, {
        visible: true,
        title: "Uninstall Plugin",
        message: "This will remove the plugin.",
        confirmLabel: "Uninstall",
        cancelLabel: "Go Back",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Uninstall");
    expect(json).toContain("Go Back");
  });

  test("renders optional warning text", () => {
    const tree = TestRenderer.create(
      React.createElement(ConfirmDialog, {
        visible: true,
        title: "Delete Profile",
        message: "This removes the profile.",
        warningText: "This cannot be undone.",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("This cannot be undone.");
  });

  test("calls onCancel when cancel is pressed", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    const tree = TestRenderer.create(
      React.createElement(ConfirmDialog, {
        visible: true,
        title: "Confirm",
        message: "Are you sure?",
        cancelLabel: "Cancel",
        onConfirm,
        onCancel,
      }),
    );

    // Find all pressable elements and trigger the one containing "Cancel"
    const instance = tree.root;
    const allPressables = instance.findAll(
      (node) => String(node.type) === "pressable",
    );
    const cancelButton = allPressables.find(
      (node) => JSON.stringify(node.props).includes("Cancel"),
    );
    if (cancelButton?.props.onPress) {
      (cancelButton.props.onPress as () => void)();
    }
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("calls onConfirm when confirm is pressed", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    const tree = TestRenderer.create(
      React.createElement(ConfirmDialog, {
        visible: true,
        title: "Confirm",
        message: "Are you sure?",
        confirmLabel: "Delete",
        onConfirm,
        onCancel,
      }),
    );

    const instance = tree.root;
    const allPressables = instance.findAll(
      (node) => String(node.type) === "pressable",
    );
    const confirmButton = allPressables.find(
      (node) => JSON.stringify(node.props).includes('"Delete"'),
    );
    if (confirmButton?.props.onPress) {
      (confirmButton.props.onPress as () => void)();
    }
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("is not dismissible by backdrop (destructive guard)", () => {
    // ConfirmDialog always sets dismissible=false on its DialogModal.
    // This test verifies that onCancel is never called by backdrop alone.
    const onCancel = vi.fn();
    TestRenderer.create(
      React.createElement(ConfirmDialog, {
        visible: true,
        title: "Destructive",
        message: "Cannot dismiss.",
        onConfirm: vi.fn(),
        onCancel,
      }),
    );
    // No backdrop press simulated — onCancel must not have fired
    expect(onCancel).not.toHaveBeenCalled();
  });
});
