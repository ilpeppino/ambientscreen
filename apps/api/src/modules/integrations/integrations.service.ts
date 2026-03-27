import { apiErrors } from "../../core/http/api-error";
import { integrationsRepository } from "./integrations.repository";
import { toSummary } from "./integration-connection.mapper";
import { googleCalendarAdapter } from "./providers/google/google-calendar.adapter";
import { decryptToken } from "../../core/crypto/encryption";
import type { IntegrationConnectionSummary } from "./integrations.types";

interface ListConnectionsFilter {
  provider?: string;
  status?: string;
}

export const integrationsService = {
  async listConnections(userId: string, filters: ListConnectionsFilter = {}): Promise<IntegrationConnectionSummary[]> {
    const records = await integrationsRepository.listByUser(userId, filters);
    return records.map(toSummary);
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
