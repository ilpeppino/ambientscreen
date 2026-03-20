import { API_BASE_URL } from "../../core/config/api";

export interface ClockDateWidgetData {
  nowIso: string;
  formattedTime: string;
  formattedDate: string | null;
  weekdayLabel: string | null;
}

export interface WidgetDataEnvelope<TData> {
  widgetInstanceId: string;
  widgetKey: string;
  state: "ready" | "stale" | "empty" | "error";
  data: TData | null;
  meta?: {
    fetchedAt?: string;
    staleAt?: string;
    source?: string;
    fromCache?: boolean;
    errorCode?: string;
    message?: string;
  };
}

export async function getWidgetData<TData>(
  widgetId: string,
): Promise<WidgetDataEnvelope<TData>> {
  const response = await fetch(`${API_BASE_URL}/widget-data/${widgetId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch widget data: ${response.status}`);
  }

  return response.json();
}