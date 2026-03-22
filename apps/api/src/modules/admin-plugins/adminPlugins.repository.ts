import { ModerationStatus, Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma";

export interface AdminPluginRecord {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  authorId: string | null;
  isPremium: boolean;
  isApproved: boolean;
  approvedAt: Date | null;
  approvedBy: string | null;
  status: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminVersionRecord {
  id: string;
  pluginId: string;
  version: string;
  manifestJson: Prisma.JsonValue;
  entryPoint: string | null;
  changelog: string | null;
  isActive: boolean;
  isApproved: boolean;
  approvedAt: Date | null;
  approvedBy: string | null;
  status: ModerationStatus;
  createdAt: Date;
}

export interface AdminPluginWithVersions extends AdminPluginRecord {
  versions: AdminVersionRecord[];
}

export const adminPluginsRepository = {
  async findPending(): Promise<AdminPluginWithVersions[]> {
    const plugins = await prisma.plugin.findMany({
      where: { status: ModerationStatus.PENDING },
      include: { versions: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "asc" },
    });
    return plugins as AdminPluginWithVersions[];
  },

  async findById(id: string): Promise<AdminPluginRecord | null> {
    return prisma.plugin.findUnique({ where: { id } }) as Promise<AdminPluginRecord | null>;
  },

  async approvePlugin(
    id: string,
    adminId: string,
  ): Promise<AdminPluginRecord | null> {
    const existing = await prisma.plugin.findUnique({ where: { id } });
    if (!existing) return null;

    return prisma.plugin.update({
      where: { id },
      data: {
        isApproved: true,
        status: ModerationStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: adminId,
      },
    }) as Promise<AdminPluginRecord>;
  },

  async rejectPlugin(
    id: string,
    adminId: string,
  ): Promise<AdminPluginRecord | null> {
    const existing = await prisma.plugin.findUnique({ where: { id } });
    if (!existing) return null;

    return prisma.plugin.update({
      where: { id },
      data: {
        isApproved: false,
        status: ModerationStatus.REJECTED,
        approvedBy: adminId,
      },
    }) as Promise<AdminPluginRecord>;
  },

  async findVersionById(versionId: string): Promise<AdminVersionRecord | null> {
    return prisma.pluginVersion.findUnique({
      where: { id: versionId },
    }) as Promise<AdminVersionRecord | null>;
  },

  async approveVersion(
    versionId: string,
    adminId: string,
    makeActive: boolean,
  ): Promise<AdminVersionRecord | null> {
    const existing = await prisma.pluginVersion.findUnique({ where: { id: versionId } });
    if (!existing) return null;

    const updated = await prisma.pluginVersion.update({
      where: { id: versionId },
      data: {
        isApproved: true,
        status: ModerationStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: adminId,
        ...(makeActive ? { isActive: true } : {}),
      },
    });

    if (makeActive) {
      // Deactivate all other versions for this plugin
      await prisma.pluginVersion.updateMany({
        where: { pluginId: existing.pluginId, id: { not: versionId } },
        data: { isActive: false },
      });
    }

    return updated as AdminVersionRecord;
  },

  async rejectVersion(
    versionId: string,
    adminId: string,
  ): Promise<AdminVersionRecord | null> {
    const existing = await prisma.pluginVersion.findUnique({ where: { id: versionId } });
    if (!existing) return null;

    return prisma.pluginVersion.update({
      where: { id: versionId },
      data: {
        isApproved: false,
        isActive: false,
        status: ModerationStatus.REJECTED,
        approvedBy: adminId,
      },
    }) as Promise<AdminVersionRecord>;
  },

  async findUserById(userId: string): Promise<{ isAdmin: boolean } | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
  },
};
