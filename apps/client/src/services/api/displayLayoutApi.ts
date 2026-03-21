import { API_BASE_URL } from "../../core/config/api";
import type {
  CalendarWidgetData,
  ClockDateWidgetData,
  WeatherWidgetData,
  WidgetConfigSchema,
  WidgetKey,
} from "@ambient/shared-contracts";

const DISPLAY_LAYOUT_TIMEOUT_MS = 8000;

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

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
    });

export interface DisplayLayoutResponse {
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

async function toApiErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    if (body.error?.message) {
      return body.error.message;
    }
  } catch {
    // Fallback to status-based message when response is not JSON.
  }

  return `Request failed with status ${response.status}`;
}

function withProfileQuery(path: string, profileId?: string) {
  if (!profileId) {
    return path;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("profileId", profileId);
  return `${path}?${searchParams.toString()}`;
}

export async function getDisplayLayout(profileId?: string): Promise<DisplayLayoutResponse> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort();
  }, DISPLAY_LAYOUT_TIMEOUT_MS);

  try {
    const response = await fetch(withProfileQuery(`${API_BASE_URL}/display-layout`, profileId), {
      signal: abortController.signal,
    });

    if (!response.ok) {
      const message = await toApiErrorMessage(response);
      throw new Error(`Failed to fetch display layout: ${message}`);
    }

    return response.json();
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw new Error(
        `Failed to fetch display layout: request timed out after ${DISPLAY_LAYOUT_TIMEOUT_MS}ms`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function updateWidgetsLayout(payload: UpdateWidgetsLayoutPayload, profileId?: string): Promise<void> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort();
  }, DISPLAY_LAYOUT_TIMEOUT_MS);

  try {
    const response = await fetch(withProfileQuery(`${API_BASE_URL}/widgets/layout`, profileId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const message = await toApiErrorMessage(response);
      throw new Error(`Failed to update widget layout: ${message}`);
    }
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw new Error(
        `Failed to update widget layout: request timed out after ${DISPLAY_LAYOUT_TIMEOUT_MS}ms`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function updateWidgetConfig(
  widgetId: string,
  payload: UpdateWidgetConfigPayload,
  profileId?: string,
): Promise<void> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort();
  }, DISPLAY_LAYOUT_TIMEOUT_MS);

  try {
    const response = await fetch(
      withProfileQuery(`${API_BASE_URL}/widgets/${widgetId}/config`, profileId),
      {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
      },
    );

    if (!response.ok) {
      const message = await toApiErrorMessage(response);
      throw new Error(`Failed to update widget config: ${message}`);
    }
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw new Error(
        `Failed to update widget config: request timed out after ${DISPLAY_LAYOUT_TIMEOUT_MS}ms`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}
