import type {
  CalendarWidgetConfig,
  CreateWidgetInput,
  WidgetKey,
  WidgetConfigSchema,
  WeatherWidgetConfig,
} from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";

export const CREATABLE_WIDGET_TYPES = Object.keys(widgetBuiltinDefinitions) as WidgetKey[];
export type CreatableWidgetType = WidgetKey;
export type WeatherUnit = "metric" | "imperial";
export type CalendarProvider = "ical";
export type CalendarTimeWindow = "today" | "next24h" | "next7d";

function getEnumOptions(widgetKey: WidgetKey, field: string, fallback: readonly string[]) {
  const schema = widgetBuiltinDefinitions[widgetKey].configSchema as WidgetConfigSchema;
  const fieldSchema = schema[field];
  if (Array.isArray(fieldSchema)) {
    return fieldSchema;
  }
  return fallback;
}

export const WEATHER_UNITS = getEnumOptions("weather", "units", ["metric", "imperial"]) as readonly WeatherUnit[];
export const CALENDAR_PROVIDERS = getEnumOptions("calendar", "provider", ["ical"]) as readonly CalendarProvider[];
export const CALENDAR_TIME_WINDOWS = getEnumOptions("calendar", "timeWindow", ["today", "next24h", "next7d"]) as readonly CalendarTimeWindow[];

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

