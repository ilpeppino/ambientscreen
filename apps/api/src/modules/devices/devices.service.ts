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

  getDevicesForUser(userId: string) {
    return devicesRepository.findAllByUser(userId);
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

  deleteDevice(input: DeviceOwnershipInput) {
    return devicesRepository.delete(input);
  },
};
