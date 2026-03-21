import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayLayoutResponse } from "../src/services/api/displayLayoutApi";
import {
  applyDragDelta,
  applyResizeDelta,
  computeLayoutFrame,
} from "../src/features/display/components/LayoutGrid.logic";
import { toWidgetEnvelope } from "../src/features/display/components/WidgetContainer.logic";

test("display layout widgets map into widget envelopes and frames", () => {
  const response: DisplayLayoutResponse = {
    widgets: [
      {
        widgetInstanceId: "clock-1",
        widgetKey: "clockDate",
        layout: { x: 0, y: 0, w: 6, h: 3 },
        state: "ready",
        config: {
          format: "24h",
          showSeconds: false,
          timezone: "local",
        },
        configSchema: {
          format: ["12h", "24h"],
          showSeconds: "boolean",
          timezone: "string",
        },
        data: {
          nowIso: "2026-03-21T10:00:00.000Z",
          formattedTime: "10:00",
          formattedDate: "21 March",
          weekdayLabel: "Saturday",
        },
        meta: {
          resolvedAt: "2026-03-21T10:00:00.000Z",
        },
      },
      {
        widgetInstanceId: "weather-1",
        widgetKey: "weather",
        layout: { x: 6, y: 0, w: 6, h: 3 },
        state: "error",
        config: {
          location: "Amsterdam",
          units: "metric",
        },
        configSchema: {
          location: "string",
          units: ["metric", "imperial"],
        },
        data: null,
        meta: {
          resolvedAt: "2026-03-21T10:00:01.000Z",
          message: "Provider unavailable",
        },
      },
    ],
  };

  const envelopes = response.widgets.map((widget) => toWidgetEnvelope(widget));
  assert.equal(envelopes.length, 2);
  assert.equal(envelopes[0].widgetKey, "clockDate");
  assert.equal(envelopes[1].widgetKey, "weather");

  const firstFrame = computeLayoutFrame({
    layout: response.widgets[0].layout,
    containerWidth: 1200,
    containerHeight: 600,
  });
  const secondFrame = computeLayoutFrame({
    layout: response.widgets[1].layout,
    containerWidth: 1200,
    containerHeight: 600,
  });

  assert.equal(firstFrame.left, 0);
  assert.equal(firstFrame.width, 600);
  assert.equal(secondFrame.left, 600);
  assert.equal(secondFrame.width, 600);
  assert.ok(firstFrame.left + firstFrame.width <= secondFrame.left);
});

test("edit -> save -> reload keeps widget layout changes", () => {
  const initialResponse: DisplayLayoutResponse = {
    widgets: [
      {
        widgetInstanceId: "clock-1",
        widgetKey: "clockDate",
        layout: { x: 0, y: 0, w: 2, h: 2 },
        state: "ready",
        config: {
          format: "24h",
          showSeconds: false,
          timezone: "local",
        },
        configSchema: {
          format: ["12h", "24h"],
          showSeconds: "boolean",
          timezone: "string",
        },
        data: {
          nowIso: "2026-03-21T10:00:00.000Z",
          formattedTime: "10:00",
          formattedDate: "21 March",
          weekdayLabel: "Saturday",
        },
        meta: { resolvedAt: "2026-03-21T10:00:00.000Z" },
      },
    ],
  };

  const dragged = applyDragDelta({
    layout: initialResponse.widgets[0].layout,
    deltaX: 4,
    deltaY: 2,
  });
  const resized = applyResizeDelta({
    layout: dragged,
    deltaX: 3,
    deltaY: 1,
  });

  const patchPayload = {
    widgets: [
      {
        id: initialResponse.widgets[0].widgetInstanceId,
        layout: resized,
      },
    ],
  };

  assert.deepEqual(patchPayload, {
    widgets: [
      {
        id: "clock-1",
        layout: { x: 4, y: 2, w: 5, h: 3 },
      },
    ],
  });

  const reloadedResponse: DisplayLayoutResponse = {
    widgets: [
      {
        ...initialResponse.widgets[0],
        layout: patchPayload.widgets[0].layout,
      },
    ],
  };

  assert.deepEqual(reloadedResponse.widgets[0].layout, { x: 4, y: 2, w: 5, h: 3 });
});
