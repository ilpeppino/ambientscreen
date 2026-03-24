import { afterEach, expect, test, vi } from "vitest";
import { setApiAuthToken } from "../src/services/api/apiClient";

vi.mock("../src/core/config/api", () => ({
  API_BASE_URL: "http://localhost:3000",
}));

afterEach(() => {
  vi.restoreAllMocks();
  setApiAuthToken(null);
});

test("listSlides fetches profile-scoped slide collection", async () => {
  const { listSlides } = await import("../src/services/api/slidesApi");
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({
      slides: [
        {
          id: "slide-1",
          profileId: "profile-1",
          name: "Default",
          order: 0,
          durationSeconds: null,
          isEnabled: true,
          createdAt: "2026-03-24T10:00:00.000Z",
          updatedAt: "2026-03-24T10:00:00.000Z",
          itemCount: 2,
        },
      ],
    }), { status: 200 }),
  );

  const result = await listSlides("profile-1");
  expect(result.slides).toHaveLength(1);

  const [url] = fetchSpy.mock.calls[0] ?? [];
  expect(String(url)).toContain("/slides?profileId=profile-1");
});

test("updateSlide sends authenticated PATCH payload", async () => {
  const { updateSlide } = await import("../src/services/api/slidesApi");
  setApiAuthToken("token-xyz");

  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({
      id: "slide-1",
      profileId: "profile-1",
      name: "Main",
      order: 1,
      durationSeconds: 20,
      isEnabled: true,
      createdAt: "2026-03-24T10:00:00.000Z",
      updatedAt: "2026-03-24T10:00:00.000Z",
      itemCount: 2,
    }), { status: 200 }),
  );

  const result = await updateSlide("slide-1", { order: 1, durationSeconds: 20 }, "profile-1");
  expect(result.order).toBe(1);

  const [, init] = fetchSpy.mock.calls[0] ?? [];
  expect(init).toMatchObject({
    method: "PATCH",
    headers: {
      Authorization: "Bearer token-xyz",
      "Content-Type": "application/json",
    },
  });
});
