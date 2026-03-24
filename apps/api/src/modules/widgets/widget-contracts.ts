import type { Prisma } from "@prisma/client";
import type {
  WidgetConfigByKey,
  WidgetConfigFieldSchema,
  WidgetConfigSchema,
  WidgetKey,
  WidgetPluginManifest,
} from "@ambient/shared-contracts";
import { z } from "zod";
import { registerBuiltinWidgetPlugins } from "./registerBuiltinPlugins";
import {
  getWidgetPlugin,
  listWidgetPlugins,
} from "./widgetPluginRegistry";

registerBuiltinWidgetPlugins();

export type SupportedWidgetType = WidgetKey;
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

const pluginIndex = listWidgetPlugins();

export const SUPPORTED_WIDGET_TYPES = pluginIndex
  .map((plugin) => plugin.manifest.key) as SupportedWidgetType[];

function getRequiredPlugin(widgetType: SupportedWidgetType) {
  const plugin = getWidgetPlugin(widgetType);
  if (!plugin) {
    throw new Error(`Widget plugin not registered: ${widgetType}`);
  }
  return plugin;
}

export function getWidgetConfigSchema(widgetType: SupportedWidgetType): WidgetConfigSchema {
  return getRequiredPlugin(widgetType).configSchema;
}

export function getWidgetDefaultConfig(widgetType: SupportedWidgetType): WidgetConfigByKey[SupportedWidgetType] {
  return getRequiredPlugin(widgetType).defaultConfig;
}

export const widgetManifests = SUPPORTED_WIDGET_TYPES.reduce((accumulator, widgetType) => {
  const plugin = getRequiredPlugin(widgetType);
  accumulator[widgetType] = plugin.manifest;
  return accumulator;
}, {} as Record<SupportedWidgetType, WidgetPluginManifest<SupportedWidgetType>>);

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

const configSchemasByWidget = SUPPORTED_WIDGET_TYPES.reduce((accumulator, widgetType) => {
  accumulator[widgetType] = createWidgetConfigSchema(widgetType);
  return accumulator;
}, {} as Record<SupportedWidgetType, z.ZodTypeAny>);

const createWidgetConfigSchemaByType: Record<SupportedWidgetType, z.ZodTypeAny> = {
  ...configSchemasByWidget,
  clockDate: (configSchemasByWidget.clockDate as z.ZodObject<Record<string, z.ZodTypeAny>>)
    .extend({
      hour12: z.boolean().optional(),
      locale: z.string().optional(),
    })
    .strict(),
  weather: (configSchemasByWidget.weather as z.ZodObject<Record<string, z.ZodTypeAny>>)
    .extend({
      location: z.string().optional(),
    })
    .strict(),
  calendar: (configSchemasByWidget.calendar as z.ZodObject<Record<string, z.ZodTypeAny>>)
    .extend({
      sourceType: z.literal("ical").optional(),
      feedUrl: z.string().url().optional(),
      lookAheadDays: z.number().int().min(1).max(31).optional(),
    })
    .strict(),
};

export function getDefaultWidgetConfig(
  widgetType: SupportedWidgetType,
): Prisma.InputJsonValue {
  return getWidgetDefaultConfig(widgetType) as Prisma.InputJsonValue;
}

export const createWidgetSchema = z.discriminatedUnion(
  "type",
  (
    SUPPORTED_WIDGET_TYPES.map((widgetType) =>
      z
        .object({
          profileId: z.string().min(1).optional(),
          // Optional: attach the new widget to a specific slide. When omitted the
          // service falls back to the profile's lowest-order slide.
          slideId: z.string().min(1).optional(),
          type: z.literal(widgetType),
          config: createWidgetConfigSchemaByType[widgetType].optional(),
          layout: widgetLayoutSchema.optional(),
        })
        .extend({
          position: z.number().int().min(0).optional(),
        })
        .strict(),
    ) as unknown
  ) as [
    z.ZodDiscriminatedUnionOption<"type">,
    ...z.ZodDiscriminatedUnionOption<"type">[],
  ],
);

export function getWidgetRegistryEntry(widgetType: SupportedWidgetType) {
  return getRequiredPlugin(widgetType);
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

  if (widgetType === "weather") {
    const mapped = { ...config };
    if (typeof mapped.location === "string" && typeof mapped.city !== "string") {
      mapped.city = mapped.location;
    }
    delete mapped.location;
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
