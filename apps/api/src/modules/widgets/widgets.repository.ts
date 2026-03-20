import { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma";

interface CreateWidgetInput {
  userId: string;
  type: string;
  config: Prisma.InputJsonValue;
  position: number;
  isActive: boolean;
}

export const widgetsRepository = {
  findAll(userId: string) {
    return prisma.widgetInstance.findMany({
      where: { userId },
      orderBy: { position: "asc" }
    });
  },

  findById(id: string) {
    return prisma.widgetInstance.findUnique({
      where: { id }
    });
  },

  create(input: CreateWidgetInput) {
    return prisma.widgetInstance.create({
      data: {
        userId: input.userId,
        type: input.type,
        config: input.config,
        position: input.position,
        isActive: input.isActive
      }
    });
  },

  activateWidget(userId: string, widgetId: string) {
    return prisma.$transaction(async (transaction) => {
      await transaction.widgetInstance.updateMany({
        where: { userId },
        data: { isActive: false }
      });

      return transaction.widgetInstance.update({
        where: { id: widgetId },
        data: { isActive: true }
      });
    });
  }
};
