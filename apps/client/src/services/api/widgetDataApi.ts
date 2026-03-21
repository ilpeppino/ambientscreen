import { API_BASE_URL } from "../../core/config/api";
import type {
  ClockDateWidgetData,
  WidgetDataEnvelope,
  WidgetKey,
} from "@ambient/shared-contracts";

export type { ClockDateWidgetData, WidgetDataEnvelope };

const WIDGET_DATA_TIMEOUT_MS = 8000;

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
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

export async function getWidgetData<TData>(
  widgetId: string,
): Promise<WidgetDataEnvelope<TData, WidgetKey>> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort();
  }, WIDGET_DATA_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/widget-data/${widgetId}`, {
      signal: abortController.signal,
    });

    if (!response.ok) {
      const message = await toApiErrorMessage(response);
      throw new Error(`Failed to fetch widget data: ${message}`);
    }

    return response.json();
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw new Error(
        `Failed to fetch widget data: request timed out after ${WIDGET_DATA_TIMEOUT_MS}ms`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}
