import React from "react";
import TestRenderer from "react-test-renderer";
import { beforeAll, describe, expect, test, vi } from "vitest";
import type { RssNewsWidgetData, WidgetRenderContext } from "@ambient/shared-contracts";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    View: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("text", props, props.children),
    ImageBackground: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("image-background", props, props.children),
    StyleSheet: {
      create: <T extends Record<string, unknown>>(s: T) => s,
    },
  };
});

vi.mock("expo-linear-gradient", () => {
  const ReactRuntime = require("react");
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("linear-gradient", props, props.children),
  };
});

vi.mock("../src/shared/ui/components", () => {
  const ReactRuntime = require("react");
  return {
    AppIcon: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("app-icon", props),
    Text: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("text", props, props.children),
  };
});

vi.mock("../src/shared/ui/widgets", () => {
  const ReactRuntime = require("react");
  return {
    WidgetSurface: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("widget-surface", props, props.children),
    WidgetHeader: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("widget-header", props),
    WidgetState: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("widget-state", props),
  };
});

let RssNewsRenderer: typeof import("../src/widgets/rssNews/renderer").RssNewsRenderer;

beforeAll(async () => {
  RssNewsRenderer = (await import("../src/widgets/rssNews/renderer")).RssNewsRenderer;
});

function baseProps(
  data: RssNewsWidgetData | null,
  state: "ready" | "empty" | "error" | "stale" = "ready",
  renderContext?: WidgetRenderContext,
) {
  return {
    widgetInstanceId: "test-rss",
    widgetKey: "rssNews" as const,
    state,
    data,
    config: {
      feedUrl: "https://news.example.com/rss.xml",
      maxItems: 5,
      showImages: true,
      showPublishedAt: true,
      layout: "headline-list" as const,
      title: "Latest News",
    },
    renderContext,
  };
}

function createRenderContext(sizeTier: WidgetRenderContext["sizeTier"]): WidgetRenderContext {
  const fullscreen = sizeTier === "fullscreen";
  // Large widgets need meaningful height to fit multiple detail rows.
  const large = sizeTier === "large";
  const widgetWidth = fullscreen || large ? 1280 : 320;
  const widgetHeight = fullscreen ? 720 : large ? 400 : 180;
  return {
    viewportWidth: 1280,
    viewportHeight: 720,
    widgetWidth,
    widgetHeight,
    widthRatio: widgetWidth / 1280,
    heightRatio: widgetHeight / 720,
    areaRatio: (widgetWidth / 1280) * (widgetHeight / 720),
    orientation: "landscape",
    platform: "web",
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    isFullscreen: fullscreen,
    sizeTier,
  };
}

