import { prisma } from "../../core/db/prisma";

export interface OrchestrationRuleRecord {
  id: string;
  userId: string;
  type: string;
  intervalSec: number;
  isActive: boolean;
  createdAt: Date;
}

interface CreateOrchestrationRuleInput {
  userId: string;
  type: string;
  intervalSec: number;
  isActive: boolean;
}

interface UpdateOrchestrationRuleInput {
  id: string;
  userId: string;
  type?: string;
  intervalSec?: number;
  isActive?: boolean;
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

  create(input: CreateOrchestrationRuleInput): Promise<OrchestrationRuleRecord> {
    return prisma.orchestrationRule.create({
      data: {
        userId: input.userId,
        type: input.type,
        intervalSec: input.intervalSec,
        isActive: input.isActive,
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
};
