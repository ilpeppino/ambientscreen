import type { Prisma } from "@prisma/client";
import type {
  WidgetConfigByKey,
  WidgetKey,
  WidgetManifest,
  WidgetRefreshPolicy,
} from "@ambient/shared-contracts";
import { z } from "zod";

export const SUPPORTED_WIDGET_TYPES = ["clockDate", "weather", "calendar"] as const;
export type SupportedWidgetType = (typeof SUPPORTED_WIDGET_TYPES)[number];

export const defaultWidgetLayout = {
  x: 0,
  y: 0,
  w: 1,
  h: 1,
} as const;

export const widgetLayoutSchema = z
  .object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1),
    h: z.number().int().min(1),
  })
  .strict();

const refreshPolicyByWidget: { [TKey in WidgetKey]: WidgetRefreshPolicy } = {
  clockDate: { intervalMs: 1000 },
  weather: { intervalMs: 300000 },
  calendar: { intervalMs: 60000 },
};

export const widgetManifests: { [TKey in WidgetKey]: WidgetManifest<TKey> } = {
  clockDate: {
    key: "clockDate",
    name: "Clock & Date",
    refreshPolicy: refreshPolicyByWidget.clockDate,
  },
  weather: {
    key: "weather",
    name: "Weather",
    refreshPolicy: refreshPolicyByWidget.weather,
  },
  calendar: {
    key: "calendar",
    name: "Calendar",
    refreshPolicy: refreshPolicyByWidget.calendar,
  },
};

const clockDateConfigSchema: z.ZodType<WidgetConfigByKey["clockDate"]> = z
  .object({
    timezone: z.string().min(1).optional(),
    locale: z.string().min(1).optional(),
    hour12: z.boolean().optional(),
  })
  .strict();

const weatherConfigSchema: z.ZodType<WidgetConfigByKey["weather"]> = z
  .object({
    location: z.string().min(1).optional(),
    units: z.enum(["metric", "imperial"]).optional(),
  })
  .strict();

const calendarConfigSchema = z
  .object({
    provider: z.literal("ical").optional(),
    account: z.string().url().optional(),
    timeWindow: z.enum(["today", "next24h", "next7d"]).optional(),
    maxEvents: z.number().int().min(1).max(20).optional(),
    includeAllDay: z.boolean().optional(),
    sourceType: z.literal("ical").optional(),
    feedUrl: z.string().url().optional(),
    lookAheadDays: z.number().int().min(1).max(31).optional(),
  })
  .strict();

const configSchemasByWidget = {
  clockDate: clockDateConfigSchema,
  weather: weatherConfigSchema,
  calendar: calendarConfigSchema,
};

export function getDefaultWidgetConfig(
  widgetType: SupportedWidgetType,
): Prisma.InputJsonValue {
  if (widgetType === "clockDate") {
    return {};
  }

  if (widgetType === "weather") {
    return {
      location: "Amsterdam",
      units: "metric",
    };
  }

  return {
    provider: "ical",
    timeWindow: "next7d",
    maxEvents: 10,
    includeAllDay: true,
  };
}

export const createWidgetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("clockDate"),
    config: clockDateConfigSchema.optional(),
    layout: widgetLayoutSchema.optional(),
  }),
  z.object({
    type: z.literal("weather"),
    config: weatherConfigSchema.optional(),
    layout: widgetLayoutSchema.optional(),
  }),
  z.object({
    type: z.literal("calendar"),
    config: calendarConfigSchema.optional(),
    layout: widgetLayoutSchema.optional(),
  }),
]);

export function normalizeWidgetConfig(
  widgetType: SupportedWidgetType,
  config: unknown,
): Prisma.InputJsonValue {
  const schema = configSchemasByWidget[widgetType];
  const parseResult = schema.safeParse(config ?? {});

  if (!parseResult.success) {
    return getDefaultWidgetConfig(widgetType);
  }

  const defaultConfig = getDefaultWidgetConfig(widgetType) as Record<string, unknown>;
  const parsedConfig = parseResult.data as Record<string, unknown>;

  if (widgetType === "calendar") {
    const provider = parsedConfig.provider ?? parsedConfig.sourceType ?? defaultConfig.provider;
    const account = parsedConfig.account ?? parsedConfig.feedUrl;
    const timeWindow =
      parsedConfig.timeWindow ??
      (typeof parsedConfig.lookAheadDays === "number"
        ? parsedConfig.lookAheadDays <= 1
          ? "today"
          : parsedConfig.lookAheadDays <= 2
            ? "next24h"
            : "next7d"
        : defaultConfig.timeWindow);

    return {
      provider,
      ...(account ? { account } : {}),
      timeWindow,
      maxEvents: parsedConfig.maxEvents ?? defaultConfig.maxEvents,
      includeAllDay: parsedConfig.includeAllDay ?? defaultConfig.includeAllDay,
    } as Prisma.InputJsonValue;
  }

  return {
    ...defaultConfig,
    ...parsedConfig,
  } as Prisma.InputJsonValue;
}
