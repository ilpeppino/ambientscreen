import type { DevicePlatform, DeviceType } from "@ambient/shared-contracts";

export const DEVICE_STORAGE_KEY = "ambient.device.id.v1";

export interface DeviceMetadata {
  name: string;
  platform: DevicePlatform;
  deviceType: DeviceType;
}

interface DeviceRegistrationDependencies {
  getStoredDeviceId: () => Promise<string | null>;
  setStoredDeviceId: (deviceId: string) => Promise<void>;
  clearStoredDeviceId: () => Promise<void>;
  registerDevice: (metadata: DeviceMetadata) => Promise<{ id: string }>;
  heartbeatDevice: (input: { deviceId: string }) => Promise<unknown>;
  getDeviceMetadata: () => DeviceMetadata;
}

function isNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("not found");
}

export async function registerOrHeartbeatDevice(deps: DeviceRegistrationDependencies): Promise<string> {
  const storedDeviceId = await deps.getStoredDeviceId();

  if (storedDeviceId) {
    try {
      await deps.heartbeatDevice({ deviceId: storedDeviceId });
      return storedDeviceId;
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }

      await deps.clearStoredDeviceId();
    }
  }

  const metadata = deps.getDeviceMetadata();
  const createdDevice = await deps.registerDevice(metadata);
  await deps.setStoredDeviceId(createdDevice.id);
  return createdDevice.id;
}
