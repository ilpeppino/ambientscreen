import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { getAuthJwtSecret, getAppBaseUrl } from "../../../../core/config/env";
import { encryptToken } from "../../../../core/crypto/encryption";
import { googleClient } from "./google.client";
import { integrationsRepository } from "../../integrations.repository";

const OAUTH_STATE_EXPIRES_IN = "10m";

interface OAuthStatePayload {
  userId: string;
  provider: string;
  nonce: string;
  returnTo?: string;
}

export const googleOAuthService = {
  buildAuthorizationUrl(userId: string, returnTo?: string): string {
    const nonce = randomUUID();
    const payload: OAuthStatePayload = { userId, provider: "google", nonce, returnTo };
    const state = jwt.sign(payload, getAuthJwtSecret(), { expiresIn: OAUTH_STATE_EXPIRES_IN });
    return googleClient.buildAuthUrl(state);
  },

  verifyState(state: string): OAuthStatePayload {
    try {
      const payload = jwt.verify(state, getAuthJwtSecret()) as OAuthStatePayload & { exp: number };
      if (payload.provider !== "google") throw new Error("Wrong provider in state");
      return payload;
    } catch {
      throw new Error("INVALID_OAUTH_STATE");
    }
  },

  async handleCallback(query: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<{ success: boolean; redirectUrl: string }> {
    const baseUrl = getAppBaseUrl();
    const defaultSuccess = `${baseUrl}/integrations?provider=google&status=success`;
    const defaultFailure = (code: string) =>
      `${baseUrl}/integrations?provider=google&status=error&code=${code}`;

    if (!query.state) {
      return { success: false, redirectUrl: defaultFailure("missing_state") };
    }

    let statePayload: OAuthStatePayload;
    try {
      statePayload = this.verifyState(query.state);
    } catch {
      return { success: false, redirectUrl: defaultFailure("invalid_state") };
    }

    // Build a redirect URL, applying returnTo as a base when provided.
    // status and error code are always appended as query params so the
    // client can show appropriate feedback regardless of platform.
    const buildRedirectUrl = (status: "success" | "error", errorCode?: string): string => {
      const returnTo = statePayload.returnTo;
      if (returnTo) {
        try {
          const url = new URL(returnTo);
          url.searchParams.set("provider", "google");
          url.searchParams.set("status", status);
          if (errorCode) url.searchParams.set("code", errorCode);
          return url.toString();
        } catch {
          // returnTo is not a valid URL — fall through to default
        }
      }
      return status === "success" ? defaultSuccess : defaultFailure(errorCode ?? "unknown");
    };

    if (query.error) {
      return { success: false, redirectUrl: buildRedirectUrl("error", "oauth_denied") };
    }

    if (!query.code) {
      return { success: false, redirectUrl: buildRedirectUrl("error", "missing_code") };
    }

    try {
      const tokenSet = await googleClient.exchangeCode(query.code);
      const userInfo = await googleClient.fetchUserInfo(tokenSet.accessToken);

      const encryptedAccess = encryptToken(tokenSet.accessToken);
      const encryptedRefresh = tokenSet.refreshToken ? encryptToken(tokenSet.refreshToken) : null;

      await integrationsRepository.upsertByUserProviderExternal({
        userId: statePayload.userId,
        provider: "google",
        status: "connected",
        externalAccountId: userInfo.id,
        scopesJson: JSON.stringify(tokenSet.scopes),
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh,
        tokenExpiresAt: tokenSet.expiresAt,
        metadataJson: JSON.stringify({
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        }),
        accountLabel: userInfo.email ?? null,
      });

      return { success: true, redirectUrl: buildRedirectUrl("success") };
    } catch {
      return { success: false, redirectUrl: buildRedirectUrl("error", "oauth_failed") };
    }
  },
};


