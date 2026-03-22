import type { WidgetKey, WidgetPluginManifest } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";

export const widgetManifests = Object.values(widgetBuiltinDefinitions).reduce((accumulator, definition) => {
  accumulator[definition.manifest.key] = definition.manifest;
  return accumulator;
}, {} as Record<WidgetKey, WidgetPluginManifest<WidgetKey>>);

export function getWidgetRefreshIntervalMs(widgetKey: WidgetKey | null | undefined): number | null {
  if (!widgetKey) {
    return null;
  }

  return widgetManifests[widgetKey]?.refreshPolicy.intervalMs ?? null;
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
