import React from "react";
import TestRenderer from "react-test-renderer";
import type { WidgetDataByKey, WidgetKey, WidgetRenderContext } from "@ambient/shared-contracts";
import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");

  return {
    View: (props: Record<string, unknown>) => ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
    useWindowDimensions: () => ({ width: 1280, height: 720, scale: 1, fontScale: 1 }),
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
  };
});

vi.mock("../src/shared/ui/components", () => {
  const ReactRuntime = require("react");

  return {
    AppIcon: (props: Record<string, unknown>) => ReactRuntime.createElement("app-icon", props),
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
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

let ClockDateRenderer: typeof import("../src/widgets/clockDate/renderer").ClockDateRenderer;
let WeatherRenderer: typeof import("../src/widgets/weather/renderer").WeatherRenderer;
let CalendarRenderer: typeof import("../src/widgets/calendar/renderer").CalendarRenderer;

beforeAll(async () => {
  ClockDateRenderer = (await import("../src/widgets/clockDate/renderer")).ClockDateRenderer;
  WeatherRenderer = (await import("../src/widgets/weather/renderer")).WeatherRenderer;
  CalendarRenderer = (await import("../src/widgets/calendar/renderer")).CalendarRenderer;
});

describe("display widget renderers", () => {
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

  function findTextFontSize(tree: TestRenderer.ReactTestRenderer, label: string): number {
    const node = tree.root.findAllByType("text").find((candidate: { props: { children?: unknown } }) => {
      const children = candidate.props.children;
      const value = Array.isArray(children) ? children.join("") : children;
      return value === label;
    });

    const style = node?.props.style;
    if (Array.isArray(style)) {
      const fontStyles = style.filter((entry) => entry && typeof entry.fontSize === "number");
      const finalStyle = fontStyles[fontStyles.length - 1] as { fontSize?: number } | undefined;
      return Number(finalStyle?.fontSize ?? 0);
    }

    return Number(style?.fontSize ?? 0);
  }

  function findTextLineHeight(tree: TestRenderer.ReactTestRenderer, label: string): number {
    const node = tree.root.findAllByType("text").find((candidate: { props: { children?: unknown } }) => {
      const children = candidate.props.children;
      const value = Array.isArray(children) ? children.join("") : String(children ?? "");
      return value === label;
    });

    const style = node?.props.style;
    if (Array.isArray(style)) {
      const fontStyles = style.filter((entry) => entry && typeof entry.lineHeight === "number");
      const finalStyle = fontStyles[fontStyles.length - 1] as { lineHeight?: number } | undefined;
      return Number(finalStyle?.lineHeight ?? 0);
    }

    return Number(style?.lineHeight ?? 0);
  }

  function buildProps<TKey extends WidgetKey>(
    widgetKey: TKey,
    data: WidgetDataByKey[TKey] | null,
    state: "ready" | "stale" | "empty" | "error" = "ready",
    renderContext?: WidgetRenderContext,
  ) {
    return {
      widgetInstanceId: `test-${widgetKey}`,
      widgetKey,
      state,
      data,
      config: {},
      renderContext,
    };
  }

  test("renderers use shared WidgetHeader in display mode", () => {
    const tree = TestRenderer.create(
      React.createElement(ClockDateRenderer, {
        ...buildProps("clockDate", {
          nowIso: "2026-03-22T10:00:00.000Z",
          formattedTime: "10:00",
          formattedDate: "March 22",
          weekdayLabel: "Sunday",
        }),
      }),
    );

    const header = tree.root.findByType("widget-header" as any);
    expect(header.props.mode).toBe("display");
  });

  test("empty widget payloads render shared WidgetState", () => {
    const weather = TestRenderer.create(
      React.createElement(WeatherRenderer, {
        ...buildProps("weather", null),
      }),
    );

    const stateNode = weather.root.findByType("widget-state" as any);
    expect(stateNode.props.type).toBe("empty");
    expect(stateNode.props.compact).toBe(true);
  });

  test("calendar renderer limits content density for distance readability", () => {
    const tree = TestRenderer.create(
      React.createElement(CalendarRenderer, {
        ...buildProps("calendar", {
          upcomingCount: 5,
          events: [
            {
              id: "1",
              title: "Event 1",
              startIso: "2026-03-22T10:00:00.000Z",
              endIso: null,
              allDay: false,
              location: null,
            },
            {
              id: "2",
              title: "Event 2",
              startIso: "2026-03-22T11:00:00.000Z",
              endIso: null,
              allDay: false,
              location: null,
            },
            {
              id: "3",
              title: "Event 3",
              startIso: "2026-03-22T12:00:00.000Z",
              endIso: null,
              allDay: false,
              location: null,
            },
            {
              id: "4",
              title: "Event 4",
              startIso: "2026-03-22T13:00:00.000Z",
              endIso: null,
              allDay: false,
              location: null,
            },
          ],
        }),
      }),
    );

    const moreLabels = tree.root.findAllByType("text").filter((node: { props: { children?: unknown } }) => {
      const children = node.props.children;
      const textValue = Array.isArray(children) ? children.join("") : children;
      return typeof textValue === "string" && textValue.includes("more events");
    });

    expect(moreLabels.length).toBe(1);
  });

  test("renderer error states use shared WidgetState", () => {
    const tree = TestRenderer.create(
      React.createElement(ClockDateRenderer, {
        ...buildProps("clockDate", null, "error"),
      }),
    );

    const stateNode = tree.root.findByType("widget-state" as any);
    expect(stateNode.props.type).toBe("error");
    expect(stateNode.props.compact).toBe(true);
  });

  test("clockDate scales typography for fullscreen tier", () => {
    const compactTree = TestRenderer.create(
      React.createElement(ClockDateRenderer, {
        ...buildProps("clockDate", {
          nowIso: "2026-03-22T10:00:00.000Z",
          formattedTime: "10:00",
          formattedDate: "March 22",
          weekdayLabel: "Sunday",
        }, "ready", createRenderContext("compact")),
      }),
    );
    const fullscreenTree = TestRenderer.create(
      React.createElement(ClockDateRenderer, {
        ...buildProps("clockDate", {
          nowIso: "2026-03-22T10:00:00.000Z",
          formattedTime: "10:00",
          formattedDate: "March 22",
          weekdayLabel: "Sunday",
        }, "ready", createRenderContext("fullscreen")),
      }),
    );

    expect(findTextFontSize(fullscreenTree, "10:00")).toBeGreaterThan(findTextFontSize(compactTree, "10:00"));
  });

  test("weather scales icon size for fullscreen tier", () => {
    const compactTree = TestRenderer.create(
      React.createElement(WeatherRenderer, {
        ...buildProps("weather", {
          location: "Amsterdam",
          temperatureC: 8.1,
          conditionLabel: "Rain",
          forecast: [],
        }, "ready", createRenderContext("compact")),
      }),
    );
    const fullscreenTree = TestRenderer.create(
      React.createElement(WeatherRenderer, {
        ...buildProps("weather", {
          location: "Amsterdam",
          temperatureC: 8.1,
          conditionLabel: "Rain",
          forecast: [],
        }, "ready", createRenderContext("fullscreen")),
      }),
    );

    const compactIcon = compactTree.root.findAllByType("app-icon" as any)[0];
    const fullscreenIcon = fullscreenTree.root.findAllByType("app-icon" as any)[0];

    expect(compactIcon.props.size).toBe("md");
    expect(fullscreenIcon.props.size).toBe("xl");
  });

  test("calendar scales event typography for fullscreen tier", () => {
    const data = {
      upcomingCount: 2,
      events: [
        {
          id: "1",
          title: "Team Standup",
          startIso: "2026-03-22T10:00:00.000Z",
          endIso: null,
          allDay: false,
          location: null,
        },
      ],
    };
    const compactTree = TestRenderer.create(
      React.createElement(CalendarRenderer, {
        ...buildProps("calendar", data, "ready", createRenderContext("compact")),
      }),
    );
    const fullscreenTree = TestRenderer.create(
      React.createElement(CalendarRenderer, {
        ...buildProps("calendar", data, "ready", createRenderContext("fullscreen")),
      }),
    );

    expect(findTextFontSize(fullscreenTree, "Team Standup")).toBeGreaterThan(findTextFontSize(compactTree, "Team Standup"));
  });

  test("clockDate fullscreen time is rendered at hero scale", () => {
    const tree = TestRenderer.create(
      React.createElement(ClockDateRenderer, {
        ...buildProps("clockDate", {
          nowIso: "2026-03-22T10:00:00.000Z",
          formattedTime: "10:00",
          formattedDate: "March 22",
          weekdayLabel: "Sunday",
        }, "ready", createRenderContext("fullscreen")),
      }),
    );

    // For a 720px-tall fullscreen widget (widgetHeight * 0.32 = 230px), time must be >> base 36px
    expect(findTextFontSize(tree, "10:00")).toBeGreaterThanOrEqual(100);
    expect(findTextLineHeight(tree, "10:00")).toBeGreaterThan(findTextFontSize(tree, "10:00"));
  });

  test("weather fullscreen temperature is rendered at hero scale", () => {
    const tree = TestRenderer.create(
      React.createElement(WeatherRenderer, {
        ...buildProps("weather", {
          location: "Amsterdam",
          temperatureC: 8.1,
          conditionLabel: "Rain",
          forecast: [],
        }, "ready", createRenderContext("fullscreen")),
      }),
    );

    // For a 720px-tall fullscreen widget (widgetHeight * 0.34 = 244px), temperature must be >> base 44px
    const tempNode = tree.root.findAllByType("text").find((node: { props: { children?: unknown } }) => {
      const children = node.props.children;
      const value = Array.isArray(children) ? children.join("") : String(children ?? "");
      return value === "8.1";
    });
    const tempStyle = tempNode?.props.style;
    let tempFontSize = 0;
    if (Array.isArray(tempStyle)) {
      const fontStyles = (tempStyle as Array<Record<string, unknown> | null>).filter((entry) => entry && typeof entry.fontSize === "number");
      const finalStyle = fontStyles[fontStyles.length - 1] as { fontSize?: number } | undefined;
      tempFontSize = Number(finalStyle?.fontSize ?? 0);
    }
    expect(tempFontSize).toBeGreaterThanOrEqual(100);
    expect(findTextLineHeight(tree, "8.1")).toBeGreaterThan(tempFontSize);
  });

  test("BaseWidgetFrame uses fullscreen surface mode for fullscreen tier", () => {
    const tree = TestRenderer.create(
      React.createElement(ClockDateRenderer, {
        ...buildProps("clockDate", {
          nowIso: "2026-03-22T10:00:00.000Z",
          formattedTime: "10:00",
          formattedDate: "March 22",
          weekdayLabel: "Sunday",
        }, "ready", createRenderContext("fullscreen")),
      }),
    );

    const surface = tree.root.findByType("widget-surface" as any);
    expect(surface.props.mode).toBe("fullscreen");
  });

  test("BaseWidgetFrame uses default display mode for compact tier", () => {
    const tree = TestRenderer.create(
      React.createElement(ClockDateRenderer, {
        ...buildProps("clockDate", {
          nowIso: "2026-03-22T10:00:00.000Z",
          formattedTime: "10:00",
          formattedDate: "March 22",
          weekdayLabel: "Sunday",
        }, "ready", createRenderContext("compact")),
      }),
    );

    const surface = tree.root.findByType("widget-surface" as any);
    expect(surface.props.mode).toBe("display");
  });

  // ── Canonical three-region and spacing tests ────────────────────────────────

  test("clockDate fullscreen support gap is proportionally larger than compact gap", () => {
    const clockData = {
      nowIso: "2026-03-22T10:00:00.000Z",
      formattedTime: "10:00",
      formattedDate: "March 22",
      weekdayLabel: "Sunday",
    };

    // Both trees render successfully — spacing is validated via snapshot-style
    // presence check.  Numerical assertions on style props are performed below.
    const fullscreenTree = TestRenderer.create(
      React.createElement(ClockDateRenderer, {
        ...buildProps("clockDate", clockData, "ready", createRenderContext("fullscreen")),
      }),
    );
    const compactTree = TestRenderer.create(
      React.createElement(ClockDateRenderer, {
        ...buildProps("clockDate", clockData, "ready", createRenderContext("compact")),
      }),
    );

    // Find the metaGroup view (the support region) and return its effective marginTop.
    // React Native applies the LAST matching style in an array, so we scan the full
    // style array and keep the last marginTop value before returning.
    function findMetaGroupMarginTop(tree: TestRenderer.ReactTestRenderer): number {
      const views = tree.root.findAllByType("view");
      for (const v of views) {
        const style = v.props.style;
        const styleArr = Array.isArray(style) ? style : [style];
        let hasGap = false;
        let lastMarginTop = -1;
        for (const s of styleArr) {
          if (s && typeof s.marginTop === "number") {
            lastMarginTop = s.marginTop;
          }
          if (s && s.gap !== undefined) {
            hasGap = true;
          }
        }
        if (hasGap && lastMarginTop > 0) {
          return lastMarginTop;
        }
      }
      return 0;
    }

    const fullscreenGap = findMetaGroupMarginTop(fullscreenTree);
    const compactGap = findMetaGroupMarginTop(compactTree);

    // Fullscreen heroSupportGap = widgetHeight * 0.065 = 46.8 ≈ 47
    // Compact uses spacing.xs = 4
    expect(fullscreenGap).toBeGreaterThan(compactGap);
    expect(fullscreenGap).toBeGreaterThanOrEqual(40);
  });

  test("calendar fullscreen renders first event as hero region", () => {
    const calData = {
      upcomingCount: 3,
      events: [
        {
          id: "1",
          title: "Product Launch",
          startIso: "2026-03-22T10:00:00.000Z",
          endIso: null,
          allDay: false,
          location: "Conference Room A",
        },
        {
          id: "2",
          title: "Team Retrospective",
          startIso: "2026-03-22T14:00:00.000Z",
          endIso: null,
          allDay: false,
          location: null,
        },
        {
          id: "3",
          title: "Client Sync",
          startIso: "2026-03-22T16:00:00.000Z",
          endIso: null,
          allDay: false,
          location: null,
        },
      ],
    };

    const fullscreenTree = TestRenderer.create(
      React.createElement(CalendarRenderer, {
        ...buildProps("calendar", calData, "ready", createRenderContext("fullscreen")),
      }),
    );

    // The hero title "Product Launch" must be present.
    const heroTitleNodes = fullscreenTree.root.findAllByType("text").filter(
      (node: { props: { children?: unknown } }) => {
        const children = node.props.children;
        const value = Array.isArray(children) ? children.join("") : children;
        return value === "Product Launch";
      },
    );
    expect(heroTitleNodes.length).toBeGreaterThanOrEqual(1);

    // The hero title must be rendered at a large font size (≥ 50 px for 720 px height).
    const heroFontSize = findTextFontSize(fullscreenTree, "Product Launch");
    expect(heroFontSize).toBeGreaterThanOrEqual(50);
  });

  test("calendar fullscreen remaining events appear in detail region", () => {
    const calData = {
      upcomingCount: 3,
      events: [
        {
          id: "1",
          title: "First Event",
          startIso: "2026-03-22T09:00:00.000Z",
          endIso: null,
          allDay: false,
          location: null,
        },
        {
          id: "2",
          title: "Second Event",
          startIso: "2026-03-22T11:00:00.000Z",
          endIso: null,
          allDay: false,
          location: null,
        },
        {
          id: "3",
          title: "Third Event",
          startIso: "2026-03-22T14:00:00.000Z",
          endIso: null,
          allDay: false,
          location: null,
        },
      ],
    };

    const fullscreenTree = TestRenderer.create(
      React.createElement(CalendarRenderer, {
        ...buildProps("calendar", calData, "ready", createRenderContext("fullscreen")),
      }),
    );

    // Both the hero (first event) and remaining events must be visible.
    const heroTitle = fullscreenTree.root.findAllByType("text").filter(
      (node: { props: { children?: unknown } }) => {
        const children = node.props.children;
        const value = Array.isArray(children) ? children.join("") : children;
        return value === "First Event";
      },
    );
    const detailTitle = fullscreenTree.root.findAllByType("text").filter(
      (node: { props: { children?: unknown } }) => {
        const children = node.props.children;
        const value = Array.isArray(children) ? children.join("") : children;
        return value === "Second Event";
      },
    );

    expect(heroTitle.length).toBe(1);
    expect(detailTitle.length).toBe(1);
  });

  test("weather fullscreen hero-to-support gap is height-proportional", () => {
    const weatherData = {
      location: "Amsterdam",
      temperatureC: 8.1,
      conditionLabel: "Rain",
      forecast: [],
    };

    const fullscreenTree = TestRenderer.create(
      React.createElement(WeatherRenderer, {
        ...buildProps("weather", weatherData, "ready", createRenderContext("fullscreen")),
      }),
    );
    const compactTree = TestRenderer.create(
      React.createElement(WeatherRenderer, {
        ...buildProps("weather", weatherData, "ready", createRenderContext("compact")),
      }),
    );

    // Find the location Text node's effective marginTop.
    // React Native applies the LAST matching style in an array, so we scan the
    // full style array and keep the last marginTop to get the inline override.
    function findLocationMarginTop(tree: TestRenderer.ReactTestRenderer): number {
      const textNodes = tree.root.findAllByType("text");
      for (const node of textNodes) {
        const children = node.props.children;
        const value = Array.isArray(children) ? children.join("") : children;
        if (value === "Amsterdam") {
          const styleArr = Array.isArray(node.props.style) ? node.props.style : [node.props.style];
          let lastMarginTop = 0;
          for (const s of styleArr) {
            if (s && typeof s.marginTop === "number") {
              lastMarginTop = s.marginTop;
            }
          }
          return lastMarginTop;
        }
      }
      return 0;
    }

    const fullscreenMargin = findLocationMarginTop(fullscreenTree);
    const compactMargin = findLocationMarginTop(compactTree);

    // Fullscreen heroSupportGap ≈ 720 * 0.065 = 46.8 ≈ 47
    // Compact: scaleBy(8, 0.84, 4) = 7
    expect(fullscreenMargin).toBeGreaterThan(compactMargin);
    expect(fullscreenMargin).toBeGreaterThanOrEqual(40);
  });
});
