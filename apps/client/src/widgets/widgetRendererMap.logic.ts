import type { WidgetKey } from "@ambient/shared-contracts";
import { getWidgetPlugin } from "./pluginRegistry";

export type WidgetRendererKind = "clockDate" | "weather" | "calendar" | "rssNews" | "tasks" | "emailFeed";

export function resolveWidgetRendererKind(widgetKey: WidgetKey): WidgetRendererKind {
  const plugin = getWidgetPlugin(widgetKey);
  return (plugin?.manifest.key ?? "calendar") as WidgetRendererKind;
}
