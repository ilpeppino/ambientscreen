import { API_BASE_URL } from "../../core/config/api";

export const WIDGET_TYPES = ["clockDate", "weather", "calendar"] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export interface WidgetInstance {
  id: string;
  userId: string;
  type: string;
  config: unknown;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWidgetInput {
  type: WidgetType;
}

export async function getWidgets(): Promise<WidgetInstance[]> {
  const response = await fetch(`${API_BASE_URL}/widgets`);

  if (!response.ok) {
    throw new Error(`Failed to fetch widgets: ${response.status}`);
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
    throw new Error(`Failed to create widget: ${response.status}`);
  }

  return response.json();
}

export async function setActiveWidget(widgetId: string): Promise<WidgetInstance> {
  const response = await fetch(`${API_BASE_URL}/widgets/${widgetId}/active`, {
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(`Failed to set active widget: ${response.status}`);
  }

  return response.json();
}
