import { prisma } from "../../core/db/prisma";

export const tokenBlocklistRepository = {
  async block(jti: string, expiresAt: Date): Promise<void> {
    await prisma.tokenBlocklist.create({ data: { jti, expiresAt } });
  },

  async isBlocked(jti: string): Promise<boolean> {
    const entry = await prisma.tokenBlocklist.findUnique({ where: { jti } });
    return entry !== null;
  },
};
