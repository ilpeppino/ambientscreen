import type { WidgetKey } from "@ambient/shared-contracts";

interface SelectableWidget {
  id: string;
  isActive: boolean;
}

export function selectDisplayWidget<TWidget extends SelectableWidget>(
  widgets: TWidget[],
  previous: TWidget | null,
): TWidget | null {
  const activeWidget = widgets.find((widget) => widget.isActive);
  if (activeWidget) {
    return activeWidget;
  }

  if (previous) {
    const stillExists = widgets.find((widget) => widget.id === previous.id);
    if (stillExists) {
      return stillExists;
    }
  }

  return widgets[0] ?? null;
}

export function getDisplayRefreshIntervalMs(
  widgetType: WidgetKey | null | undefined,
): number | null {
  if (widgetType === "clockDate") {
    return 1000;
  }

  if (widgetType === "weather") {
    return 300000;
  }

  if (widgetType === "calendar") {
    return 60000;
  }

  return null;
}
