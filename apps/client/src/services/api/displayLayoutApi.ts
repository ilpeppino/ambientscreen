import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";
import type {
  CalendarWidgetData,
  ClockDateWidgetData,
  EmailFeedWidgetData,
  RssNewsWidgetData,
  TasksWidgetData,
  WeatherWidgetData,
  WidgetConfigSchema,
  WidgetKey,
} from "@ambient/shared-contracts";

const DISPLAY_LAYOUT_TIMEOUT_MS = 8000;

export type DisplayWidgetState = "ready" | "loading" | "error" | "empty";

interface DisplayLayoutWidgetBase<TKey extends WidgetKey> {
  widgetInstanceId: string;
  widgetKey: TKey;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  state: DisplayWidgetState;
  config: Record<string, unknown>;
  configSchema: WidgetConfigSchema;
  meta: {
    resolvedAt: string;
    errorCode?: string;
    message?: string;
    source?: string;
    fetchedAt?: string;
    staleAt?: string;
    fromCache?: boolean;
  };
}

export type DisplayLayoutWidgetEnvelope =
  | (DisplayLayoutWidgetBase<"clockDate"> & {
      data: ClockDateWidgetData | null;
    })
  | (DisplayLayoutWidgetBase<"weather"> & {
      data: WeatherWidgetData | null;
    })
  | (DisplayLayoutWidgetBase<"calendar"> & {
      data: CalendarWidgetData | null;
    })
  | (DisplayLayoutWidgetBase<"rssNews"> & {
      data: RssNewsWidgetData | null;
    })
  | (DisplayLayoutWidgetBase<"tasks"> & {
      data: TasksWidgetData | null;
    })
  | (DisplayLayoutWidgetBase<"emailFeed"> & {
      data: EmailFeedWidgetData | null;
    });

export interface DisplaySlideEnvelope {
  id: string;
  name: string;
  order: number;
  durationSeconds: number | null;
  isEnabled: boolean;
  widgets: DisplayLayoutWidgetEnvelope[];
}

export interface DisplayLayoutResponse {
  slide?: DisplaySlideEnvelope | null;
  widgets: DisplayLayoutWidgetEnvelope[];
}

export interface UpdateWidgetLayoutInput {
  id: string;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

interface UpdateWidgetsLayoutPayload {
  widgets: UpdateWidgetLayoutInput[];
}

export interface UpdateWidgetConfigPayload {
  config: Record<string, unknown>;
}

function withDisplayLayoutQuery(path: string, profileId?: string, slideId?: string) {
  if (!profileId && !slideId) {
    return path;
  }

  const searchParams = new URLSearchParams();
  if (profileId) {
    searchParams.set("profileId", profileId);
  }
  if (slideId) {
    searchParams.set("slideId", slideId);
  }
  return `${path}?${searchParams.toString()}`;
}

function withProfileQuery(path: string, profileId?: string) {
  if (!profileId) {
    return path;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("profileId", profileId);
  return `${path}?${searchParams.toString()}`;
}

export async function getDisplayLayout(profileId?: string, slideId?: string): Promise<DisplayLayoutResponse> {
  const response = await apiFetchWithTimeout(
    withDisplayLayoutQuery(`${API_BASE_URL}/display-layout`, profileId, slideId),
    undefined,
    DISPLAY_LAYOUT_TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch display layout: ${message}`);
  }

  return response.json();
}

export async function updateWidgetsLayout(payload: UpdateWidgetsLayoutPayload, profileId?: string): Promise<void> {
  const response = await apiFetchWithTimeout(
    withProfileQuery(`${API_BASE_URL}/widgets/layout`, profileId),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    DISPLAY_LAYOUT_TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to update widget layout: ${message}`);
  }
}

export async function updateWidgetConfig(
  widgetId: string,
  payload: UpdateWidgetConfigPayload,
  profileId?: string,
): Promise<void> {
  const response = await apiFetchWithTimeout(
    withProfileQuery(`${API_BASE_URL}/widgets/${widgetId}/config`, profileId),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    DISPLAY_LAYOUT_TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to update widget config: ${message}`);
  }
}
