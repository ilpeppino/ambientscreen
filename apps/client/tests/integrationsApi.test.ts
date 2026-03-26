import { afterEach, describe, expect, test, vi } from "vitest";
import { setApiAuthToken } from "../src/services/api/apiClient";

vi.mock("../src/core/config/api", () => ({
  API_BASE_URL: "http://localhost:3000",
}));

afterEach(() => {
  vi.restoreAllMocks();
  setApiAuthToken(null);
});

const MOCK_CONNECTION = {
  id: "conn-abc",
  provider: "google",
  status: "connected",
  accountLabel: "Work Account",
  accountEmail: "work@gmail.com",
  externalAccountId: "12345",
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  lastSyncedAt: "2026-03-20T10:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-03-20T10:00:00.000Z",
};

describe("listIntegrationConnections", () => {
  test("returns connections array from { items } envelope", async () => {
    const { listIntegrationConnections } = await import("../src/services/api/integrationsApi");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [MOCK_CONNECTION] }), { status: 200 }),
    );

    const result = await listIntegrationConnections();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "conn-abc", status: "connected" });
  });

  test("sends provider query param when provided", async () => {
    const { listIntegrationConnections } = await import("../src/services/api/integrationsApi");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    );

    await listIntegrationConnections("google");

    const [url] = fetchSpy.mock.calls[0] ?? [];
    expect(String(url)).toContain("provider=google");
  });

  test("never exposes token material in results", async () => {
    const { listIntegrationConnections } = await import("../src/services/api/integrationsApi");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [MOCK_CONNECTION] }), { status: 200 }),
    );

    const result = await listIntegrationConnections();
    expect(result[0]).not.toHaveProperty("accessToken");
    expect(result[0]).not.toHaveProperty("refreshToken");
    expect(result[0]).not.toHaveProperty("accessTokenEncrypted");
    expect(result[0]).not.toHaveProperty("refreshTokenEncrypted");
  });

  test("throws on non-200 response", async () => {
    const { listIntegrationConnections } = await import("../src/services/api/integrationsApi");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );

    await expect(listIntegrationConnections()).rejects.toBeDefined();
  });
});

describe("updateIntegrationConnection", () => {
  test("sends PATCH with accountLabel", async () => {
    const { updateIntegrationConnection } = await import("../src/services/api/integrationsApi");
    setApiAuthToken("tok-123");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ...MOCK_CONNECTION, accountLabel: "Personal" }), { status: 200 }),
    );

    const result = await updateIntegrationConnection("conn-abc", { accountLabel: "Personal" });

    expect(result.accountLabel).toBe("Personal");
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ accountLabel: "Personal" });
  });

  test("supports null accountLabel (clears label)", async () => {
    const { updateIntegrationConnection } = await import("../src/services/api/integrationsApi");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ...MOCK_CONNECTION, accountLabel: null }), { status: 200 }),
    );

    const result = await updateIntegrationConnection("conn-abc", { accountLabel: null });
    expect(result.accountLabel).toBeNull();
  });
});

describe("deleteIntegrationConnection", () => {
  test("sends DELETE and resolves on 204", async () => {
    const { deleteIntegrationConnection } = await import("../src/services/api/integrationsApi");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await expect(deleteIntegrationConnection("conn-abc")).resolves.toBeUndefined();
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    expect(init?.method).toBe("DELETE");
  });
});

describe("refreshIntegrationConnection", () => {
  test("sends POST to /refresh and returns updated connection", async () => {
    const { refreshIntegrationConnection } = await import("../src/services/api/integrationsApi");

    const refreshed = { ...MOCK_CONNECTION, lastSyncedAt: "2026-03-26T12:00:00.000Z" };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(refreshed), { status: 200 }),
    );

    const result = await refreshIntegrationConnection("conn-abc");

    expect(result.lastSyncedAt).toBe("2026-03-26T12:00:00.000Z");
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(String(url)).toContain("/refresh");
    expect(init?.method).toBe("POST");
  });

  test("throws when refresh fails (e.g. needs_reauth)", async () => {
    const { refreshIntegrationConnection } = await import("../src/services/api/integrationsApi");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Token expired" }), { status: 422 }),
    );

    await expect(refreshIntegrationConnection("conn-abc")).rejects.toBeDefined();
  });
});

describe("listGoogleCalendars", () => {
  test("sends integrationConnectionId as query param", async () => {
    const { listGoogleCalendars } = await import("../src/services/api/integrationsApi");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: "primary", summary: "My Calendar", primary: true, accessRole: "owner" }] }), { status: 200 }),
    );

    const result = await listGoogleCalendars("conn-abc");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("primary");
    const [url] = fetchSpy.mock.calls[0] ?? [];
    expect(String(url)).toContain("integrationConnectionId=conn-abc");
  });
});

describe("getGoogleConnectUrl", () => {
  test("returns /start path without returnTo", async () => {
    const { getGoogleConnectUrl } = await import("../src/services/api/integrationsApi");
    const url = getGoogleConnectUrl();
    expect(url).toContain("/start");
    expect(url).not.toContain("/connect");
    expect(url).not.toContain("returnTo");
  });

  test("appends returnTo query param when provided", async () => {
    const { getGoogleConnectUrl } = await import("../src/services/api/integrationsApi");
    const url = getGoogleConnectUrl("ambientscreen://integrations");
    expect(url).toContain("/start?");
    expect(url).toContain("returnTo=");
    // returnTo value must be URL-encoded
    const parsed = new URL(url);
    expect(parsed.searchParams.get("returnTo")).toBe("ambientscreen://integrations");
  });
});
