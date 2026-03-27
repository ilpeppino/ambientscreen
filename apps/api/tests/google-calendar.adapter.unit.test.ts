import { afterEach, expect, test, vi } from "vitest";

vi.mock("../src/core/crypto/encryption", () => ({
  decryptToken: vi.fn((v: string) => `plain:${v}`),
  encryptToken: vi.fn((v: string) => `encrypted:${v}`),
}));

vi.mock("../src/modules/integrations/integrations.repository", () => ({
  integrationsRepository: {
    update: vi.fn(),
    touchLastSynced: vi.fn(),
  },
}));

vi.mock("../src/modules/integrations/providers/google/google.client", () => ({
  googleClient: {
    refreshAccessToken: vi.fn(),
    fetchCalendarList: vi.fn(),
  },
}));

import { integrationsRepository } from "../src/modules/integrations/integrations.repository";
import { googleClient } from "../src/modules/integrations/providers/google/google.client";
import { googleCalendarAdapter } from "../src/modules/integrations/providers/google/google-calendar.adapter";

const baseRecord = {
  id: "conn-1",
  userId: "user-1",
  provider: "google",
  status: "connected",
  accountLabel: "owner@example.com",
  externalAccountId: "google-uid-1",
  scopesJson: '["https://www.googleapis.com/auth/calendar.readonly"]',
  accessTokenEncrypted: "iv:tag:data",
  refreshTokenEncrypted: "iv:tag:rdata",
  tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  metadataJson: '{"email":"owner@example.com"}',
  lastSyncedAt: null,
  createdAt: new Date("2026-03-25T10:00:00Z"),
  updatedAt: new Date("2026-03-25T10:00:00Z"),
};

afterEach(() => {
  vi.clearAllMocks();
});

test("validateConnection returns true for active google connection with token", async () => {
  const result = await googleCalendarAdapter.validateConnection(baseRecord);
  expect(result).toBe(true);
});

test("validateConnection returns false for revoked connection", async () => {
  const result = await googleCalendarAdapter.validateConnection({ ...baseRecord, status: "revoked" });
  expect(result).toBe(false);
});

test("validateConnection returns false for non-google provider", async () => {
  const result = await googleCalendarAdapter.validateConnection({ ...baseRecord, provider: "slack" });
  expect(result).toBe(false);
});

test("validateConnection returns false when accessTokenEncrypted is empty", async () => {
  const result = await googleCalendarAdapter.validateConnection({
    ...baseRecord,
    accessTokenEncrypted: "",
  });
  expect(result).toBe(false);
});

test("refreshConnectionIfNeeded returns connection unchanged when token is fresh", async () => {
  const result = await googleCalendarAdapter.refreshConnectionIfNeeded(baseRecord);

  expect(result).toBe(baseRecord);
  expect(googleClient.refreshAccessToken).not.toHaveBeenCalled();
});

test("refreshConnectionIfNeeded refreshes when token expires within 5 minutes", async () => {
  const nearExpiry = {
    ...baseRecord,
    tokenExpiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
  };

  const refreshed = {
    ...baseRecord,
    accessTokenEncrypted: "new:iv:data",
    tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };

  vi.mocked(googleClient.refreshAccessToken).mockResolvedValue({
    accessToken: "new-access-token",
    refreshToken: "new-refresh-token",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
  vi.mocked(integrationsRepository.update).mockResolvedValue(refreshed as never);

  const result = await googleCalendarAdapter.refreshConnectionIfNeeded(nearExpiry);

  expect(googleClient.refreshAccessToken).toHaveBeenCalledTimes(1);
  expect(integrationsRepository.update).toHaveBeenCalledWith(
    "conn-1",
    expect.objectContaining({ status: "connected" }),
  );
  expect(result).toBe(refreshed);
});

test("refreshConnectionIfNeeded throws INTEGRATION_NEEDS_REAUTH when no refresh token", async () => {
  const noRefresh = {
    ...baseRecord,
    refreshTokenEncrypted: null,
    tokenExpiresAt: new Date(Date.now() + 2 * 60 * 1000), // expires soon
  };

  vi.mocked(integrationsRepository.update).mockResolvedValue({ ...noRefresh, status: "needs_reauth" } as never);

  await expect(googleCalendarAdapter.refreshConnectionIfNeeded(noRefresh)).rejects.toThrow(
    "INTEGRATION_NEEDS_REAUTH",
  );
  expect(integrationsRepository.update).toHaveBeenCalledWith("conn-1", { status: "needs_reauth" });
});

test("refreshConnectionIfNeeded marks needs_reauth and throws INTEGRATION_REFRESH_FAILED when refresh call fails", async () => {
  const nearExpiry = {
    ...baseRecord,
    tokenExpiresAt: new Date(Date.now() + 2 * 60 * 1000),
  };

  vi.mocked(googleClient.refreshAccessToken).mockRejectedValue(new Error("GOOGLE_REFRESH_FAILED:400"));
  vi.mocked(integrationsRepository.update).mockResolvedValue({ ...nearExpiry, status: "needs_reauth" } as never);

  await expect(googleCalendarAdapter.refreshConnectionIfNeeded(nearExpiry)).rejects.toThrow(
    "INTEGRATION_REFRESH_FAILED",
  );
  expect(integrationsRepository.update).toHaveBeenCalledWith("conn-1", { status: "needs_reauth" });
});

test("fetchCalendars returns calendar list and touches lastSyncedAt", async () => {
  const calendars = [
    { id: "cal-1", summary: "Primary Calendar", primary: true, accessRole: "owner" },
    { id: "cal-2", summary: "Work Calendar", primary: false, accessRole: "reader" },
  ];

  vi.mocked(googleClient.fetchCalendarList).mockResolvedValue(calendars);
  vi.mocked(integrationsRepository.touchLastSynced).mockResolvedValue(baseRecord as never);

  const result = await googleCalendarAdapter.fetchCalendars(baseRecord);

  expect(googleClient.fetchCalendarList).toHaveBeenCalledTimes(1);
  expect(integrationsRepository.touchLastSynced).toHaveBeenCalledWith("conn-1", expect.any(Date));
  expect(result).toEqual(calendars);
});
