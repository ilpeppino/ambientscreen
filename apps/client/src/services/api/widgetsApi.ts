import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";
import type {
  CreateWidgetInput,
  WidgetInstance,
  WidgetKey,
} from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";

export type { CreateWidgetInput, WidgetInstance, WidgetKey };
export const WIDGET_TYPES: WidgetKey[] = Object.keys(widgetBuiltinDefinitions) as WidgetKey[];
const WIDGETS_TIMEOUT_MS = 8000;

export async function getWidgets(profileId?: string): Promise<WidgetInstance[]> {
  const searchParams = new URLSearchParams();
  if (profileId) {
    searchParams.set("profileId", profileId);
  }

  const url = `${API_BASE_URL}/widgets${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;
  const response = await apiFetchWithTimeout(url, undefined, WIDGETS_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch widgets: ${message}`);
  }

  return response.json();
}

export async function createWidget(input: CreateWidgetInput, profileId?: string): Promise<WidgetInstance> {
  const payload: CreateWidgetInput = profileId
    ? { ...input, profileId }
    : input;

  const response = await apiFetchWithTimeout(`${API_BASE_URL}/widgets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }, WIDGETS_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to create widget: ${message}`);
  }

  return response.json();
}

export async function setActiveWidget(widgetId: string, profileId?: string): Promise<WidgetInstance> {
  const searchParams = new URLSearchParams();
  if (profileId) {
    searchParams.set("profileId", profileId);
  }
  const url = `${API_BASE_URL}/widgets/${widgetId}/active${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;
  const response = await apiFetchWithTimeout(url, {
    method: "PATCH"
  }, WIDGETS_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to set active widget: ${message}`);
  }

  return response.json();
}
