import { afterEach, expect, test, vi } from "vitest";
import { setApiAuthToken } from "../src/services/api/apiClient";

vi.mock("../src/core/config/api", () => ({
  API_BASE_URL: "http://localhost:3000",
}));

afterEach(() => {
  vi.restoreAllMocks();
  setApiAuthToken(null);
});

test("getProfiles returns cloud profile list with activeProfileId", async () => {
  const { getProfiles } = await import("../src/services/api/profilesApi");
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({
      profiles: [
        {
          id: "profile-1",
          userId: "user-1",
          name: "Default",
          isDefault: true,
          createdAt: "2026-03-21T10:00:00.000Z",
        },
      ],
      activeProfileId: "profile-1",
    }), { status: 200 }),
  );

  const result = await getProfiles();

  expect(result.activeProfileId).toBe("profile-1");
  expect(result.profiles.length).toBe(1);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

test("activateProfile sends authenticated PATCH request", async () => {
  const { activateProfile } = await import("../src/services/api/profilesApi");
  setApiAuthToken("token-123");

  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({
      activeProfileId: "profile-2",
    }), { status: 200 }),
  );

  const result = await activateProfile("profile-2");

  expect(result).toEqual({ activeProfileId: "profile-2" });
  const [, requestInit] = fetchSpy.mock.calls[0] ?? [];
  expect(requestInit).toMatchObject({
    method: "PATCH",
    headers: {
      Authorization: "Bearer token-123",
    },
  });
});
