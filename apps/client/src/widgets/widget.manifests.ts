import type { WidgetKey, WidgetManifest, WidgetRefreshPolicy } from "@ambient/shared-contracts";

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

export function formatRefreshIntervalLabel(intervalMs: number | null): string {
  if (intervalMs === null) {
    return "manual refresh";
  }

  if (intervalMs < 60000) {
    return `every ${Math.floor(intervalMs / 1000)}s`;
  }

  return `every ${Math.floor(intervalMs / 60000)}m`;
}
