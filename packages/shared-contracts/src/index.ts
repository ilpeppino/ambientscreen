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
  maxEvents?: number;
  includeAllDay?: boolean;
}

export interface WidgetConfigByKey {
  clockDate: ClockDateWidgetConfig;
  weather: WeatherWidgetConfig;
  calendar: CalendarWidgetConfig;
}

export type WidgetConfig<TKey extends WidgetKey = WidgetKey> = WidgetConfigByKey[TKey];

export interface WidgetInstance<TKey extends WidgetKey = WidgetKey> {
  id: string;
  userId: string;
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
  type: TKey;
  config?: WidgetConfigByKey[TKey];
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
};

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
