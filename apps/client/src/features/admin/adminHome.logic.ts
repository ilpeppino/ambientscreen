interface ActiveWidgetCandidate {
  id: string;
  isActive: boolean;
}

export function selectAdminActiveWidget<TWidget extends ActiveWidgetCandidate>(
  widgets: TWidget[],
): TWidget | null {
  return widgets.find((widget) => widget.isActive) ?? null;
}
