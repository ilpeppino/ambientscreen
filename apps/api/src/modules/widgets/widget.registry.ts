import type {
  WidgetConfigByKey,
  WidgetConfigFieldSchema,
  WidgetConfigSchema,
  WidgetKey,
} from "@ambient/shared-contracts";

export const widgetRegistry = {
  clockDate: {
    key: "clockDate",
    name: "Clock & Date",
    defaultConfig: {
      format: "24h",
      showSeconds: false,
      timezone: "local",
    },
    configSchema: {
      format: ["12h", "24h"] as const,
      showSeconds: "boolean" as const,
      timezone: "string" as const,
    },
  },
  weather: {
    key: "weather",
    name: "Weather",
    defaultConfig: {
      location: "Amsterdam",
      units: "metric",
    },
    configSchema: {
      location: "string" as const,
      units: ["metric", "imperial"] as const,
    },
  },
  calendar: {
    key: "calendar",
    name: "Calendar",
    defaultConfig: {
      provider: "ical",
      account: "",
      timeWindow: "next7d",
      maxEvents: 10,
      includeAllDay: true,
    },
    configSchema: {
      provider: ["ical"] as const,
      account: "string" as const,
      timeWindow: ["today", "next24h", "next7d"] as const,
      maxEvents: "number" as const,
      includeAllDay: "boolean" as const,
    },
  },
} satisfies {
  [TKey in WidgetKey]: {
    key: TKey;
    name: string;
    defaultConfig: WidgetConfigByKey[TKey];
    configSchema: WidgetConfigSchema;
  };
};

export type SupportedWidgetType = WidgetKey;
export type SupportedWidgetConfig = WidgetConfigByKey[SupportedWidgetType];
export type SupportedWidgetConfigSchema = WidgetConfigSchema;
export type SupportedWidgetConfigFieldSchema = WidgetConfigFieldSchema;

export const SUPPORTED_WIDGET_TYPES = Object.keys(widgetRegistry) as SupportedWidgetType[];

export function getWidgetConfigSchema(widgetType: SupportedWidgetType): WidgetConfigSchema {
  return widgetRegistry[widgetType].configSchema;
}

export function getWidgetDefaultConfig(widgetType: SupportedWidgetType): WidgetConfigByKey[SupportedWidgetType] {
  return widgetRegistry[widgetType].defaultConfig;
}
