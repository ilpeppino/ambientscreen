import type { Prisma } from "@prisma/client";
import type {
  WidgetConfigByKey,
  WidgetConfigFieldSchema,
  WidgetKey,
  WidgetManifest,
  WidgetRefreshPolicy,
} from "@ambient/shared-contracts";
import { z } from "zod";
import {
  getWidgetConfigSchema,
  getWidgetDefaultConfig,
  SUPPORTED_WIDGET_TYPES,
  type SupportedWidgetType,
  widgetRegistry,
} from "./widget.registry";

export { SUPPORTED_WIDGET_TYPES, type SupportedWidgetType };
export { getWidgetConfigSchema };
export const DISPLAY_GRID_COLUMNS = 12;
export const DISPLAY_GRID_BASE_ROWS = 6;

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
  .strict()
  .refine((layout) => layout.x + layout.w <= DISPLAY_GRID_COLUMNS, {
    message: `layout.x + layout.w must be <= ${DISPLAY_GRID_COLUMNS}`,
    path: ["x"],
  })
  .refine((layout) => layout.h <= DISPLAY_GRID_BASE_ROWS, {
    message: `layout.h must be <= ${DISPLAY_GRID_BASE_ROWS}`,
    path: ["h"],
  });

export const updateWidgetsLayoutSchema = z.object({
  widgets: z.array(z.object({
    id: z.string().min(1),
    layout: widgetLayoutSchema,
  }).strict()).min(1),
}).strict();

export const updateWidgetConfigPayloadSchema = z
  .object({
    config: z.record(z.unknown()),
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

function toZodConfigFieldSchema(schema: WidgetConfigFieldSchema) {
  if (Array.isArray(schema)) {
    return z.enum(schema as [string, ...string[]]);
  }

  if (schema === "boolean") {
    return z.boolean();
  }

  if (schema === "number") {
    return z.number().int().min(1).max(20);
  }

  return z.string();
}

function createWidgetConfigSchema(widgetType: SupportedWidgetType) {
  const configSchema = getWidgetConfigSchema(widgetType);
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, schema] of Object.entries(configSchema)) {
    shape[key] = toZodConfigFieldSchema(schema).optional();
  }

  return z.object(shape).strict();
}

const configSchemasByWidget: {
  [TKey in SupportedWidgetType]: z.ZodType<WidgetConfigByKey[TKey]>;
} = {
  clockDate: createWidgetConfigSchema("clockDate"),
  weather: createWidgetConfigSchema("weather"),
  calendar: createWidgetConfigSchema("calendar"),
};

const createClockDateConfigSchema = createWidgetConfigSchema("clockDate")
  .extend({
    hour12: z.boolean().optional(),
    locale: z.string().optional(),
  })
  .strict();

const createCalendarConfigSchema = createWidgetConfigSchema("calendar")
  .extend({
    sourceType: z.literal("ical").optional(),
    feedUrl: z.string().url().optional(),
    lookAheadDays: z.number().int().min(1).max(31).optional(),
  })
  .strict();

export function getDefaultWidgetConfig(
  widgetType: SupportedWidgetType,
): Prisma.InputJsonValue {
  return getWidgetDefaultConfig(widgetType) as Prisma.InputJsonValue;
}

export const createWidgetSchema = z.discriminatedUnion("type", [
  z.object({
    profileId: z.string().min(1).optional(),
    type: z.literal("clockDate"),
    config: createClockDateConfigSchema.optional(),
    layout: widgetLayoutSchema.optional(),
  }),
  z.object({
    profileId: z.string().min(1).optional(),
    type: z.literal("weather"),
    config: configSchemasByWidget.weather.optional(),
    layout: widgetLayoutSchema.optional(),
  }),
  z.object({
    profileId: z.string().min(1).optional(),
    type: z.literal("calendar"),
    config: createCalendarConfigSchema.optional(),
    layout: widgetLayoutSchema.optional(),
  }),
]);

export function getWidgetRegistryEntry(widgetType: SupportedWidgetType) {
  return widgetRegistry[widgetType];
}

function mapLegacyConfig(
  widgetType: SupportedWidgetType,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (widgetType === "clockDate") {
    const mapped = { ...config };
    if (typeof mapped.hour12 === "boolean" && typeof mapped.format !== "string") {
      mapped.format = mapped.hour12 ? "12h" : "24h";
    }
    delete mapped.hour12;
    delete mapped.locale;
    return mapped;
  }

  if (widgetType === "calendar") {
    const mapped = { ...config };

    if (typeof mapped.sourceType === "string" && typeof mapped.provider !== "string") {
      mapped.provider = mapped.sourceType;
    }

    if (typeof mapped.feedUrl === "string" && typeof mapped.account !== "string") {
      mapped.account = mapped.feedUrl;
    }

    if (typeof mapped.lookAheadDays === "number" && typeof mapped.timeWindow !== "string") {
      if (mapped.lookAheadDays <= 1) {
        mapped.timeWindow = "today";
      } else if (mapped.lookAheadDays <= 2) {
        mapped.timeWindow = "next24h";
      } else {
        mapped.timeWindow = "next7d";
      }
    }

    delete mapped.sourceType;
    delete mapped.feedUrl;
    delete mapped.lookAheadDays;

    return mapped;
  }

  return config;
}

function toConfigRecord(config: unknown): Record<string, unknown> {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }

  return config as Record<string, unknown>;
}

export function validateWidgetConfig(
  widgetType: SupportedWidgetType,
  config: unknown,
) {
  const configRecord = toConfigRecord(config);
  const mappedConfig = mapLegacyConfig(widgetType, configRecord);

  return configSchemasByWidget[widgetType].safeParse(mappedConfig);
}

export function normalizeWidgetConfig(
  widgetType: SupportedWidgetType,
  config: unknown,
): Prisma.InputJsonValue {
  const parseResult = validateWidgetConfig(widgetType, config);

  if (!parseResult.success) {
    return getDefaultWidgetConfig(widgetType);
  }

  const defaultConfig = getDefaultWidgetConfig(widgetType) as Record<string, unknown>;
  const parsedConfig = parseResult.data as Record<string, unknown>;

  return {
    ...defaultConfig,
    ...parsedConfig,
  } as Prisma.InputJsonValue;
}