describe("RssNewsRenderer", () => {
  test("renders headline content in ready state", () => {
    const data: RssNewsWidgetData = {
      title: "Latest News",
      siteTitle: "Example News",
      feedUrl: "https://news.example.com/rss.xml",
      items: [
        {
          id: "1",
          title: "Top story",
          link: "https://news.example.com/1",
          summary: "Summary",
          publishedAt: "2026-03-27T10:00:00.000Z",
          imageUrl: "https://cdn.example.com/1.jpg",
        },
        {
          id: "2",
          title: "Second story",
          link: "https://news.example.com/2",
          publishedAt: "2026-03-27T09:00:00.000Z",
        },
      ],
    };

    const tree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(data, "ready", createRenderContext("regular"))),
    );

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) =>
        Array.isArray(n.props.children)
          ? n.props.children.join("")
          : String(n.props.children ?? ""),
      );

    expect(texts.some((text) => text.includes("Top story"))).toBe(true);
    expect(texts.some((text) => text.includes("Second story"))).toBe(true);
  });

  test("density adapts across fullscreen, large, and regular tiers", () => {
    const data: RssNewsWidgetData = {
      title: "Latest News",
      siteTitle: "Example News",
      feedUrl: "https://news.example.com/rss.xml",
      items: [
        { id: "1", title: "Hero", link: "https://news.example.com/1", publishedAt: "2026-03-27T10:00:00.000Z" },
        { id: "2", title: "Detail 1", link: "https://news.example.com/2" },
        { id: "3", title: "Detail 2", link: "https://news.example.com/3" },
        { id: "4", title: "Detail 3", link: "https://news.example.com/4" },
        { id: "5", title: "Detail 4", link: "https://news.example.com/5" },
      ],
    };

    const fullscreenTree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(data, "ready", createRenderContext("fullscreen"))),
    );
    const largeTree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(data, "ready", createRenderContext("large"))),
    );
    const regularTree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(data, "ready", createRenderContext("regular"))),
    );

    const fullscreenTexts = fullscreenTree.root.findAllByType("text").map((n) => {
      const children = (n as { props: { children?: unknown } }).props.children;
      return Array.isArray(children) ? children.join("") : String(children ?? "");
    });
    const largeTexts = largeTree.root.findAllByType("text").map((n) => {
      const children = (n as { props: { children?: unknown } }).props.children;
      return Array.isArray(children) ? children.join("") : String(children ?? "");
    });
    const regularTexts = regularTree.root.findAllByType("text").map((n) => {
      const children = (n as { props: { children?: unknown } }).props.children;
      return Array.isArray(children) ? children.join("") : String(children ?? "");
    });

    // Fullscreen uses large fonts + timestamps, fitting 2 rows; large (400 px) uses
    // smaller per-row height with no timestamps, fitting all 3 tier-allowed rows.
    expect(fullscreenTexts.some((value) => value.includes("Detail 2"))).toBe(true);
    expect(largeTexts.some((value) => value.includes("Detail 3"))).toBe(true);
    expect(regularTexts.some((value) => value.includes("Detail 3"))).toBe(false);
  });

  test("compact tier trims detail aggressively", () => {
    const data: RssNewsWidgetData = {
      title: "Latest News",
      siteTitle: "Example News",
      feedUrl: "https://news.example.com/rss.xml",
      items: [
        { id: "1", title: "Hero", link: "https://news.example.com/1" },
        { id: "2", title: "Detail 1", link: "https://news.example.com/2" },
        { id: "3", title: "Detail 2", link: "https://news.example.com/3" },
      ],
    };

    const compactTree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(data, "ready", createRenderContext("compact"))),
    );
    const compactTexts = compactTree.root.findAllByType("text").map((n) => {
      const children = (n as { props: { children?: unknown } }).props.children;
      return Array.isArray(children) ? children.join("") : String(children ?? "");
    });

    expect(compactTexts.some((value) => value.includes("Detail 1"))).toBe(false);
    expect(compactTexts.some((value) => value.includes("Detail 2"))).toBe(false);
  });

  test("empty state uses shared WidgetState empty type", () => {
    const tree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(null, "empty")),
    );

    const stateNode = tree.root.findByType("widget-state" as unknown as React.ElementType);
    expect(stateNode.props.type).toBe("empty");
  });

  test("error state uses shared WidgetState error type", () => {
    const tree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(null, "error")),
    );

    const stateNode = tree.root.findByType("widget-state" as unknown as React.ElementType);
    expect(stateNode.props.type).toBe("error");
  });

  test("snapshot: with image", () => {
    const data: RssNewsWidgetData = {
      title: "Latest News",
      siteTitle: "Example News",
      feedUrl: "https://news.example.com/rss.xml",
      items: [
        {
          id: "1",
          title: "Top story",
          link: "https://news.example.com/1",
          publishedAt: "2026-03-27T10:00:00.000Z",
          imageUrl: "https://cdn.example.com/1.jpg",
        },
        {
          id: "2",
          title: "Second story",
          link: "https://news.example.com/2",
          publishedAt: "2026-03-27T09:00:00.000Z",
        },
      ],
    };

    const tree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(data, "ready", createRenderContext("fullscreen"))),
    );

    expect(tree.toJSON()).toMatchSnapshot();
  });

  test("snapshot: without image", () => {
    const data: RssNewsWidgetData = {
      title: "Latest News",
      siteTitle: "Example News",
      feedUrl: "https://news.example.com/rss.xml",
      items: [
        {
          id: "1",
          title: "Top story",
          link: "https://news.example.com/1",
          publishedAt: "2026-03-27T10:00:00.000Z",
        },
      ],
    };

    const tree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(data, "ready", createRenderContext("regular"))),
    );

    expect(tree.toJSON()).toMatchSnapshot();
  });

  test("handles missing timestamps and missing images gracefully", () => {
    const data: RssNewsWidgetData = {
      title: "Latest News",
      siteTitle: "Example News",
      feedUrl: "https://news.example.com/rss.xml",
      items: [
        {
          id: "1",
          title: "Top story",
          link: "https://news.example.com/1",
        },
      ],
    };

    const tree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(data, "ready", createRenderContext("regular"))),
    );

    const images = tree.root.findAllByType("image-background" as unknown as React.ElementType);
    expect(images).toHaveLength(0);
  });

  test("long headline is clamped and does not overflow region", () => {
    const data: RssNewsWidgetData = {
      title: "Latest News",
      siteTitle: "Example News",
      feedUrl: "https://news.example.com/rss.xml",
      items: [
        {
          id: "1",
          title: "This is an intentionally very long breaking headline that should clamp safely within the hero region",
          link: "https://news.example.com/1",
        },
      ],
    };

    const tree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(data, "ready", createRenderContext("regular"))),
    );
    const longHeadlineNode = tree.root.findAllByType("text").find((node) => {
      const children = (node as { props: { children?: unknown } }).props.children;
      const value = Array.isArray(children) ? children.join("") : String(children ?? "");
      return value.includes("intentionally very long breaking headline");
    }) as { props?: { numberOfLines?: number } } | undefined;

    expect(longHeadlineNode?.props?.numberOfLines).toBe(2);
  });

  test("handles empty items list as empty widget state", () => {
    const data: RssNewsWidgetData = {
      title: "Latest News",
      siteTitle: "Example News",
      feedUrl: "https://news.example.com/rss.xml",
      items: [],
    };

    const tree = TestRenderer.create(
      React.createElement(RssNewsRenderer, baseProps(data, "empty", createRenderContext("regular"))),
    );

    const stateNode = tree.root.findByType("widget-state" as unknown as React.ElementType);
    expect(stateNode.props.type).toBe("empty");
  });
});
