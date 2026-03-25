import { prisma } from "../../core/db/prisma";
import type { IntegrationConnectionRecord } from "./integrations.types";

interface ListByUserFilter {
  provider?: string;
  status?: string;
}

interface CreateConnectionInput {
  userId: string;
  provider: string;
  status: string;
  accountLabel?: string | null;
  externalAccountId: string;
  scopesJson: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string | null;
  tokenExpiresAt?: Date | null;
  metadataJson: string;
}

interface UpsertConnectionInput extends CreateConnectionInput {}

interface UpdateConnectionPatch {
  accountLabel?: string | null;
  status?: string;
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string | null;
  tokenExpiresAt?: Date | null;
  scopesJson?: string;
  metadataJson?: string;
  lastSyncedAt?: Date | null;
}

export const integrationsRepository = {
  listByUser(userId: string, filters: ListByUserFilter = {}): Promise<IntegrationConnectionRecord[]> {
    return prisma.integrationConnection.findMany({
      where: {
        userId,
        ...(filters.provider ? { provider: filters.provider } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  findById(id: string): Promise<IntegrationConnectionRecord | null> {
    return prisma.integrationConnection.findUnique({ where: { id } });
  },

  findByUserAndId(userId: string, id: string): Promise<IntegrationConnectionRecord | null> {
    return prisma.integrationConnection.findFirst({ where: { id, userId } });
  },

  findByUserProviderAndExternalAccount(
    userId: string,
    provider: string,
    externalAccountId: string,
  ): Promise<IntegrationConnectionRecord | null> {
    return prisma.integrationConnection.findFirst({ where: { userId, provider, externalAccountId } });
  },

  create(input: CreateConnectionInput): Promise<IntegrationConnectionRecord> {
    return prisma.integrationConnection.create({
      data: {
        userId: input.userId,
        provider: input.provider,
        status: input.status,
        accountLabel: input.accountLabel ?? null,
        externalAccountId: input.externalAccountId,
        scopesJson: input.scopesJson,
        accessTokenEncrypted: input.accessTokenEncrypted,
        refreshTokenEncrypted: input.refreshTokenEncrypted ?? null,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
        metadataJson: input.metadataJson,
      },
    });
  },

  upsertByUserProviderExternal(input: UpsertConnectionInput): Promise<IntegrationConnectionRecord> {
    return prisma.integrationConnection.upsert({
      where: {
        userId_provider_externalAccountId: {
          userId: input.userId,
          provider: input.provider,
          externalAccountId: input.externalAccountId,
        },
      },
      create: {
        userId: input.userId,
        provider: input.provider,
        status: input.status,
        accountLabel: input.accountLabel ?? null,
        externalAccountId: input.externalAccountId,
        scopesJson: input.scopesJson,
        accessTokenEncrypted: input.accessTokenEncrypted,
        refreshTokenEncrypted: input.refreshTokenEncrypted ?? null,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
        metadataJson: input.metadataJson,
      },
      update: {
        status: input.status,
        scopesJson: input.scopesJson,
        accessTokenEncrypted: input.accessTokenEncrypted,
        refreshTokenEncrypted: input.refreshTokenEncrypted ?? null,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
        metadataJson: input.metadataJson,
      },
    });
  },

  update(id: string, patch: UpdateConnectionPatch): Promise<IntegrationConnectionRecord> {
    return prisma.integrationConnection.update({ where: { id }, data: patch });
  },

  markRevoked(id: string): Promise<IntegrationConnectionRecord> {
    return prisma.integrationConnection.update({
      where: { id },
      data: {
        status: "revoked",
        accessTokenEncrypted: "",
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
      },
    });
  },

  touchLastSynced(id: string, at: Date): Promise<IntegrationConnectionRecord> {
    return prisma.integrationConnection.update({ where: { id }, data: { lastSyncedAt: at } });
  },
};
