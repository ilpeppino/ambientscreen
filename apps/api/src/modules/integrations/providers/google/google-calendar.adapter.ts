import { decryptToken, encryptToken } from "../../../../core/crypto/encryption";
import { integrationsRepository } from "../../integrations.repository";
import { googleClient } from "./google.client";
import type { IntegrationConnectionRecord, GoogleCalendarOption } from "../../integrations.types";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export const googleCalendarAdapter = {
  async validateConnection(connection: IntegrationConnectionRecord): Promise<boolean> {
    if (connection.status === "revoked") return false;
    if (connection.provider !== "google") return false;
    if (!connection.accessTokenEncrypted) return false;
    return true;
  },

  async refreshConnectionIfNeeded(connection: IntegrationConnectionRecord): Promise<IntegrationConnectionRecord> {
    const needsRefresh =
      !connection.tokenExpiresAt ||
      connection.tokenExpiresAt.getTime() - Date.now() < TOKEN_REFRESH_BUFFER_MS;

    if (!needsRefresh) return connection;

    if (!connection.refreshTokenEncrypted) {
      await integrationsRepository.update(connection.id, { status: "needs_reauth" });
      throw new Error("INTEGRATION_NEEDS_REAUTH");
    }

    try {
      const refreshToken = decryptToken(connection.refreshTokenEncrypted);
      const newTokenSet = await googleClient.refreshAccessToken(refreshToken);

      const updated = await integrationsRepository.update(connection.id, {
        status: "connected",
        accessTokenEncrypted: encryptToken(newTokenSet.accessToken),
        refreshTokenEncrypted: newTokenSet.refreshToken
          ? encryptToken(newTokenSet.refreshToken)
          : connection.refreshTokenEncrypted,
        tokenExpiresAt: newTokenSet.expiresAt,
        scopesJson: newTokenSet.scopes.length > 0 ? JSON.stringify(newTokenSet.scopes) : connection.scopesJson,
      });

      return updated;
    } catch (err) {
      if ((err as Error).message === "INTEGRATION_NEEDS_REAUTH") throw err;
      await integrationsRepository.update(connection.id, { status: "needs_reauth" });
      throw new Error("INTEGRATION_REFRESH_FAILED");
    }
  },

  async fetchCalendars(connection: IntegrationConnectionRecord): Promise<GoogleCalendarOption[]> {
    const live = await this.refreshConnectionIfNeeded(connection);
    const accessToken = decryptToken(live.accessTokenEncrypted);
    const items = await googleClient.fetchCalendarList(accessToken);
    await integrationsRepository.touchLastSynced(connection.id, new Date());
    return items;
  },
};
