import type {
  WidgetConfigByKey,
  WidgetConfigSchema,
  WidgetDataByKey,
  WidgetDataEnvelope,
  WidgetDataMeta,
  WidgetDataState,
  WidgetKey,
} from "../index";

export interface WidgetDefaultLayout {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface WidgetPluginRefreshPolicy {
  intervalMs: number | null;
}

export interface WidgetPluginManifest<TKey extends WidgetKey = WidgetKey> {
  key: TKey;
  version: string;
  name: string;
  description: string;
  category: string;
  defaultLayout: WidgetDefaultLayout;
  refreshPolicy: WidgetPluginRefreshPolicy;
  premium?: boolean;
}

export interface WidgetRendererProps<TKey extends WidgetKey = WidgetKey> {
  widgetInstanceId: string;
  widgetKey: TKey;
  state: WidgetDataState;
  data: WidgetDataByKey[TKey] | null;
  config: WidgetConfigByKey[TKey];
  meta?: WidgetDataMeta;
}

export interface WidgetSettingsFormProps<TKey extends WidgetKey = WidgetKey> {
  widgetKey: TKey;
  schema: WidgetConfigSchema;
  config: WidgetConfigByKey[TKey];
  disabled?: boolean;
  onChange: (nextConfig: WidgetConfigByKey[TKey]) => void;
}

export interface WidgetPreviewProps<TKey extends WidgetKey = WidgetKey> {
  widgetKey: TKey;
  config: WidgetConfigByKey[TKey];
}

export interface WidgetApiResolverInput<TKey extends WidgetKey = WidgetKey> {
  widgetInstanceId: string;
  widgetConfig: unknown;
  widgetKey: TKey;
}

export type WidgetApiResolveData<TKey extends WidgetKey = WidgetKey> = (
  input: WidgetApiResolverInput<TKey>
) => Promise<WidgetDataEnvelope<WidgetDataByKey[TKey], TKey>>;

export type WidgetClientRenderer<TKey extends WidgetKey = WidgetKey, TElement = unknown> = (
  props: WidgetRendererProps<TKey>
) => TElement;

export type WidgetClientSettingsForm<TKey extends WidgetKey = WidgetKey, TElement = unknown> = (
  props: WidgetSettingsFormProps<TKey>
) => TElement;

export type WidgetClientPreview<TKey extends WidgetKey = WidgetKey, TElement = unknown> = (
  props: WidgetPreviewProps<TKey>
) => TElement;

export interface WidgetPluginModule<TKey extends WidgetKey = WidgetKey, TElement = unknown> {
  manifest: WidgetPluginManifest<TKey>;
  configSchema: WidgetConfigSchema;
  defaultConfig: WidgetConfigByKey[TKey];
  api?: {
    resolveData: WidgetApiResolveData<TKey>;
  };
  client?: {
    Renderer: WidgetClientRenderer<TKey, TElement>;
    SettingsForm?: WidgetClientSettingsForm<TKey, TElement>;
    Preview?: WidgetClientPreview<TKey, TElement>;
  };
}

export type WidgetApiPluginModule<TKey extends WidgetKey = WidgetKey> =
  WidgetPluginModule<TKey> & {
    api: {
      resolveData: WidgetApiResolveData<TKey>;
    };
  };

export type WidgetClientPluginModule<TKey extends WidgetKey = WidgetKey, TElement = unknown> =
  WidgetPluginModule<TKey, TElement> & {
    client: {
      Renderer: WidgetClientRenderer<TKey, TElement>;
      SettingsForm?: WidgetClientSettingsForm<TKey, TElement>;
      Preview?: WidgetClientPreview<TKey, TElement>;
    };
  };

export interface WidgetBuiltinDefinition<TKey extends WidgetKey = WidgetKey> {
  manifest: WidgetPluginManifest<TKey>;
  defaultConfig: WidgetConfigByKey[TKey];
  configSchema: WidgetConfigSchema;
}

const manifestVersion = "1.0.0";

export const widgetBuiltinDefinitions: { [TKey in WidgetKey]: WidgetBuiltinDefinition<TKey> } = {
  clockDate: {
    manifest: {
      key: "clockDate",
      version: manifestVersion,
      name: "Clock & Date",
      description: "Displays the current time and date.",
      category: "time",
      defaultLayout: {
        w: 4,
        h: 2,
        minW: 2,
        minH: 1,
      },
      refreshPolicy: { intervalMs: 1000 },
    },
    defaultConfig: {
      format: "24h",
      showSeconds: false,
      timezone: "local",
    },
    configSchema: {
      format: ["12h", "24h"],
      showSeconds: "boolean",
      timezone: "string",
    },
  },
  weather: {
    manifest: {
      key: "weather",
      version: manifestVersion,
      name: "Weather",
      description: "Shows current weather conditions for a location.",
      category: "environment",
      defaultLayout: {
        w: 4,
        h: 2,
        minW: 2,
        minH: 1,
      },
      refreshPolicy: { intervalMs: 300000 },
    },
    defaultConfig: {
      location: "Amsterdam",
      units: "metric",
    },
    configSchema: {
      location: "string",
      units: ["metric", "imperial"],
    },
  },
  calendar: {
    manifest: {
      key: "calendar",
      version: manifestVersion,
      name: "Calendar",
      description: "Lists upcoming events from an iCal feed.",
      category: "productivity",
      defaultLayout: {
        w: 6,
        h: 3,
        minW: 3,
        minH: 2,
      },
      refreshPolicy: { intervalMs: 60000 },
    },
    defaultConfig: {
      provider: "ical",
      account: "",
      timeWindow: "next7d",
      maxEvents: 10,
      includeAllDay: true,
    },
    configSchema: {
      provider: ["ical"],
      account: "string",
      timeWindow: ["today", "next24h", "next7d"],
      maxEvents: "number",
      includeAllDay: "boolean",
    },
  },
}
