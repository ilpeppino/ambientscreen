import { API_BASE_URL } from "../../core/config/api";
import type {
  CalendarWidgetData,
  ClockDateWidgetData,
  WeatherWidgetData,
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

export async function getDisplayLayout(): Promise<DisplayLayoutResponse> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort();
  }, DISPLAY_LAYOUT_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/display-layout`, {
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
