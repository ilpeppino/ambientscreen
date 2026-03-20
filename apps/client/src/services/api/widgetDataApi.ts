import { API_BASE_URL } from "../../core/config/api";
import type {
  ClockDateWidgetData,
  WidgetDataEnvelope,
  WidgetKey,
} from "@ambient/shared-contracts";

export type { ClockDateWidgetData, WidgetDataEnvelope };

export async function getWidgetData<TData>(
  widgetId: string,
): Promise<WidgetDataEnvelope<TData, WidgetKey>> {
  const response = await fetch(`${API_BASE_URL}/widget-data/${widgetId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch widget data: ${response.status}`);
  }

  return response.json();
}
