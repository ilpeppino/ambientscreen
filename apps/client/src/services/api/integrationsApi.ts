import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiError } from "./apiClient";

export interface IntegrationConnection {
  id: string;
  provider: string;
  externalAccountId: string;
  label: string | null;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
}

export async function listIntegrationConnections(): Promise<IntegrationConnection[]> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/integrations`);
  if (!response.ok) {
    throw await toApiError(response);
  }
  const data = (await response.json()) as { connections: IntegrationConnection[] };
  return data.connections;
}

export async function deleteIntegrationConnection(connectionId: string): Promise<void> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/integrations/${connectionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
}

export function getGoogleConnectUrl(): string {
  return `${API_BASE_URL}/integrations/google/start`;
}

export interface GoogleCalendarOption {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string | null;
}

export async function listGoogleCalendars(integrationConnectionId: string): Promise<GoogleCalendarOption[]> {
  const params = new URLSearchParams({ integrationConnectionId });
  const response = await apiFetchWithTimeout(
    `${API_BASE_URL}/integrations/google/calendars?${params.toString()}`,
  );
  if (!response.ok) {
    throw await toApiError(response);
  }
  const data = (await response.json()) as { items: GoogleCalendarOption[] };
  return data.items;
}
