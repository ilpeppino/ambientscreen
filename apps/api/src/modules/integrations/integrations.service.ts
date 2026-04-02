import { apiErrors } from "../../core/http/api-error";
import { integrationsRepository } from "./integrations.repository";
import { toSummary } from "./integration-connection.mapper";
import { googleCalendarAdapter } from "./providers/google/google-calendar.adapter";
import { googleTasksAdapter } from "./providers/google/google-tasks.adapter";
import { googleOAuthService } from "./providers/google/google-oauth.service";
import { decryptToken } from "../../core/crypto/encryption";
import {
  SUPPORTED_PROVIDER_DESCRIPTORS,
  type IntegrationConnectionSummary,
  type IntegrationProviderDescriptor,
  type IntegrationProvider,
  type GoogleCalendarOption,
  type GoogleTaskListOption,
} from "./integrations.types";

interface ListConnectionsFilter {
  provider?: string;
  status?: string;
}

export const integrationsService = {
  listProviders(): IntegrationProviderDescriptor[] {
    return SUPPORTED_PROVIDER_DESCRIPTORS;
  },

  async listConnections(userId: string, filters: ListConnectionsFilter = {}): Promise<IntegrationConnectionSummary[]> {
    const records = await integrationsRepository.listByUser(userId, filters);
    return records.map(toSummary);
  },

  async getProviderConnectAuthorizationUrl(
    userId: string,
    provider: IntegrationProvider,
    returnTo?: string,
  ): Promise<string> {
    if (provider === "google") {
      return googleOAuthService.buildAuthorizationUrl(userId, returnTo);
    }

    throw apiErrors.integrationProviderMismatch("Unsupported provider.");
  },

  async getConnectionById(userId: string, connectionId: string): Promise<IntegrationConnectionSummary> {
    const record = await integrationsRepository.findByUserAndId(userId, connectionId);
    if (!record) throw apiErrors.integrationNotFound("Connection not found.");
    return toSummary(record);
  },

  async updateConnectionLabel(
    userId: string,
    connectionId: string,
    input: { accountLabel?: string | null },
  ): Promise<IntegrationConnectionSummary> {
    const record = await integrationsRepository.findByUserAndId(userId, connectionId);
    if (!record) throw apiErrors.integrationNotFound("Connection not found.");
    const updated = await integrationsRepository.update(connectionId, {
      accountLabel: input.accountLabel ?? null,
    });
    return toSummary(updated);
  },

  async deleteConnection(userId: string, connectionId: string): Promise<void> {
    const record = await integrationsRepository.findByUserAndId(userId, connectionId);
    if (!record) throw apiErrors.integrationNotFound("Connection not found.");
    await integrationsRepository.delete(connectionId);
  },

  async refreshConnection(userId: string, connectionId: string): Promise<IntegrationConnectionSummary> {
    const record = await integrationsRepository.findByUserAndId(userId, connectionId);
    if (!record) throw apiErrors.integrationNotFound("Connection not found.");

    if (record.status === "revoked") {
      throw apiErrors.integrationNeedsReauth("This connection needs to be reconnected.");
    }

    if (record.provider === "google") {
      const isValid = await googleCalendarAdapter.validateConnection(record);
      if (!isValid) {
        await integrationsRepository.update(connectionId, { status: "needs_reauth" });
        throw apiErrors.integrationNeedsReauth("This connection needs to be reconnected.");
      }
      const refreshed = await googleCalendarAdapter.refreshConnectionIfNeeded(record);
      return toSummary(refreshed);
    }

    throw apiErrors.integrationProviderMismatch("Unsupported provider for refresh.");
  },

  async listGoogleCalendars(userId: string, connectionId: string): Promise<GoogleCalendarOption[]> {
    const record = await integrationsRepository.findByUserAndId(userId, connectionId);
    if (!record) throw apiErrors.integrationNotFound("Connection not found.");
    if (record.provider !== "google") {
      throw apiErrors.integrationProviderMismatch("This connection is not a Google connection.");
    }
    if (record.status === "revoked" || record.status === "needs_reauth") {
      throw apiErrors.integrationNeedsReauth("This connection needs to be reconnected.");
    }

    try {
      return await googleCalendarAdapter.fetchCalendars(record);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "INTEGRATION_NEEDS_REAUTH") {
        throw apiErrors.integrationNeedsReauth("This connection needs to be reconnected.");
      }
      if (msg === "INTEGRATION_REFRESH_FAILED") {
        throw apiErrors.integrationRefreshFailed("Unable to refresh the connection.");
      }
      throw apiErrors.integrationProviderError("Unable to load calendars.");
    }
  },

  async listGoogleTaskLists(userId: string, connectionId: string): Promise<GoogleTaskListOption[]> {
    const record = await integrationsRepository.findByUserAndId(userId, connectionId);
    if (!record) throw apiErrors.integrationNotFound("Connection not found.");
    if (record.provider !== "google") {
      throw apiErrors.integrationProviderMismatch("This connection is not a Google connection.");
    }
    if (record.status === "revoked" || record.status === "needs_reauth") {
      throw apiErrors.integrationNeedsReauth("This connection needs to be reconnected.");
    }

    try {
      const lists = await googleTasksAdapter.fetchTaskLists(record);
      return lists.map((list) => ({
        id: list.id,
        title: list.title,
      }));
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "INTEGRATION_NEEDS_REAUTH") {
        throw apiErrors.integrationNeedsReauth("This connection needs to be reconnected.");
      }
      if (msg === "INTEGRATION_REFRESH_FAILED") {
        throw apiErrors.integrationRefreshFailed("Unable to refresh the connection.");
      }
      throw apiErrors.integrationProviderError("Unable to load task lists.");
    }
  },

  /** Internal use only — used by widget resolvers to obtain a valid decrypted token. Never exposed to clients. */
  async getValidAccessToken(connectionId: string): Promise<string> {
    const record = await integrationsRepository.findById(connectionId);
    if (!record) throw apiErrors.integrationNotFound("Connection not found.");
    if (record.provider !== "google") throw apiErrors.integrationProviderMismatch("Not a Google connection.");
    if (record.status === "revoked" || record.status === "needs_reauth") {
      throw apiErrors.integrationNeedsReauth("This connection needs to be reconnected.");
    }
    const refreshed = await googleCalendarAdapter.refreshConnectionIfNeeded(record);
    return decryptToken(refreshed.accessTokenEncrypted);
  },
};
