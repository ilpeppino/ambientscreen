import React from "react";
import TestRenderer from "react-test-renderer";
import type { WidgetDataByKey, WidgetKey } from "@ambient/shared-contracts";
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
  function buildProps<TKey extends WidgetKey>(
    widgetKey: TKey,
    data: WidgetDataByKey[TKey] | null,
    state: "ready" | "stale" | "empty" | "error" = "ready",
  ) {
    return {
      widgetInstanceId: `test-${widgetKey}`,
      widgetKey,
      state,
      data,
      config: {},
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
});
