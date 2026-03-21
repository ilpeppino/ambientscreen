import { prisma } from "../../core/db/prisma";
import { randomUUID } from "node:crypto";

export const usersRepository = {
  findAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: "asc" }
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  create(email: string, passwordHash: string) {
    const userId = randomUUID();
    const profileId = randomUUID();

    return prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          id: userId,
          email,
          passwordHash,
        },
      });

      await transaction.profile.create({
        data: {
          id: profileId,
          userId,
          name: "Default",
          isDefault: true,
        },
      });

      await transaction.user.update({
        where: { id: user.id },
        data: {
          activeProfileId: profileId,
        },
      });

      return user;
    });
  },
};
