interface SelectableWidget {
  id: string;
}

export function selectDisplayWidget<TWidget extends SelectableWidget>(
  widgets: TWidget[],
  previous: TWidget | null,
): TWidget | null {
  if (previous) {
    const stillExists = widgets.find((widget) => widget.id === previous.id);
    if (stillExists) {
      return stillExists;
    }
  }

  return widgets[0] ?? null;
}

export function getDisplayRefreshIntervalMs(
  widgetType: string | null | undefined,
): number | null {
  if (widgetType === "clockDate") {
    return 1000;
  }

  return null;
}
