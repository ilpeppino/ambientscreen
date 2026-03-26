import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiError, getApiAuthToken } from "./apiClient";

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

/**
 * Build the URL to start Google OAuth.
 *
 * Includes the auth token as a query parameter so Linking.openURL() can
 * authenticate the request to the backend. Pass a `returnTo` value to tell
 * the backend where to redirect after the OAuth flow completes.
 *
 * Allowed returnTo values:
 *   - ambientscreen://integrations  (native deep link)
 *   - same-origin web URL           (validated server-side)
 *
 * On web, omit `returnTo` and the backend will redirect to the app's
 * /integrations path which the web app handles via useWebHistory.
 */
export function getGoogleConnectUrl(returnTo?: string): string {
  const base = `${API_BASE_URL}/integrations/google/start`;
  const token = getApiAuthToken();

  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (returnTo) params.set("returnTo", returnTo);

  const query = params.toString();
  return query ? `${base}?${query}` : base;
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
