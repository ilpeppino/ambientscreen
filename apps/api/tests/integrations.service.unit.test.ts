import { afterEach, expect, test, vi } from "vitest";

vi.mock("../src/modules/integrations/integrations.repository", () => ({
  integrationsRepository: {
    listByUser: vi.fn(),
    findByUserAndId: vi.fn(),
    update: vi.fn(),
    markRevoked: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the dynamic import used in refreshConnection
vi.mock("../src/modules/integrations/providers/google/google-calendar.adapter", () => ({
  googleCalendarAdapter: {
    validateConnection: vi.fn(),
    refreshConnectionIfNeeded: vi.fn(),
  },
}));

vi.mock("../src/modules/integrations/providers/google/google-oauth.service", () => ({
  googleOAuthService: {
    buildAuthorizationUrl: vi.fn(),
  },
}));

import { integrationsRepository } from "../src/modules/integrations/integrations.repository";
import { googleCalendarAdapter } from "../src/modules/integrations/providers/google/google-calendar.adapter";
import { googleOAuthService } from "../src/modules/integrations/providers/google/google-oauth.service";
import { integrationsService } from "../src/modules/integrations/integrations.service";

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
  tokenExpiresAt: new Date("2026-03-25T12:00:00Z"),
  metadataJson: '{"email":"owner@example.com","name":"Owner User"}',
  lastSyncedAt: null,
  createdAt: new Date("2026-03-25T10:00:00Z"),
  updatedAt: new Date("2026-03-25T10:00:00Z"),
};

afterEach(() => {
  vi.clearAllMocks();
});

test("listConnections returns mapped summaries", async () => {
  vi.mocked(integrationsRepository.listByUser).mockResolvedValue([baseRecord] as never);

  const result = await integrationsService.listConnections("user-1");

  expect(integrationsRepository.listByUser).toHaveBeenCalledWith("user-1", {});
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    id: "conn-1",
    provider: "google",
    status: "connected",
    accountEmail: "owner@example.com",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
});

test("listConnections passes filters to repository", async () => {
  vi.mocked(integrationsRepository.listByUser).mockResolvedValue([] as never);

  await integrationsService.listConnections("user-1", { provider: "google", status: "connected" });

  expect(integrationsRepository.listByUser).toHaveBeenCalledWith("user-1", {
    provider: "google",
    status: "connected",
  });
});

test("listProviders returns supported provider descriptors", () => {
  const providers = integrationsService.listProviders();

  expect(providers).toEqual([
    expect.objectContaining({
      key: "google",
      label: "Google",
      description: expect.stringContaining("calendar"),
      authType: "oauth",
    }),
  ]);
});

test("getProviderConnectAuthorizationUrl delegates to google oauth builder", async () => {
  vi.mocked(googleOAuthService.buildAuthorizationUrl).mockReturnValue("https://accounts.google.com/auth?state=xyz");

  const url = await integrationsService.getProviderConnectAuthorizationUrl("user-1", "google", "ambientscreen://integrations");

  expect(googleOAuthService.buildAuthorizationUrl).toHaveBeenCalledWith(
    "user-1",
    "ambientscreen://integrations",
  );
  expect(url).toBe("https://accounts.google.com/auth?state=xyz");
});

test("getConnectionById returns summary for owned connection", async () => {
  vi.mocked(integrationsRepository.findByUserAndId).mockResolvedValue(baseRecord as never);

  const result = await integrationsService.getConnectionById("user-1", "conn-1");

  expect(result.id).toBe("conn-1");
  expect(result.accountEmail).toBe("owner@example.com");
});

test("getConnectionById throws INTEGRATION_NOT_FOUND when connection missing", async () => {
  vi.mocked(integrationsRepository.findByUserAndId).mockResolvedValue(null);

  await expect(integrationsService.getConnectionById("user-1", "unknown")).rejects.toMatchObject({
    code: "INTEGRATION_NOT_FOUND",
    status: 404,
  });
});

test("updateConnectionLabel updates label and returns summary", async () => {
  const updated = { ...baseRecord, accountLabel: "My Calendar" };
  vi.mocked(integrationsRepository.findByUserAndId).mockResolvedValue(baseRecord as never);
  vi.mocked(integrationsRepository.update).mockResolvedValue(updated as never);

  const result = await integrationsService.updateConnectionLabel("user-1", "conn-1", {
    accountLabel: "My Calendar",
  });

  expect(integrationsRepository.update).toHaveBeenCalledWith(
    "conn-1",
    expect.objectContaining({ accountLabel: "My Calendar" }),
  );
  expect(result.accountLabel).toBe("My Calendar");
});

test("updateConnectionLabel throws INTEGRATION_NOT_FOUND when connection missing", async () => {
  vi.mocked(integrationsRepository.findByUserAndId).mockResolvedValue(null);

  await expect(
    integrationsService.updateConnectionLabel("user-1", "unknown", { accountLabel: "x" }),
  ).rejects.toMatchObject({ code: "INTEGRATION_NOT_FOUND" });
});

test("deleteConnection deletes connection after ownership check", async () => {
  vi.mocked(integrationsRepository.findByUserAndId).mockResolvedValue(baseRecord as never);
  vi.mocked(integrationsRepository.delete).mockResolvedValue({ ...baseRecord, status: "revoked" } as never);

  await integrationsService.deleteConnection("user-1", "conn-1");

  expect(integrationsRepository.delete).toHaveBeenCalledWith("conn-1");
});

test("deleteConnection throws INTEGRATION_NOT_FOUND when connection missing", async () => {
  vi.mocked(integrationsRepository.findByUserAndId).mockResolvedValue(null);

  await expect(integrationsService.deleteConnection("user-1", "unknown")).rejects.toMatchObject({
    code: "INTEGRATION_NOT_FOUND",
  });
});

test("refreshConnection throws INTEGRATION_NEEDS_REAUTH for revoked connection", async () => {
  vi.mocked(integrationsRepository.findByUserAndId).mockResolvedValue({
    ...baseRecord,
    status: "revoked",
  } as never);

  await expect(integrationsService.refreshConnection("user-1", "conn-1")).rejects.toMatchObject({
    code: "INTEGRATION_NEEDS_REAUTH",
    status: 409,
  });
});

test("refreshConnection delegates to googleCalendarAdapter for google provider", async () => {
  vi.mocked(integrationsRepository.findByUserAndId).mockResolvedValue(baseRecord as never);
  vi.mocked(googleCalendarAdapter.validateConnection).mockResolvedValue(true as never);
  vi.mocked(googleCalendarAdapter.refreshConnectionIfNeeded).mockResolvedValue(baseRecord as never);

  const result = await integrationsService.refreshConnection("user-1", "conn-1");

  expect(googleCalendarAdapter.validateConnection).toHaveBeenCalledWith(baseRecord);
  expect(googleCalendarAdapter.refreshConnectionIfNeeded).toHaveBeenCalledWith(baseRecord);
  expect(result.id).toBe("conn-1");
});

test("refreshConnection marks needs_reauth and throws when adapter validation fails", async () => {
  vi.mocked(integrationsRepository.findByUserAndId).mockResolvedValue(baseRecord as never);
  vi.mocked(googleCalendarAdapter.validateConnection).mockResolvedValue(false as never);
  vi.mocked(integrationsRepository.update).mockResolvedValue({ ...baseRecord, status: "needs_reauth" } as never);

  await expect(integrationsService.refreshConnection("user-1", "conn-1")).rejects.toMatchObject({
    code: "INTEGRATION_NEEDS_REAUTH",
  });
  expect(integrationsRepository.update).toHaveBeenCalledWith("conn-1", { status: "needs_reauth" });
});

test("refreshConnection throws INTEGRATION_PROVIDER_MISMATCH for unsupported provider", async () => {
  vi.mocked(integrationsRepository.findByUserAndId).mockResolvedValue({
    ...baseRecord,
    provider: "slack",
  } as never);

  await expect(integrationsService.refreshConnection("user-1", "conn-1")).rejects.toMatchObject({
    code: "INTEGRATION_PROVIDER_MISMATCH",
  });
});
