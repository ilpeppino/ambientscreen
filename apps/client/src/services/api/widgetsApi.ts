import { API_BASE_URL } from "../../core/config/api";
import type {
  CreateWidgetInput,
  WidgetInstance,
  WidgetKey,
} from "@ambient/shared-contracts";

export type { CreateWidgetInput, WidgetInstance, WidgetKey };
export const WIDGET_TYPES: WidgetKey[] = ["clockDate", "weather", "calendar"];

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

export async function getWidgets(): Promise<WidgetInstance[]> {
  const response = await fetch(`${API_BASE_URL}/widgets`);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch widgets: ${message}`);
  }

  return response.json();
}

export async function createWidget(input: CreateWidgetInput): Promise<WidgetInstance> {
  const response = await fetch(`${API_BASE_URL}/widgets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to create widget: ${message}`);
  }

  return response.json();
}

export async function setActiveWidget(widgetId: string): Promise<WidgetInstance> {
  const response = await fetch(`${API_BASE_URL}/widgets/${widgetId}/active`, {
    method: "PATCH"
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to set active widget: ${message}`);
  }

  return response.json();
}
