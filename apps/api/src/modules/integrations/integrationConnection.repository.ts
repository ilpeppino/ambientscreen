import { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma";
import type { IntegrationConnection } from "@prisma/client";

export const integrationConnectionRepository = {
  async findById(id: string): Promise<IntegrationConnection | null> {
    return prisma.integrationConnection.findUnique({ where: { id } });
  },

  async findByUserId(userId: string): Promise<IntegrationConnection[]> {
    return prisma.integrationConnection.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  },

  async upsert(input: {
    userId: string;
    provider: string;
    externalAccountId: string;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string | null;
    tokenType: string;
    scopes: string[];
    expiresAt?: Date;
    label?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<IntegrationConnection> {
    return prisma.integrationConnection.upsert({
      where: {
        userId_provider_externalAccountId: {
          userId: input.userId,
          provider: input.provider,
          externalAccountId: input.externalAccountId,
        },
      },
      update: {
        encryptedAccessToken: input.encryptedAccessToken,
        encryptedRefreshToken: input.encryptedRefreshToken ?? null,
        tokenType: input.tokenType,
        scopes: input.scopes,
        expiresAt: input.expiresAt,
        label: input.label ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
      create: {
        userId: input.userId,
        provider: input.provider,
        externalAccountId: input.externalAccountId,
        encryptedAccessToken: input.encryptedAccessToken,
        encryptedRefreshToken: input.encryptedRefreshToken ?? null,
        tokenType: input.tokenType,
        scopes: input.scopes,
        expiresAt: input.expiresAt,
        label: input.label ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });
  },

  async updateTokens(
    id: string,
    data: {
      encryptedAccessToken: string;
      expiresAt?: Date;
      encryptedRefreshToken?: string;
    },
  ): Promise<IntegrationConnection> {
    return prisma.integrationConnection.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.integrationConnection.delete({ where: { id } });
  },
};
