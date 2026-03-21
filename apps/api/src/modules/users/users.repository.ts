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

    return prisma.user.create({
      data: {
        id: userId,
        email,
        passwordHash,
        profiles: {
          create: {
            id: userId,
            name: "Default",
            isDefault: true,
          },
        },
      },
    });
  },
};
