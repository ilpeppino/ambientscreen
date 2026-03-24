import { afterEach, expect, test, vi } from "vitest";
import { setApiAuthToken } from "../src/services/api/apiClient";

vi.mock("../src/core/config/api", () => ({
  API_BASE_URL: "http://localhost:3000",
}));

afterEach(() => {
  vi.restoreAllMocks();
  setApiAuthToken(null);
});

test("getDevices returns all devices for current user", async () => {
  const { getDevices } = await import("../src/services/api/devicesApi");

  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([
    {
      id: "device-1",
      userId: "user-1",
      name: "iOS Phone",
      platform: "ios",
      deviceType: "phone",
      lastSeenAt: "2026-03-21T12:00:00.000Z",
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:00:00.000Z",
    },
  ]), { status: 200 }));

  const result = await getDevices();
  expect(result.length).toBe(1);
  expect(result[0].id).toBe("device-1");
});

test("updateDeviceName and deleteDevice send authenticated requests", async () => {
  const { updateDeviceName, deleteDevice } = await import("../src/services/api/devicesApi");
  setApiAuthToken("token-123");

  const fetchSpy = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify({
      id: "device-1",
      userId: "user-1",
      name: "Living Room Display",
      platform: "android",
      deviceType: "display",
      lastSeenAt: "2026-03-21T12:00:00.000Z",
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:00:00.000Z",
    }), { status: 200 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));

  const updated = await updateDeviceName("device-1", { name: "Living Room Display" });
  await deleteDevice("device-1");

  expect(updated.name).toBe("Living Room Display");

  const [, updateInit] = fetchSpy.mock.calls[0] ?? [];
  expect(updateInit).toMatchObject({
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token-123",
    },
  });

  const [, deleteInit] = fetchSpy.mock.calls[1] ?? [];
  expect(deleteInit).toMatchObject({
    method: "DELETE",
    headers: {
      Authorization: "Bearer token-123",
    },
  });
});

test("sendDeviceCommand posts validated payload with auth header", async () => {
  const { sendDeviceCommand } = await import("../src/services/api/devicesApi");
  setApiAuthToken("token-123");

  const fetchSpy = vi.spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify({
      success: true,
      commandType: "REFRESH",
    }), { status: 202 }));

  await sendDeviceCommand("device-1", {
    type: "REFRESH",
  });

  const [url, init] = fetchSpy.mock.calls[0] ?? [];
  expect(url).toBe("http://localhost:3000/devices/device-1/command");
  expect(init).toMatchObject({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token-123",
    },
    body: JSON.stringify({
      type: "REFRESH",
    }),
  });
});
