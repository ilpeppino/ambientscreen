export type WidgetKey = "clockDate" | "weather" | "calendar";

export type WidgetDataState = "ready" | "stale" | "empty" | "error";

export interface WidgetRefreshPolicy {
  intervalMs: number | null;
}

export interface WidgetManifest<TKey extends WidgetKey = WidgetKey> {
  key: TKey;
  name: string;
  refreshPolicy: WidgetRefreshPolicy;
}

export interface ClockDateWidgetConfig {
  format?: "12h" | "24h";
  showSeconds?: boolean;
  timezone?: string;
  locale?: string;
  hour12?: boolean;
}

export interface WeatherWidgetConfig {
  location?: string;
  units?: "metric" | "imperial";
}

export interface CalendarWidgetConfig {
  provider?: "ical";
  account?: string;
  timeWindow?: "today" | "next24h" | "next7d";
  includeAllDay?: boolean;
  maxEvents?: number;
}

export interface WidgetConfigByKey {
  clockDate: ClockDateWidgetConfig;
  weather: WeatherWidgetConfig;
  calendar: CalendarWidgetConfig;
}

export type WidgetConfig<TKey extends WidgetKey = WidgetKey> = WidgetConfigByKey[TKey];

export type WidgetConfigFieldSchema =
  | "string"
  | "boolean"
  | "number"
  | readonly [string, ...string[]];

export type WidgetConfigSchema = Record<string, WidgetConfigFieldSchema>;

export interface WidgetConfigDefinition<TKey extends WidgetKey = WidgetKey> {
  key: TKey;
  name: string;
  defaultConfig: WidgetConfigByKey[TKey];
  configSchema: WidgetConfigSchema;
}

export const widgetConfigRegistry: { [TKey in WidgetKey]: WidgetConfigDefinition<TKey> } = {
  clockDate: {
    key: "clockDate",
    name: "Clock & Date",
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
    key: "weather",
    name: "Weather",
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
      provider: ["ical"],
      account: "string",
      timeWindow: ["today", "next24h", "next7d"],
      maxEvents: "number",
      includeAllDay: "boolean",
    },
  },
};

export interface WidgetInstance<TKey extends WidgetKey = WidgetKey> {
  id: string;
  profileId: string;
  type: TKey;
  config: WidgetConfigByKey[TKey];
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateWidgetInput<TKey extends WidgetKey = WidgetKey> = {
  profileId?: string;
  type: TKey;
  config?: WidgetConfigByKey[TKey];
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
};

export interface Profile {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ProfilesListResponse {
  profiles: Profile[];
  activeProfileId: string | null;
}

export type OrchestrationRuleType = "interval" | "rotation";

export interface OrchestrationRule {
  id: string;
  userId: string;
  type: OrchestrationRuleType;
  intervalSec: number;
  isActive: boolean;
  rotationProfileIds: string[];
  currentIndex: number;
  createdAt: string;
}

export interface SharedSessionParticipant {
  id: string;
  sessionId: string;
  deviceId: string;
  displayName: string | null;
  lastSeenAt: string;
  createdAt: string;
}

export interface SharedSessionPlaybackState {
  sessionId: string;
  activeProfileId: string | null;
  slideshowEnabled: boolean;
  slideshowIntervalSec: number;
  rotationProfileIds: string[];
  currentIndex: number;
  lastAdvancedAt: string | null;
}

export interface SharedScreenSession {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  activeProfileId: string | null;
  slideshowEnabled: boolean;
  slideshowIntervalSec: number;
  rotationProfileIds: string[];
  currentIndex: number;
  lastAdvancedAt: string | null;
  createdAt: string;
  updatedAt: string;
  participants: SharedSessionParticipant[];
}

export type DevicePlatform = "ios" | "android" | "web";

export type DeviceType = "phone" | "tablet" | "display" | "web";

export type RemoteCommand =
  | { type: "SET_PROFILE"; profileId: string }
  | { type: "REFRESH" }
  | { type: "SET_SLIDESHOW"; enabled: boolean };

export interface Device {
  id: string;
  userId: string;
  name: string;
  platform: DevicePlatform;
  deviceType: DeviceType;
  connectionStatus?: "online" | "offline";
  lastConnectedAt?: string | null;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetDataMeta {
  fetchedAt?: string;
  staleAt?: string;
  source?: string;
  fromCache?: boolean;
  errorCode?: string;
  message?: string;
}

export interface ClockDateWidgetData {
  nowIso: string;
  formattedTime: string;
  formattedDate: string | null;
  weekdayLabel: string | null;
}

export interface WeatherWidgetData {
  location: string | null;
  temperatureC: number | null;
  conditionLabel: string | null;
}

export interface CalendarWidgetData {
  upcomingCount: number;
  events: Array<{
    id: string;
    title: string;
    startIso: string;
    endIso: string | null;
    allDay: boolean;
    location: string | null;
  }>;
}

export interface WidgetDataByKey {
  clockDate: ClockDateWidgetData;
  weather: WeatherWidgetData;
  calendar: CalendarWidgetData;
}

export interface WidgetDataEnvelope<
  TData,
  TKey extends WidgetKey = WidgetKey
> {
  widgetInstanceId: string;
  widgetKey: TKey;
  state: WidgetDataState;
  data: TData | null;
  meta?: WidgetDataMeta;
}

export interface WidgetRendererProps<TData> {
  data: TData | null;
}
