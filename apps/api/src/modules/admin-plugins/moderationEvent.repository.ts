import { ModerationStatus } from "@prisma/client";
import { prisma } from "../../core/db/prisma";

export interface ModerationEventRecord {
  id: string;
  targetType: string;
  targetId: string;
  pluginId: string;
  action: ModerationStatus;
  actorId: string;
  reason: string | null;
  createdAt: Date;
}

export const moderationEventRepository = {
  async create(data: {
    targetType: "plugin" | "pluginVersion";
    targetId: string;
    pluginId: string;
    action: Extract<ModerationStatus, "APPROVED" | "REJECTED">;
    actorId: string;
    reason?: string | null;
  }): Promise<ModerationEventRecord> {
    return prisma.moderationEvent.create({ data });
  },

  async findByPlugin(pluginId: string): Promise<ModerationEventRecord[]> {
    return prisma.moderationEvent.findMany({
      where: { pluginId },
      orderBy: { createdAt: "desc" },
    });
  },
};
