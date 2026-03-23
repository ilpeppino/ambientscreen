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

function withProfileQuery(path: string, profileId?: string) {
  if (!profileId) {
    return path;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("profileId", profileId);
  return `${path}?${searchParams.toString()}`;
}

export async function getWidgets(profileId?: string): Promise<WidgetInstance[]> {
  const url = withProfileQuery(`${API_BASE_URL}/widgets`, profileId);
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

  const response = await apiFetchWithTimeout(
    withProfileQuery(`${API_BASE_URL}/widgets`, profileId),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    },
    WIDGETS_TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to create widget: ${message}`);
  }

  return response.json();
}

export async function deleteWidget(widgetId: string, profileId?: string): Promise<void> {
  const response = await apiFetchWithTimeout(
    withProfileQuery(`${API_BASE_URL}/widgets/${widgetId}`, profileId),
    {
      method: "DELETE",
    },
    WIDGETS_TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to delete widget: ${message}`);
  }
}
