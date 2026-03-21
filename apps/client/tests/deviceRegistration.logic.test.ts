import { expect, test, vi } from "vitest";
import {
  registerOrHeartbeatDevice,
  type DeviceMetadata,
} from "../src/features/devices/deviceRegistration.logic";

const metadata: DeviceMetadata = {
  name: "iOS Phone",
  platform: "ios",
  deviceType: "phone",
};

test("registers a device and persists deviceId on first login", async () => {
  const setStoredDeviceId = vi.fn(async () => undefined);
  const registerDevice = vi.fn(async () => ({ id: "device-new" }));
  const heartbeatDevice = vi.fn(async () => undefined);

  const result = await registerOrHeartbeatDevice({
    getStoredDeviceId: async () => null,
    setStoredDeviceId,
    clearStoredDeviceId: async () => undefined,
    registerDevice,
    heartbeatDevice,
    getDeviceMetadata: () => metadata,
  });

  expect(result).toBe("device-new");
  expect(registerDevice).toHaveBeenCalledWith(metadata);
  expect(setStoredDeviceId).toHaveBeenCalledWith("device-new");
  expect(heartbeatDevice).not.toHaveBeenCalled();
});

test("uses heartbeat when a deviceId already exists", async () => {
  const registerDevice = vi.fn(async () => ({ id: "device-should-not-register" }));
  const heartbeatDevice = vi.fn(async () => undefined);

  const result = await registerOrHeartbeatDevice({
    getStoredDeviceId: async () => "device-existing",
    setStoredDeviceId: async () => undefined,
    clearStoredDeviceId: async () => undefined,
    registerDevice,
    heartbeatDevice,
    getDeviceMetadata: () => metadata,
  });

  expect(result).toBe("device-existing");
  expect(heartbeatDevice).toHaveBeenCalledWith({ deviceId: "device-existing" });
  expect(registerDevice).not.toHaveBeenCalled();
});

test("re-registers when stored device no longer exists", async () => {
  const clearStoredDeviceId = vi.fn(async () => undefined);
  const setStoredDeviceId = vi.fn(async () => undefined);
  const registerDevice = vi.fn(async () => ({ id: "device-recovered" }));

  const result = await registerOrHeartbeatDevice({
    getStoredDeviceId: async () => "device-stale",
    setStoredDeviceId,
    clearStoredDeviceId,
    registerDevice,
    heartbeatDevice: async () => {
      throw new Error("Device not found");
    },
    getDeviceMetadata: () => metadata,
  });

  expect(result).toBe("device-recovered");
  expect(clearStoredDeviceId).toHaveBeenCalledTimes(1);
  expect(setStoredDeviceId).toHaveBeenCalledWith("device-recovered");
  expect(registerDevice).toHaveBeenCalledWith(metadata);
});
