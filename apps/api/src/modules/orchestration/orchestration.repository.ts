import { prisma } from "../../core/db/prisma";

export interface OrchestrationRuleRecord {
  id: string;
  userId: string;
  type: string;
  intervalSec: number;
  isActive: boolean;
  rotationProfileIds: string[];
  currentIndex: number;
  createdAt: Date;
}

interface CreateOrchestrationRuleInput {
  userId: string;
  type: string;
  intervalSec: number;
  isActive: boolean;
  rotationProfileIds: string[];
  currentIndex: number;
}

interface UpdateOrchestrationRuleInput {
  id: string;
  userId: string;
  type?: string;
  intervalSec?: number;
  isActive?: boolean;
  rotationProfileIds?: string[];
  currentIndex?: number;
}

interface DeleteOrchestrationRuleInput {
  id: string;
  userId: string;
}

export const orchestrationRepository = {
  findAllByUser(userId: string): Promise<OrchestrationRuleRecord[]> {
    return prisma.orchestrationRule.findMany({
      where: { userId },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  findByIdForUser(input: { id: string; userId: string }): Promise<OrchestrationRuleRecord | null> {
    return prisma.orchestrationRule.findFirst({
      where: {
        id: input.id,
        userId: input.userId,
      },
    });
  },

  create(input: CreateOrchestrationRuleInput): Promise<OrchestrationRuleRecord> {
    return prisma.orchestrationRule.create({
      data: {
        userId: input.userId,
        type: input.type,
        intervalSec: input.intervalSec,
        isActive: input.isActive,
        rotationProfileIds: input.rotationProfileIds,
        currentIndex: input.currentIndex,
      },
    });
  },

  async update(input: UpdateOrchestrationRuleInput): Promise<OrchestrationRuleRecord | null> {
    const updateResult = await prisma.orchestrationRule.updateMany({
      where: {
        id: input.id,
        userId: input.userId,
      },
      data: {
        type: input.type,
        intervalSec: input.intervalSec,
        isActive: input.isActive,
        rotationProfileIds: input.rotationProfileIds,
        currentIndex: input.currentIndex,
      },
    });

    if (updateResult.count !== 1) {
      return null;
    }

    return prisma.orchestrationRule.findUnique({
      where: { id: input.id },
    });
  },

  async deleteById(input: DeleteOrchestrationRuleInput): Promise<boolean> {
    const deleteResult = await prisma.orchestrationRule.deleteMany({
      where: {
        id: input.id,
        userId: input.userId,
      },
    });

    return deleteResult.count === 1;
  },

  async removeProfileFromRotationRules(input: { userId: string; profileId: string }): Promise<void> {
    const impactedRules = await prisma.orchestrationRule.findMany({
      where: {
        userId: input.userId,
        type: "rotation",
        rotationProfileIds: {
          has: input.profileId,
        },
      },
      select: {
        id: true,
        rotationProfileIds: true,
        currentIndex: true,
        isActive: true,
      },
    });

    if (impactedRules.length === 0) {
      return;
    }

    await prisma.$transaction(
      impactedRules.map((rule) => {
        const nextRotationProfileIds = rule.rotationProfileIds.filter((profileId) => profileId !== input.profileId);
        const nextCurrentIndex = nextRotationProfileIds.length === 0
          ? 0
          : Math.min(rule.currentIndex, nextRotationProfileIds.length - 1);

        return prisma.orchestrationRule.update({
          where: { id: rule.id },
          data: {
            rotationProfileIds: nextRotationProfileIds,
            currentIndex: nextCurrentIndex,
            isActive: rule.isActive && nextRotationProfileIds.length >= 2,
          },
        });
      }),
    );
  },
};
