interface ActiveWidgetCandidate {
  id: string;
  isActive: boolean;
}

export const CREATABLE_WIDGET_TYPES = ["clockDate", "weather", "calendar"] as const;
export type CreatableWidgetType = (typeof CREATABLE_WIDGET_TYPES)[number];

export function selectAdminActiveWidget<TWidget extends ActiveWidgetCandidate>(
  widgets: TWidget[],
): TWidget | null {
  return widgets.find((widget) => widget.isActive) ?? null;
}
