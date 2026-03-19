import { prisma } from "../../core/db/prisma";

export const usersRepository = {
  findAll() {
    return prisma.user.findMany();
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    });
  },

  create(email: string) {
    return prisma.user.create({
      data: { email }
    });
  }
};