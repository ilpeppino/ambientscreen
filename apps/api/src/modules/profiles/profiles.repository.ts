import { prisma } from "../../core/db/prisma";

export interface ProfileRecord {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
}

export const profilesRepository = {
  findAllByUser(userId: string) {
    return prisma.profile.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  },

  findById(id: string) {
    return prisma.profile.findUnique({
      where: { id },
    });
  },

  findByIdForUser(input: { id: string; userId: string }) {
    return prisma.profile.findFirst({
      where: {
        id: input.id,
        userId: input.userId,
      },
    });
  },

  findDefaultByUser(userId: string) {
    return prisma.profile.findFirst({
      where: { userId, isDefault: true },
      orderBy: { createdAt: "asc" },
    });
  },

  create(input: { userId: string; name: string; isDefault: boolean }) {
    return prisma.profile.create({
      data: {
        ...input,
        slides: {
          create: {
            name: "Default",
            order: 0,
          },
        },
      },
    });
  },

  updateName(id: string, name: string) {
    return prisma.profile.update({
      where: { id },
      data: { name },
    });
  },

  countByUser(userId: string) {
    return prisma.profile.count({
      where: { userId },
    });
  },

  async deleteByIdWithWidgets(profileId: string) {
    await prisma.$transaction(async (transaction) => {
      await transaction.widgetInstance.deleteMany({
        where: { profileId },
      });

      await transaction.profile.delete({
        where: { id: profileId },
      });
    });
  },

  setDefaultProfileForUser(userId: string, profileId: string) {
    return prisma.$transaction(async (transaction) => {
      await transaction.profile.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      return transaction.profile.update({
        where: { id: profileId },
        data: { isDefault: true },
      });
    });
  },

  getUserActiveProfileId(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { activeProfileId: true },
    });
  },

  setUserActiveProfileId(userId: string, profileId: string | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { activeProfileId: profileId },
      select: { activeProfileId: true },
    });
  },
};
