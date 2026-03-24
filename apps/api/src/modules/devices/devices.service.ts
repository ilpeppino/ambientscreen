import type { RemoteCommand } from "@ambient/shared-contracts";
import { getDeviceConnectionSnapshot, publishDeviceRemoteCommand } from "../realtime/realtime.runtime";
import { devicesRepository } from "./devices.repository";

interface RegisterDeviceInput {
  userId: string;
  name: string;
  platform: string;
  deviceType: string;
}

interface UpdateDeviceNameInput {
  id: string;
  userId: string;
  name: string;
}

interface DeviceOwnershipInput {
  id: string;
  userId: string;
}

export const devicesService = {
  register(input: RegisterDeviceInput) {
    return devicesRepository.create({
      ...input,
      lastSeenAt: new Date(),
    });
  },

  async getDevicesForUser(userId: string) {
    const devices = await devicesRepository.findAllByUser(userId);
    return devices.map((device) => {
      const connection = getDeviceConnectionSnapshot(device.id);
      return {
        ...device,
        connectionStatus: connection.online ? "online" as const : "offline" as const,
        lastConnectedAt: connection.lastConnectedAt,
      };
    });
  },

  heartbeat(input: DeviceOwnershipInput) {
    return devicesRepository.touchHeartbeat({
      ...input,
      lastSeenAt: new Date(),
    });
  },

  renameDevice(input: UpdateDeviceNameInput) {
    return devicesRepository.rename(input);
  },

  getDeviceForUser(input: DeviceOwnershipInput) {
    return devicesRepository.findByIdForUser(input);
  },

  sendRemoteCommand(input: DeviceOwnershipInput & { command: RemoteCommand }) {
    return publishDeviceRemoteCommand({
      userId: input.userId,
      deviceId: input.id,
      command: input.command,
    });
  },

  deleteDevice(input: DeviceOwnershipInput) {
    return devicesRepository.delete(input);
  },
};
