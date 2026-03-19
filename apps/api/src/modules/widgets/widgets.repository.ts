import { prisma } from "../../core/db/prisma";

export const widgetsRepository = {
  findAll(userId: string) {
    return prisma.widgetInstance.findMany({
      where: { userId },
      orderBy: { position: "asc" }
    });
  },

  create(data: {
    userId: string;
    type: string;
    config: any;
    position: number;
  }) {
    return prisma.widgetInstance.create({
      data
    });
  }
};