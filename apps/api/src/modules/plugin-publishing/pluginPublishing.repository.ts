import { ModerationStatus, Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma";

export interface DeveloperPluginRecord {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  authorId: string | null;
  isPremium: boolean;
  isApproved: boolean;
  status: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeveloperPluginVersionRecord {
  id: string;
  pluginId: string;
  version: string;
  manifestJson: Prisma.JsonValue;
  entryPoint: string | null;
  changelog: string | null;
  isActive: boolean;
  isApproved: boolean;
  status: ModerationStatus;
  createdAt: Date;
}

export interface DeveloperPluginWithVersions extends DeveloperPluginRecord {
  versions: DeveloperPluginVersionRecord[];
  activeVersion: DeveloperPluginVersionRecord | null;
}

export function derivePluginKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const pluginPublishingRepository = {
  async findAllByAuthor(authorId: string): Promise<DeveloperPluginWithVersions[]> {
    const plugins = await prisma.plugin.findMany({
      where: { authorId },
      include: { versions: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });

    return plugins.map((p) => ({
      ...p,
      activeVersion: p.versions.find((v) => v.isActive) ?? null,
    }));
  },

  async findByIdAndAuthor(
    id: string,
    authorId: string,
  ): Promise<DeveloperPluginWithVersions | null> {
    const plugin = await prisma.plugin.findFirst({
      where: { id, authorId },
      include: { versions: { orderBy: { createdAt: "desc" } } },
    });

    if (!plugin) return null;

    return {
      ...plugin,
      activeVersion: plugin.versions.find((v) => v.isActive) ?? null,
    };
  },

  async findById(id: string): Promise<DeveloperPluginRecord | null> {
    return prisma.plugin.findUnique({ where: { id } });
  },

  async findByName(name: string): Promise<DeveloperPluginRecord | null> {
    return prisma.plugin.findUnique({ where: { name } });
  },

  async create(data: {
    name: string;
    description: string;
    category: string;
    authorId: string;
  }): Promise<DeveloperPluginRecord> {
    const key = derivePluginKey(data.name);

    return prisma.plugin.create({
      data: {
        key,
        name: data.name,
        description: data.description,
        category: data.category,
        authorId: data.authorId,
        isApproved: false,
      },
    });
  },

  async update(
    id: string,
    data: { description?: string },
  ): Promise<DeveloperPluginRecord> {
    return prisma.plugin.update({
      where: { id },
      data,
    });
  },

  async createVersion(data: {
    pluginId: string;
    version: string;
    manifestJson: Prisma.InputJsonValue;
    entryPoint: string;
    changelog?: string;
  }): Promise<DeveloperPluginVersionRecord> {
    return prisma.pluginVersion.create({ data });
  },

  async findVersionByPluginAndVersion(
    pluginId: string,
    version: string,
  ): Promise<DeveloperPluginVersionRecord | null> {
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
