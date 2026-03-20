import type { CreateWidgetInput, WeatherWidgetConfig } from "@ambient/shared-contracts";

interface ActiveWidgetCandidate {
  id: string;
  isActive: boolean;
}

export const CREATABLE_WIDGET_TYPES = ["clockDate", "weather", "calendar"] as const;
export type CreatableWidgetType = (typeof CREATABLE_WIDGET_TYPES)[number];
export const WEATHER_UNITS = ["metric", "imperial"] as const;
export type WeatherUnit = (typeof WEATHER_UNITS)[number];

export function buildCreateWidgetInput(input: {
  widgetType: CreatableWidgetType;
  weatherConfig: WeatherWidgetConfig;
}): CreateWidgetInput {
  if (input.widgetType === "weather") {
    return {
      type: "weather",
      config: input.weatherConfig,
    };
  }

  return {
    type: input.widgetType,
  };
}

export function selectAdminActiveWidget<TWidget extends ActiveWidgetCandidate>(
  widgets: TWidget[],
): TWidget | null {
  return widgets.find((widget) => widget.isActive) ?? null;
}
