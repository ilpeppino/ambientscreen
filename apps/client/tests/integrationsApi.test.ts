import { afterEach, describe, expect, test, vi } from "vitest";
import { setApiAuthToken } from "../src/services/api/apiClient";
import {
  getIntegrationProviderAuthorizationUrl,
  listIntegrationProviders,
} from "../src/services/api/integrationsApi";

function makeJsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
  setApiAuthToken(null);
});

describe("integrations api", () => {
  test("listIntegrationProviders uses the authenticated api client", async () => {
    setApiAuthToken("token-123");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      makeJsonResponse({
        items: [
          {
            key: "google",
            label: "Google",
            description: "Connect a Google account to access calendar resources.",
            authType: "oauth",
          },
        ],
      }),
    );

    const providers = await listIntegrationProviders();

    expect(providers).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/integrations/providers"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  test("getIntegrationProviderAuthorizationUrl includes auth headers and returns the authorization url", async () => {
    setApiAuthToken("token-abc");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      makeJsonResponse({
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      }),
    );

    const url = await getIntegrationProviderAuthorizationUrl("google", "ambientscreen://integrations");

    expect(url).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/integrations/providers/google/start"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-abc",
        }),
      }),
    );
  });
});
