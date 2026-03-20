import { API_BASE_URL } from "../../core/config/api";

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

export async function getWidgets(): Promise<WidgetInstance[]> {
  const response = await fetch(`${API_BASE_URL}/widgets`);

  if (!response.ok) {
    throw new Error(`Failed to fetch widgets: ${response.status}`);
  }

  return response.json();
}