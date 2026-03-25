import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { getAuthJwtSecret } from "../../core/config/env";
import { encryptToken, decryptToken } from "./encryption";
import { integrationConnectionRepository } from "./integrationConnection.repository";
import type { IntegrationConnection } from "@prisma/client";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const OAUTH_STATE_TTL_SECONDS = 600;

interface OAuthStatePayload {
  userId: string;
  nonce: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfoResponse {
  email: string;
  sub: string;
}

export interface PublicIntegrationConnection {
  id: string;
  provider: string;
  externalAccountId: string;
  label: string | null;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
}

function toPublicConnection(conn: IntegrationConnection): PublicIntegrationConnection {
  return {
    id: conn.id,
    provider: conn.provider,
    externalAccountId: conn.externalAccountId,
    label: conn.label,
    scopes: conn.scopes,
    expiresAt: conn.expiresAt?.toISOString() ?? null,
    createdAt: conn.createdAt.toISOString(),
  };
}

function getGoogleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!id) throw new Error("GOOGLE_CLIENT_ID is not configured");
  return id;
}

function getGoogleClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  return secret;
}

function getGoogleRedirectUri(): string {
  const uri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!uri) throw new Error("GOOGLE_REDIRECT_URI is not configured");
  return uri;
}

function getFrontendUrl(): string {
  return process.env.FRONTEND_URL?.trim() ?? "http://localhost:8081";
}

export const integrationsService = {
  buildGoogleOAuthUrl(userId: string): string {
    const state = jwt.sign(
      { userId, nonce: randomBytes(16).toString("hex") } satisfies OAuthStatePayload,
      getAuthJwtSecret(),
      { expiresIn: OAUTH_STATE_TTL_SECONDS },
    );

    const params = new URLSearchParams({
      client_id: getGoogleClientId(),
      redirect_uri: getGoogleRedirectUri(),
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  async handleGoogleCallback(
    code: string,
    state: string,
    fetchImpl?: typeof fetch,
  ): Promise<{ connectionId: string; userId: string; redirectUrl: string }> {
    const doFetch = fetchImpl ?? fetch;

    let statePayload: OAuthStatePayload;
    try {
      statePayload = jwt.verify(state, getAuthJwtSecret()) as OAuthStatePayload;
    } catch {
      throw new Error("INVALID_STATE");
    }

    const { userId } = statePayload;

    const tokenParams = new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    });

    const tokenResponse = await doFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error("TOKEN_EXCHANGE_FAILED");
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

    const userInfoResponse = await doFetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error("USERINFO_FETCH_FAILED");
    }

    const userInfo = (await userInfoResponse.json()) as GoogleUserInfoResponse;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    const scopes = tokenData.scope.split(" ");

    const connection = await integrationConnectionRepository.upsert({
      userId,
      provider: "google",
      externalAccountId: userInfo.email,
      encryptedAccessToken: encryptToken(tokenData.access_token),
      encryptedRefreshToken: tokenData.refresh_token
        ? encryptToken(tokenData.refresh_token)
        : null,
      tokenType: tokenData.token_type ?? "Bearer",
      scopes,
      expiresAt,
      label: userInfo.email,
    });

    return {
      connectionId: connection.id,
      userId,
      redirectUrl: `${getFrontendUrl()}?integration_connected=google`,
    };
  },

  async getValidAccessToken(
    connectionId: string,
    fetchImpl?: typeof fetch,
  ): Promise<string> {
    const connection = await integrationConnectionRepository.findById(connectionId);
    if (!connection) {
      throw new Error("CONNECTION_NOT_FOUND");
    }

    let accessToken = decryptToken(connection.encryptedAccessToken);

    const bufferMs = 5 * 60 * 1000;
    const isExpiring =
      connection.expiresAt != null &&
      connection.expiresAt.getTime() - bufferMs < Date.now();

    if (isExpiring && connection.encryptedRefreshToken) {
      const refreshToken = decryptToken(connection.encryptedRefreshToken);
      const refreshed = await this.refreshGoogleToken(refreshToken, fetchImpl);
      accessToken = refreshed.accessToken;

      void integrationConnectionRepository.updateTokens(connection.id, {
        encryptedAccessToken: encryptToken(refreshed.accessToken),
        expiresAt: refreshed.expiresAt,
      });
    }

    return accessToken;
  },

  async refreshGoogleToken(
    refreshToken: string,
    fetchImpl?: typeof fetch,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const doFetch = fetchImpl ?? fetch;

    const params = new URLSearchParams({
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await doFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error("TOKEN_REFRESH_FAILED");
    }

    const data = (await response.json()) as GoogleTokenResponse;
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async listConnections(userId: string): Promise<PublicIntegrationConnection[]> {
    const connections = await integrationConnectionRepository.findByUserId(userId);
    return connections.map(toPublicConnection);
  },

  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    const connection = await integrationConnectionRepository.findById(connectionId);
    if (!connection) {
      throw new Error("CONNECTION_NOT_FOUND");
    }
    if (connection.userId !== userId) {
      throw new Error("FORBIDDEN");
    }
    await integrationConnectionRepository.delete(connectionId);
  },
};
