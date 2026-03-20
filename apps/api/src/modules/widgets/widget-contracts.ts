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

const calendarConfigSchema: z.ZodType<WidgetConfigByKey["calendar"]> = z
  .object({
    calendarId: z.string().min(1).optional(),
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

  return {};
}

export const createWidgetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("clockDate"),
    config: clockDateConfigSchema.optional(),
  }),
  z.object({
    type: z.literal("weather"),
    config: weatherConfigSchema.optional(),
  }),
  z.object({
    type: z.literal("calendar"),
    config: calendarConfigSchema.optional(),
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

  return parseResult.data as Prisma.InputJsonValue;
}
