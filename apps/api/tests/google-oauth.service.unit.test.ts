import { afterEach, expect, test, vi } from "vitest";

vi.mock("../src/modules/integrations/providers/google/google.client", () => ({
  googleClient: {
    buildAuthUrl: vi.fn(),
    exchangeCode: vi.fn(),
    fetchUserInfo: vi.fn(),
  },
}));

vi.mock("../src/modules/integrations/integrations.repository", () => ({
  integrationsRepository: {
    upsertByUserProviderExternal: vi.fn(),
  },
}));

vi.mock("../src/core/crypto/encryption", () => ({
  encryptToken: vi.fn((v: string) => `encrypted:${v}`),
  decryptToken: vi.fn((v: string) => v.replace("encrypted:", "")),
}));

vi.mock("../src/core/config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/core/config/env")>();
  return {
    ...actual,
    getAuthJwtSecret: vi.fn(() => "test-jwt-secret-that-is-long-enough"),
    getAppBaseUrl: vi.fn(() => "http://localhost:19006"),
  };
});

import { googleClient } from "../src/modules/integrations/providers/google/google.client";
import { integrationsRepository } from "../src/modules/integrations/integrations.repository";
import { googleOAuthService } from "../src/modules/integrations/providers/google/google-oauth.service";

afterEach(() => {
  vi.clearAllMocks();
});

test("buildAuthorizationUrl delegates to googleClient.buildAuthUrl with signed state", () => {
  vi.mocked(googleClient.buildAuthUrl).mockReturnValue("https://accounts.google.com/auth?state=xyz");

  const url = googleOAuthService.buildAuthorizationUrl("user-1");

  expect(googleClient.buildAuthUrl).toHaveBeenCalledWith(expect.any(String));
  expect(url).toBe("https://accounts.google.com/auth?state=xyz");
});

test("verifyState returns payload for valid state token", () => {
  vi.mocked(googleClient.buildAuthUrl).mockReturnValue("https://accounts.google.com/auth?state=xyz");

  // Build a valid state token and extract it
  let capturedState = "";
  vi.mocked(googleClient.buildAuthUrl).mockImplementation((state) => {
    capturedState = state;
    return `https://accounts.google.com/auth?state=${state}`;
  });

  googleOAuthService.buildAuthorizationUrl("user-1");

  const payload = googleOAuthService.verifyState(capturedState);

  expect(payload.userId).toBe("user-1");
  expect(payload.provider).toBe("google");
  expect(payload.nonce).toEqual(expect.any(String));
});

test("verifyState throws for tampered state", () => {
  expect(() => googleOAuthService.verifyState("tampered.state.token")).toThrow("INVALID_OAUTH_STATE");
});

test("handleCallback returns failure redirect when state is missing", async () => {
  const result = await googleOAuthService.handleCallback({ code: "abc" });

  expect(result.success).toBe(false);
  expect(result.redirectUrl).toContain("missing_state");
});

test("handleCallback returns failure redirect when state is invalid", async () => {
  const result = await googleOAuthService.handleCallback({
    code: "abc",
    state: "invalid.jwt.token",
  });

  expect(result.success).toBe(false);
  expect(result.redirectUrl).toContain("invalid_state");
});

test("handleCallback returns failure redirect when OAuth error is present", async () => {
  let capturedState = "";
  vi.mocked(googleClient.buildAuthUrl).mockImplementation((state) => {
    capturedState = state;
    return `https://google.com/auth?state=${state}`;
  });
  googleOAuthService.buildAuthorizationUrl("user-1");

  const result = await googleOAuthService.handleCallback({
    state: capturedState,
    error: "access_denied",
  });

  expect(result.success).toBe(false);
  expect(result.redirectUrl).toContain("oauth_denied");
});

test("handleCallback returns failure redirect when code is missing", async () => {
  let capturedState = "";
  vi.mocked(googleClient.buildAuthUrl).mockImplementation((state) => {
    capturedState = state;
    return `https://google.com/auth?state=${state}`;
  });
  googleOAuthService.buildAuthorizationUrl("user-1");

  const result = await googleOAuthService.handleCallback({ state: capturedState });

  expect(result.success).toBe(false);
  expect(result.redirectUrl).toContain("missing_code");
});

test("handleCallback exchanges code and upserts connection on success", async () => {
  let capturedState = "";
  vi.mocked(googleClient.buildAuthUrl).mockImplementation((state) => {
    capturedState = state;
    return `https://google.com/auth?state=${state}`;
  });
  googleOAuthService.buildAuthorizationUrl("user-1");

  vi.mocked(googleClient.exchangeCode).mockResolvedValue({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: new Date("2026-03-25T13:00:00Z"),
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
  vi.mocked(googleClient.fetchUserInfo).mockResolvedValue({
    id: "google-uid-1",
    email: "owner@example.com",
    name: "Owner",
    picture: "https://example.com/pic.jpg",
  });
  vi.mocked(integrationsRepository.upsertByUserProviderExternal).mockResolvedValue({} as never);

  const result = await googleOAuthService.handleCallback({
    code: "auth-code",
    state: capturedState,
  });

  expect(result.success).toBe(true);
  expect(result.redirectUrl).toContain("status=success");
  expect(integrationsRepository.upsertByUserProviderExternal).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "user-1",
      provider: "google",
      externalAccountId: "google-uid-1",
      accountLabel: "owner@example.com",
    }),
  );
});

test("handleCallback returns failure redirect when token exchange throws", async () => {
  let capturedState = "";
  vi.mocked(googleClient.buildAuthUrl).mockImplementation((state) => {
    capturedState = state;
    return `https://google.com/auth?state=${state}`;
  });
  googleOAuthService.buildAuthorizationUrl("user-1");

  vi.mocked(googleClient.exchangeCode).mockRejectedValue(new Error("GOOGLE_TOKEN_EXCHANGE_FAILED:400"));

  const result = await googleOAuthService.handleCallback({
    code: "bad-code",
    state: capturedState,
  });

  expect(result.success).toBe(false);
  expect(result.redirectUrl).toContain("oauth_failed");
});
