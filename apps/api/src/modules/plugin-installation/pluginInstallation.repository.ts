import { prisma } from "../../core/db/prisma";

export interface InstalledPluginRecord {
  id: string;
  userId: string;
  pluginId: string;
  isEnabled: boolean;
  installedAt: Date;
  updatedAt: Date;
}

export interface InstalledPluginWithPlugin extends InstalledPluginRecord {
  plugin: {
    id: string;
    key: string;
    name: string;
    description: string;
    category: string;
    isPremium: boolean;
    versions: Array<{
      id: string;
      version: string;
      isActive: boolean;
    }>;
  };
}

export const pluginInstallationRepository = {
  async findByUserAndPlugin(
    userId: string,
    pluginId: string,
  ): Promise<InstalledPluginRecord | null> {
    return prisma.installedPlugin.findUnique({
      where: { userId_pluginId: { userId, pluginId } },
    });
  },

  async findByUserAndPluginKey(
    userId: string,
    pluginKey: string,
  ): Promise<Pick<InstalledPluginRecord, "isEnabled"> | null> {
    return prisma.installedPlugin.findFirst({
      where: { userId, plugin: { key: pluginKey } },
      select: { isEnabled: true },
    });
  },

  async findAllForUser(userId: string): Promise<InstalledPluginWithPlugin[]> {
    const records = await prisma.installedPlugin.findMany({
      where: { userId },
      include: {
        plugin: {
          include: {
            versions: {
              where: { isActive: true },
              take: 1,
              select: { id: true, version: true, isActive: true },
            },
          },
        },
      },
      orderBy: { installedAt: "asc" },
    });

    return records as InstalledPluginWithPlugin[];
  },

  async create(data: {
    userId: string;
    pluginId: string;
  }): Promise<InstalledPluginRecord> {
    return prisma.installedPlugin.create({
      data: {
        userId: data.userId,
        pluginId: data.pluginId,
        isEnabled: true,
      },
    });
  },

  async delete(userId: string, pluginId: string): Promise<InstalledPluginRecord | null> {
    const existing = await prisma.installedPlugin.findUnique({
      where: { userId_pluginId: { userId, pluginId } },
    });
    if (!existing) return null;
    return prisma.installedPlugin.delete({
      where: { userId_pluginId: { userId, pluginId } },
    });
  },

  async updateEnabled(
    userId: string,
    pluginId: string,
    isEnabled: boolean,
  ): Promise<InstalledPluginRecord | null> {
    const existing = await prisma.installedPlugin.findUnique({
      where: { userId_pluginId: { userId, pluginId } },
    });
    if (!existing) return null;
    return prisma.installedPlugin.update({
      where: { userId_pluginId: { userId, pluginId } },
      data: { isEnabled },
    });
  },
};
