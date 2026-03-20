import React from "react";
import type {
  WidgetDataByKey,
  WidgetDataEnvelope,
  WidgetKey,
  WidgetManifest,
  WidgetRefreshPolicy,
} from "@ambient/shared-contracts";
import { CalendarRenderer } from "./calendar/renderer";
import { ClockDateRenderer } from "./clockDate/renderer";
import { WeatherRenderer } from "./weather/renderer";

type WidgetEnvelope =
  | WidgetDataEnvelope<WidgetDataByKey["clockDate"], "clockDate">
  | WidgetDataEnvelope<WidgetDataByKey["weather"], "weather">
  | WidgetDataEnvelope<WidgetDataByKey["calendar"], "calendar">;

const refreshPolicyByWidget: { [TKey in WidgetKey]: WidgetRefreshPolicy } = {
  clockDate: { intervalMs: 1000 },
  weather: { intervalMs: 300000 },
  calendar: { intervalMs: 60000 },
};

export const widgetManifests: { [TKey in WidgetKey]: WidgetManifest<TKey> } = {
  clockDate: {
    key: "clockDate",
    name: "Clock & Date",
    refreshPolicy: refreshPolicyByWidget.clockDate,
  },
  weather: {
    key: "weather",
    name: "Weather",
    refreshPolicy: refreshPolicyByWidget.weather,
  },
  calendar: {
    key: "calendar",
    name: "Calendar",
    refreshPolicy: refreshPolicyByWidget.calendar,
  },
};

export function getWidgetRefreshIntervalMs(widgetKey: WidgetKey | null | undefined): number | null {
  if (!widgetKey) {
    return null;
  }

  return widgetManifests[widgetKey].refreshPolicy.intervalMs;
}

export function renderWidgetFromEnvelope(envelope: WidgetEnvelope) {
  if (envelope.widgetKey === "clockDate") {
    return <ClockDateRenderer data={envelope.data} />;
  }

  if (envelope.widgetKey === "weather") {
    return <WeatherRenderer data={envelope.data} />;
  }

  return <CalendarRenderer data={envelope.data} />;
}
