import type {
  CalendarWidgetConfig,
  CreateWidgetInput,
  WeatherWidgetConfig,
} from "@ambient/shared-contracts";

interface ActiveWidgetCandidate {
  id: string;
  isActive: boolean;
}

export const CREATABLE_WIDGET_TYPES = ["clockDate", "weather", "calendar"] as const;
export type CreatableWidgetType = (typeof CREATABLE_WIDGET_TYPES)[number];
export const WEATHER_UNITS = ["metric", "imperial"] as const;
export type WeatherUnit = (typeof WEATHER_UNITS)[number];
export const CALENDAR_PROVIDERS = ["ical"] as const;
export type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number];
export const CALENDAR_TIME_WINDOWS = ["today", "next24h", "next7d"] as const;
export type CalendarTimeWindow = (typeof CALENDAR_TIME_WINDOWS)[number];

export function buildCreateWidgetInput(input: {
  widgetType: CreatableWidgetType;
  weatherConfig: WeatherWidgetConfig;
  calendarConfig: CalendarWidgetConfig;
  profileId?: string;
}): CreateWidgetInput {
  const profileContext = input.profileId ? { profileId: input.profileId } : {};

  if (input.widgetType === "weather") {
    return {
      ...profileContext,
      type: "weather",
      config: input.weatherConfig,
    };
  }

  if (input.widgetType === "calendar") {
    return {
      ...profileContext,
      type: "calendar",
      config: input.calendarConfig,
    };
  }

  return {
    ...profileContext,
    type: input.widgetType,
  };
}

export function selectAdminActiveWidget<TWidget extends ActiveWidgetCandidate>(
  widgets: TWidget[],
): TWidget | null {
  return widgets.find((widget) => widget.isActive) ?? null;
}
