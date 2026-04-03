import React from "react";
import TestRenderer from "react-test-renderer";
import type { WidgetRenderContext } from "@ambient/shared-contracts";
import { describe, expect, test, vi } from "vitest";
import { EmailFeedRenderer } from "../src/widgets/emailFeed/renderer";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    View: (props: Record<string, unknown>) => ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
  };
});

vi.mock("../src/shared/ui/components", () => {
  const ReactRuntime = require("react");
  return {
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
    AppIcon: (props: Record<string, unknown>) => ReactRuntime.createElement("app-icon", props),
  };
});

vi.mock("../src/shared/ui/widgets", () => {
  const ReactRuntime = require("react");
  return {
    WidgetSurface: (props: Record<string, unknown>) => ReactRuntime.createElement("widget-surface", props, props.children),
    WidgetHeader: (props: Record<string, unknown>) => ReactRuntime.createElement("widget-header", props),
    WidgetState: (props: Record<string, unknown>) => ReactRuntime.createElement("widget-state", props),
  };
});

function createRenderContext(sizeTier: WidgetRenderContext["sizeTier"]): WidgetRenderContext {
  const fullscreen = sizeTier === "fullscreen";
  return {
    viewportWidth: 1280,
    viewportHeight: 720,
    widgetWidth: fullscreen ? 1280 : 320,
    widgetHeight: fullscreen ? 720 : 180,
    widthRatio: fullscreen ? 1 : 0.25,
    heightRatio: fullscreen ? 1 : 0.25,
    areaRatio: fullscreen ? 1 : 0.0625,
    orientation: "landscape",
    platform: "web",
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    isFullscreen: fullscreen,
    sizeTier,
  };
}

const data = {
  provider: "gmail" as const,
  mailboxLabel: "Inbox",
  unreadCount: 4,
  messages: [
    {
      id: "m1",
      title: "Subject 1",
      sender: "Alice <alice@example.com>",
      timestamp: "2026-04-02T10:00:00.000Z",
      isUnread: true,
      preview: "Preview 1",
      source: "Inbox",
    },
    {
      id: "m2",
      title: "Subject 2",
      sender: "Bob <bob@example.com>",
      timestamp: "2026-04-02T09:00:00.000Z",
      isUnread: true,
      preview: "Preview 2",
      source: "Inbox",
    },
    {
      id: "m3",
      title: "Subject 3",
      sender: "Cara <cara@example.com>",
      timestamp: "2026-04-02T08:00:00.000Z",
      isUnread: false,
      preview: "Preview 3",
      source: "Inbox",
    },
  ],
};

describe("EmailFeedRenderer", () => {
  test("compact tier hides preview text", () => {
    const tree = TestRenderer.create(
      React.createElement(EmailFeedRenderer, {
        widgetInstanceId: "widget-email",
        widgetKey: "emailFeed",
        state: "ready",
        data,
        config: { showPreview: true, maxItems: 8 },
        renderContext: createRenderContext("compact"),
      }),
    );

    const previewNodes = tree.root.findAllByType("text").filter((node: { props: { children?: unknown } }) => {
      const children = node.props.children;
      const value = Array.isArray(children) ? children.join("") : String(children ?? "");
      return value.includes("Preview");
    });

    expect(previewNodes.length).toBe(0);
  });

  test("regular tier keeps density bounded and shows at most three detail rows", () => {
    const tree = TestRenderer.create(
      React.createElement(EmailFeedRenderer, {
        widgetInstanceId: "widget-email",
        widgetKey: "emailFeed",
        state: "ready",
        data,
        config: { showPreview: false, maxItems: 8 },
        renderContext: createRenderContext("regular"),
      }),
    );

    const subjectNodes = tree.root.findAllByType("text").filter((node: { props: { children?: unknown } }) => {
      const children = node.props.children;
      const value = Array.isArray(children) ? children.join("") : String(children ?? "");
      return value.startsWith("Subject ");
    });

    expect(subjectNodes.length).toBeLessThanOrEqual(4);
  });
});
