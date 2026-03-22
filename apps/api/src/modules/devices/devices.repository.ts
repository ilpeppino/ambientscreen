import { prisma } from "../../core/db/prisma";

export interface DeviceRecord {
  id: string;
  userId: string;
  name: string;
  platform: string;
  deviceType: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateDeviceInput {
  userId: string;
  name: string;
  platform: string;
  deviceType: string;
  lastSeenAt: Date;
}

export const devicesRepository = {
  create(input: CreateDeviceInput): Promise<DeviceRecord> {
    return prisma.device.create({
      data: {
        userId: input.userId,
        name: input.name,
        platform: input.platform,
        deviceType: input.deviceType,
        lastSeenAt: input.lastSeenAt,
      },
    });
  },

  findAllByUser(userId: string): Promise<DeviceRecord[]> {
    return prisma.device.findMany({
      where: { userId },
      orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
    });
  },

  findByIdForUser(input: { id: string; userId: string }): Promise<DeviceRecord | null> {
    return prisma.device.findFirst({
      where: {
        id: input.id,
        userId: input.userId,
      },
    });
  },

  async touchHeartbeat(input: { id: string; userId: string; lastSeenAt: Date }): Promise<DeviceRecord | null> {
    const result = await prisma.device.updateMany({
      where: {
        id: input.id,
        userId: input.userId,
      },
      data: {
        lastSeenAt: input.lastSeenAt,
      },
    });

    if (result.count !== 1) {
      return null;
    }

    return prisma.device.findUnique({
      where: {
        id: input.id,
      },
    });
  },

  async rename(input: { id: string; userId: string; name: string }): Promise<DeviceRecord | null> {
    const result = await prisma.device.updateMany({
      where: {
        id: input.id,
        userId: input.userId,
      },
      data: {
        name: input.name,
      },
    });

    if (result.count !== 1) {
      return null;
    }

    return prisma.device.findUnique({
      where: {
        id: input.id,
      },
    });
  },

  async delete(input: { id: string; userId: string }): Promise<boolean> {
    const result = await prisma.device.deleteMany({
      where: {
        id: input.id,
        userId: input.userId,
      },
    });

    return result.count > 0;
  },
};
