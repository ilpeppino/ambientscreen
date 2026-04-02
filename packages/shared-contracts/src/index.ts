export type UserPlan = "free" | "pro";

export type FeatureFlagKey =
  | "premium_widgets"
  | "advanced_layouts"
  | "multi_device_control"
  | "plugin_installation";

export interface EntitlementsResponse {
  plan: UserPlan;
  features: Record<FeatureFlagKey, boolean>;
}

export type WidgetKey = "clockDate" | "weather" | "calendar" | "rssNews" | "tasks";

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
  /** @deprecated Use `hour12` instead. Kept for backward compatibility with persisted data. */
  format?: "12h" | "24h";
  showSeconds?: boolean;
  timezone?: string;
  locale?: string;
  /** Canonical field: true = 12-hour clock, false = 24-hour clock. */
  hour12?: boolean;
}

export interface WeatherWidgetConfig {
  city?: string;
  countryCode?: string;
  units?: "metric" | "imperial" | "standard";
  forecastSlots?: number;
}

export interface CalendarWidgetConfig {
  provider?: "ical" | "google";
  account?: string;
  integrationConnectionId?: string;
  /** Canonical Google resource selection: one or more calendar IDs under a single connection. */
  calendarIds?: string[];
  /** @deprecated Use `calendarIds` instead. */
  calendarId?: string;
  timeWindow?: "today" | "next24h" | "next7d";
  includeAllDay?: boolean;
  /** Canonical display cap for upcoming events. */
  maxItems?: number;
  /** @deprecated Use `maxItems` instead. */
  maxEvents?: number;
}

export interface RssNewsWidgetConfig {
  feedUrl?: string;
  maxItems?: number;
  showImages?: boolean;
  showPublishedAt?: boolean;
  layout?: "headline-list" | "ticker";
  title?: string;
}

export type TasksWidgetProvider = "google-tasks" | "microsoft-todo" | "todoist";
export type TasksWidgetDisplayMode = "list" | "compact" | "focus";

export interface TasksWidgetConfig {
  provider?: TasksWidgetProvider;
  integrationConnectionId?: string;
  selectedTaskListIds?: string[];
  displayMode?: TasksWidgetDisplayMode;
  maxItems?: number;
  showCompleted?: boolean;
}

export interface WidgetConfigByKey {
  clockDate: ClockDateWidgetConfig;
  weather: WeatherWidgetConfig;
  calendar: CalendarWidgetConfig;
  rssNews: RssNewsWidgetConfig;
  tasks: TasksWidgetConfig;
}

export type WidgetConfig<TKey extends WidgetKey = WidgetKey> = WidgetConfigByKey[TKey];

export type WidgetConfigFieldSchema =
  | "string"
  | "string[]"
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
      hour12: false,
      showSeconds: false,
      timezone: "local",
    },
    configSchema: {
      hour12: "boolean",
      showSeconds: "boolean",
      timezone: "string",
    },
  },
  weather: {
    key: "weather",
    name: "Weather",
    defaultConfig: {
      city: "Amsterdam",
      units: "metric",
      forecastSlots: 3,
    },
    configSchema: {
      city: "string",
      countryCode: "string",
      units: ["metric", "imperial", "standard"],
      forecastSlots: "number",
    },
  },
  calendar: {
    key: "calendar",
    name: "Calendar",
    defaultConfig: {
      provider: "ical",
      account: "",
      timeWindow: "next7d",
      maxItems: 10,
      includeAllDay: true,
    },
    configSchema: {
      provider: ["ical", "google"],
      account: "string",
      integrationConnectionId: "string",
      calendarIds: "string[]",
      timeWindow: ["today", "next24h", "next7d"],
      maxItems: "number",
      includeAllDay: "boolean",
    },
  },
  rssNews: {
    key: "rssNews",
    name: "RSS News",
    defaultConfig: {
      feedUrl: "",
      maxItems: 5,
      showImages: true,
      showPublishedAt: true,
      layout: "headline-list",
      title: "Latest News",
    },
    configSchema: {
      feedUrl: "string",
      maxItems: "number",
      showImages: "boolean",
      showPublishedAt: "boolean",
      layout: ["headline-list", "ticker"],
      title: "string",
    },
  },
  tasks: {
    key: "tasks",
    name: "Tasks",
    defaultConfig: {
      provider: "google-tasks",
      integrationConnectionId: "",
      selectedTaskListIds: [],
      displayMode: "list",
      maxItems: 5,
      showCompleted: false,
    },
    configSchema: {
      provider: ["google-tasks", "microsoft-todo", "todoist"],
      integrationConnectionId: "string",
      selectedTaskListIds: "string[]",
      displayMode: ["list", "compact", "focus"],
      maxItems: "number",
      showCompleted: "boolean",
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
  createdAt: string;
  updatedAt: string;
}

export type CreateWidgetInput<TKey extends WidgetKey = WidgetKey> = {
  profileId?: string;
  /** Attach the new widget to this specific slide. Falls back to the profile's lowest-order slide when omitted. */
  slideId?: string;
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
  defaultSlideDurationSeconds: number;
}

export interface Slide {
  id: string;
  profileId: string;
  name: string;
  order: number;
  durationSeconds: number | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

export interface SlidesListResponse {
  slides: Slide[];
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

export interface WeatherForecastSlot {
  timeIso: string;
  temperatureC: number | null;
  conditionLabel: string | null;
}

export interface WeatherWidgetData {
  location: string | null;
  temperatureC: number | null;
  conditionLabel: string | null;
  forecast: WeatherForecastSlot[];
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

export interface RssNewsWidgetData {
  title: string;
  siteTitle?: string;
  feedUrl: string;
  items: Array<{
    id: string;
    title: string;
    link: string;
    summary?: string;
    publishedAt?: string;
    imageUrl?: string;
  }>;
}

export interface NormalizedTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  updatedAt?: string;
  sourceListName?: string;
}

export interface TasksWidgetData {
  tasks: NormalizedTask[];
  lists: Array<{
    id: string;
    name: string;
  }>;
}

export interface WidgetDataByKey {
  clockDate: ClockDateWidgetData;
  weather: WeatherWidgetData;
  calendar: CalendarWidgetData;
  rssNews: RssNewsWidgetData;
  tasks: TasksWidgetData;
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

export interface LegacyWidgetRendererProps<TData> {
  data: TData | null;
}

export * from "./widgets/plugin-sdk";
