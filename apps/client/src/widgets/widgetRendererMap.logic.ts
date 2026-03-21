import type { WidgetKey } from "@ambient/shared-contracts";

export type WidgetRendererKind = "clockDate" | "weather" | "calendar";

export function resolveWidgetRendererKind(widgetKey: WidgetKey): WidgetRendererKind {
  if (widgetKey === "clockDate") {
    return "clockDate";
  }

  if (widgetKey === "weather") {
    return "weather";
  }

  return "calendar";
}
