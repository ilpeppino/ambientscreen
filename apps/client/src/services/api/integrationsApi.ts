import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiError } from "./apiClient";

export type IntegrationStatus = "connected" | "needs_reauth" | "revoked" | "error";

export interface IntegrationConnection {
  id: string;
  provider: string;
  status: IntegrationStatus;
  accountLabel: string | null;
  accountEmail: string | null;
  externalAccountId: string | null;
  scopes: string[];
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationProviderDescriptor {
  key: string;
  label: string;
  description: string;
  authType: "oauth";
}

export interface IntegrationProviderListResponse {
  items: IntegrationProviderDescriptor[];
}

export interface IntegrationProviderAuthorizationResponse {
  authorizationUrl: string;
}

export async function listIntegrationProviders(): Promise<IntegrationProviderDescriptor[]> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/integrations/providers`);
  if (!response.ok) {
    throw await toApiError(response);
  }

  const data = (await response.json()) as IntegrationProviderListResponse;
  return data.items;
}

export async function listIntegrationConnections(provider?: string): Promise<IntegrationConnection[]> {
  const params = new URLSearchParams();
  if (provider) params.set("provider", provider);
  const query = provider ? `?${params.toString()}` : "";
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/integrations${query}`);
  if (!response.ok) {
    throw await toApiError(response);
  }
  const data = (await response.json()) as { items: IntegrationConnection[] };
  return data.items;
}

export async function getIntegrationConnection(connectionId: string): Promise<IntegrationConnection> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/integrations/${connectionId}`);
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json() as Promise<IntegrationConnection>;
}

export async function updateIntegrationConnection(
  connectionId: string,
  updates: { accountLabel: string | null },
): Promise<IntegrationConnection> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/integrations/${connectionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json() as Promise<IntegrationConnection>;
}

export async function deleteIntegrationConnection(connectionId: string): Promise<void> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/integrations/${connectionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
}

export async function refreshIntegrationConnection(connectionId: string): Promise<IntegrationConnection> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/integrations/${connectionId}/refresh`, {
    method: "POST",
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json() as Promise<IntegrationConnection>;
}

export async function getIntegrationProviderAuthorizationUrl(
  provider: string,
  returnTo?: string,
): Promise<string> {
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);

  const query = params.toString();
  const response = await apiFetchWithTimeout(
    `${API_BASE_URL}/integrations/providers/${encodeURIComponent(provider)}/start${query ? `?${query}` : ""}`,
  );

  if (!response.ok) {
    throw await toApiError(response);
  }

  const data = (await response.json()) as IntegrationProviderAuthorizationResponse;
  return data.authorizationUrl;
}

export async function getGoogleConnectUrl(returnTo?: string): Promise<string> {
  return getIntegrationProviderAuthorizationUrl("google", returnTo);
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

export interface GoogleTaskListOption {
  id: string;
  title: string;
  updatedAt?: string;
}

export async function listGoogleTaskLists(integrationConnectionId: string): Promise<GoogleTaskListOption[]> {
  const params = new URLSearchParams({ integrationConnectionId });
  const response = await apiFetchWithTimeout(
    `${API_BASE_URL}/integrations/google/tasks/lists?${params.toString()}`,
  );
  if (!response.ok) {
    throw await toApiError(response);
  }
  const data = (await response.json()) as { items: GoogleTaskListOption[] };
  return data.items;
}
