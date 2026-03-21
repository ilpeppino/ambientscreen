import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";
import type {
  ClockDateWidgetData,
  WidgetDataEnvelope,
  WidgetKey,
} from "@ambient/shared-contracts";

export type { ClockDateWidgetData, WidgetDataEnvelope };

const WIDGET_DATA_TIMEOUT_MS = 8000;

export async function getWidgetData<TData>(
  widgetId: string,
): Promise<WidgetDataEnvelope<TData, WidgetKey>> {
  const response = await apiFetchWithTimeout(
    `${API_BASE_URL}/widget-data/${widgetId}`,
    undefined,
    WIDGET_DATA_TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch widget data: ${message}`);
  }

  return response.json();
}
