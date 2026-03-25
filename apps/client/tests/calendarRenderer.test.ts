import React from "react";
import TestRenderer from "react-test-renderer";
import { beforeAll, describe, expect, test, vi } from "vitest";
import type { CalendarWidgetData } from "@ambient/shared-contracts";

vi.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    View: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("text", props, props.children),
    StyleSheet: {
      create: <T extends Record<string, unknown>>(s: T) => s,
    },
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

let CalendarRenderer: typeof import("../src/widgets/calendar/renderer").CalendarRenderer;

beforeAll(async () => {
  CalendarRenderer = (await import("../src/widgets/calendar/renderer")).CalendarRenderer;
});

function baseProps(
  data: CalendarWidgetData | null,
  state: "ready" | "empty" | "error" | "stale" = "ready",
) {
  return {
    widgetInstanceId: "test-calendar",
    widgetKey: "calendar" as const,
    state,
    data,
    config: {},
  };
}

describe("CalendarRenderer", () => {
  test("ready state with events renders event list", () => {
    const data: CalendarWidgetData = {
      upcomingCount: 2,
      events: [
        {
          id: "1",
          title: "Team Standup",
          startIso: "2026-03-26T09:00:00.000Z",
          endIso: "2026-03-26T09:30:00.000Z",
          allDay: false,
          location: null,
        },
        {
          id: "2",
          title: "Design Review",
          startIso: "2026-03-26T14:00:00.000Z",
          endIso: "2026-03-26T15:00:00.000Z",
          allDay: false,
          location: "Room B",
        },
      ],
    };

    const tree = TestRenderer.create(
      React.createElement(CalendarRenderer, baseProps(data)),
    );

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) => n.props.children)
      .filter(Boolean);

    const flat = texts.map((t) =>
      Array.isArray(t) ? t.join("") : String(t),
    );

    expect(flat.some((t) => t.includes("Team Standup"))).toBe(true);
    expect(flat.some((t) => t.includes("Design Review"))).toBe(true);
  });

  test("empty state renders shared WidgetState with empty type", () => {
    const tree = TestRenderer.create(
      React.createElement(CalendarRenderer, baseProps(null, "empty")),
    );

    const stateNode = tree.root.findByType("widget-state" as unknown as React.ElementType);
    expect(stateNode.props.type).toBe("empty");
  });

  test("error state renders shared WidgetState with error type", () => {
    const tree = TestRenderer.create(
      React.createElement(CalendarRenderer, baseProps(null, "error")),
    );

    const stateNode = tree.root.findByType("widget-state" as unknown as React.ElementType);
    expect(stateNode.props.type).toBe("error");
  });

  test("all-day event renders 'All day' label instead of time", () => {
    const data: CalendarWidgetData = {
      upcomingCount: 1,
      events: [
        {
          id: "1",
          title: "Company Holiday",
          startIso: "2026-03-26T00:00:00.000Z",
          endIso: null,
          allDay: true,
          location: null,
        },
      ],
    };

    const tree = TestRenderer.create(
      React.createElement(CalendarRenderer, baseProps(data)),
    );

    const texts = tree.root
      .findAllByType("text")
      .map((n: { props: { children?: unknown } }) =>
        Array.isArray(n.props.children)
          ? n.props.children.join("")
          : String(n.props.children ?? ""),
      );

    expect(texts.some((t) => t === "All day")).toBe(true);
  });

  test("overflow events show '+N more events' label", () => {
    const events = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      title: `Event ${i}`,
      startIso: "2026-03-26T09:00:00.000Z",
      endIso: null,
      allDay: false,
      location: null,
    }));

    const tree = TestRenderer.create(
      React.createElement(CalendarRenderer, baseProps({ upcomingCount: 5, events })),
    );

    const moreTexts = tree.root
      .findAllByType("text")
      .filter((n: { props: { children?: unknown } }) => {
        const c = n.props.children;
        const s = Array.isArray(c) ? c.join("") : String(c ?? "");
        return s.includes("more events");
      });

    expect(moreTexts.length).toBe(1);
  });

  test("BaseWidgetFrame receives title=Calendar and icon=calendar", () => {
    const tree = TestRenderer.create(
      React.createElement(CalendarRenderer, baseProps(null, "empty")),
    );

    const header = tree.root.findByType("widget-header" as unknown as React.ElementType);
    expect(header.props.title).toBe("Calendar");
    expect(header.props.icon).toBe("calendar");
  });
});
