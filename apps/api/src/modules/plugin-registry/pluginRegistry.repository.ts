import { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma";

export interface PluginRecord {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  isPremium: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginVersionRecord {
  id: string;
  pluginId: string;
  version: string;
  manifestJson: Prisma.JsonValue;
  changelog: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface PluginWithActiveVersion extends PluginRecord {
  activeVersion: PluginVersionRecord | null;
}

export const pluginRegistryRepository = {
  async findAllApproved(): Promise<PluginWithActiveVersion[]> {
    const plugins = await prisma.plugin.findMany({
      where: { isApproved: true },
      include: {
        versions: {
          where: { isActive: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    return plugins.map((p) => ({
      ...p,
      activeVersion: p.versions[0] ?? null,
    }));
  },

  async findByKey(key: string): Promise<PluginWithActiveVersion | null> {
    const plugin = await prisma.plugin.findUnique({
      where: { key },
      include: {
        versions: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!plugin) return null;

    return {
      ...plugin,
      activeVersion: plugin.versions[0] ?? null,
    };
  },

  async findById(id: string): Promise<PluginRecord | null> {
    return prisma.plugin.findUnique({ where: { id } });
  },

  async create(data: {
    key: string;
    name: string;
    description: string;
    category: string;
    isPremium: boolean;
  }): Promise<PluginRecord> {
    return prisma.plugin.create({ data });
  },

  async setApproved(id: string, isApproved: boolean): Promise<PluginRecord | null> {
    const existing = await prisma.plugin.findUnique({ where: { id } });
    if (!existing) return null;
    return prisma.plugin.update({ where: { id }, data: { isApproved } });
  },

  async createVersion(data: {
    pluginId: string;
    version: string;
    manifestJson: Prisma.InputJsonValue;
    changelog?: string;
  }): Promise<PluginVersionRecord> {
    return prisma.pluginVersion.create({ data });
  },

  async findVersionByPluginAndVersion(
    pluginId: string,
    version: string,
  ): Promise<PluginVersionRecord | null> {
    return prisma.pluginVersion.findUnique({
      where: { pluginId_version: { pluginId, version } },
    });
  },

  async setActiveVersion(pluginId: string, versionId: string): Promise<void> {
    await prisma.$transaction([
      prisma.pluginVersion.updateMany({
        where: { pluginId },
        data: { isActive: false },
      }),
      prisma.pluginVersion.update({
        where: { id: versionId },
        data: { isActive: true },
      }),
    ]);
  },
};
