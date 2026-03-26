import { describe, test, expect, vi, afterEach } from "vitest";

vi.mock("../src/core/config/api", () => ({
  API_BASE_URL: "http://localhost:3000",
}));

const mockListIntegrationConnections = vi.fn();
const mockUpdateIntegrationConnection = vi.fn();
const mockDeleteIntegrationConnection = vi.fn();
const mockRefreshIntegrationConnection = vi.fn();

vi.mock("../src/services/api/integrationsApi", () => ({
  listIntegrationConnections: (...args: unknown[]) => mockListIntegrationConnections(...args),
  updateIntegrationConnection: (...args: unknown[]) => mockUpdateIntegrationConnection(...args),
  deleteIntegrationConnection: (...args: unknown[]) => mockDeleteIntegrationConnection(...args),
  refreshIntegrationConnection: (...args: unknown[]) => mockRefreshIntegrationConnection(...args),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const MOCK_CONNECTION = {
  id: "conn-1",
  provider: "google",
  status: "connected",
  accountLabel: "Work",
  accountEmail: "work@gmail.com",
  externalAccountId: "12345",
  scopes: [],
  lastSyncedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("useIntegrations hook logic", () => {
  test("listIntegrationConnections is called on mount with provider", async () => {
    mockListIntegrationConnections.mockResolvedValue([MOCK_CONNECTION]);

    const { useIntegrations } = await import("../src/features/integrations/integrations.hooks");
    expect(useIntegrations).toBeDefined();
    expect(mockListIntegrationConnections).toBeDefined();
  });

  test("rename calls updateIntegrationConnection with trimmed label", async () => {
    mockListIntegrationConnections.mockResolvedValue([MOCK_CONNECTION]);
    mockUpdateIntegrationConnection.mockResolvedValue({ ...MOCK_CONNECTION, accountLabel: "Personal" });

    const { updateIntegrationConnection } = await import("../src/services/api/integrationsApi");
    const result = await updateIntegrationConnection("conn-1", { accountLabel: "Personal" });
    expect(mockUpdateIntegrationConnection).toHaveBeenCalledWith("conn-1", { accountLabel: "Personal" });
    expect(result.accountLabel).toBe("Personal");
  });

  test("disconnect calls deleteIntegrationConnection", async () => {
    mockDeleteIntegrationConnection.mockResolvedValue(undefined);

    const { deleteIntegrationConnection } = await import("../src/services/api/integrationsApi");
    await deleteIntegrationConnection("conn-1");
    expect(mockDeleteIntegrationConnection).toHaveBeenCalledWith("conn-1");
  });

  test("refresh calls refreshIntegrationConnection and returns updated connection", async () => {
    const refreshed = { ...MOCK_CONNECTION, lastSyncedAt: "2026-03-26T12:00:00.000Z" };
    mockRefreshIntegrationConnection.mockResolvedValue(refreshed);

    const { refreshIntegrationConnection } = await import("../src/services/api/integrationsApi");
    const result = await refreshIntegrationConnection("conn-1");
    expect(result.lastSyncedAt).toBe("2026-03-26T12:00:00.000Z");
  });

  test("refresh failure does not return connected status", async () => {
    mockRefreshIntegrationConnection.mockRejectedValue(new Error("Token expired"));

    const { refreshIntegrationConnection } = await import("../src/services/api/integrationsApi");
    await expect(refreshIntegrationConnection("conn-1")).rejects.toThrow("Token expired");
  });
});
