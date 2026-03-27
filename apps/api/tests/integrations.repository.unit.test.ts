import { afterEach, expect, test, vi } from "vitest";

vi.mock("../src/core/db/prisma", () => ({
  prisma: {
    integrationConnection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../src/core/db/prisma";
import { integrationsRepository } from "../src/modules/integrations/integrations.repository";

const baseRecord = {
  id: "conn-1",
  userId: "user-1",
  provider: "google",
  status: "connected",
  accountLabel: "owner@example.com",
  externalAccountId: "google-uid-1",
  scopesJson: '["https://www.googleapis.com/auth/calendar.readonly"]',
  accessTokenEncrypted: "iv:tag:data",
  refreshTokenEncrypted: "iv:tag:rdata",
  tokenExpiresAt: new Date("2026-03-25T12:00:00Z"),
  metadataJson: '{"email":"owner@example.com"}',
  lastSyncedAt: null,
  createdAt: new Date("2026-03-25T10:00:00Z"),
  updatedAt: new Date("2026-03-25T10:00:00Z"),
};

afterEach(() => {
  vi.clearAllMocks();
});

test("listByUser calls findMany with userId filter", async () => {
  vi.mocked(prisma.integrationConnection.findMany).mockResolvedValue([baseRecord] as never);

  const result = await integrationsRepository.listByUser("user-1");

  expect(prisma.integrationConnection.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) }),
  );
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe("conn-1");
});

test("listByUser applies provider filter when provided", async () => {
  vi.mocked(prisma.integrationConnection.findMany).mockResolvedValue([] as never);

  await integrationsRepository.listByUser("user-1", { provider: "google" });

  expect(prisma.integrationConnection.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ userId: "user-1", provider: "google" }),
    }),
  );
});

test("listByUser applies status filter when provided", async () => {
  vi.mocked(prisma.integrationConnection.findMany).mockResolvedValue([] as never);

  await integrationsRepository.listByUser("user-1", { status: "needs_reauth" });

  expect(prisma.integrationConnection.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ status: "needs_reauth" }),
    }),
  );
});

test("findById calls findUnique with id", async () => {
  vi.mocked(prisma.integrationConnection.findUnique).mockResolvedValue(baseRecord as never);

  const result = await integrationsRepository.findById("conn-1");

  expect(prisma.integrationConnection.findUnique).toHaveBeenCalledWith({ where: { id: "conn-1" } });
  expect(result?.id).toBe("conn-1");
});

test("findByUserAndId calls findFirst with id and userId", async () => {
  vi.mocked(prisma.integrationConnection.findFirst).mockResolvedValue(baseRecord as never);

  const result = await integrationsRepository.findByUserAndId("user-1", "conn-1");

  expect(prisma.integrationConnection.findFirst).toHaveBeenCalledWith({
    where: { id: "conn-1", userId: "user-1" },
  });
  expect(result?.id).toBe("conn-1");
});

test("findByUserAndId returns null when not found", async () => {
  vi.mocked(prisma.integrationConnection.findFirst).mockResolvedValue(null);

  const result = await integrationsRepository.findByUserAndId("user-1", "unknown");

  expect(result).toBeNull();
});

test("create persists a new connection record", async () => {
  vi.mocked(prisma.integrationConnection.create).mockResolvedValue(baseRecord as never);

  const result = await integrationsRepository.create({
    userId: "user-1",
    provider: "google",
    status: "connected",
    externalAccountId: "google-uid-1",
    scopesJson: '[]',
    accessTokenEncrypted: "iv:tag:data",
    metadataJson: '{}',
  });

  expect(prisma.integrationConnection.create).toHaveBeenCalledTimes(1);
  expect(result.userId).toBe("user-1");
});

test("upsertByUserProviderExternal calls prisma upsert with composite key", async () => {
  vi.mocked(prisma.integrationConnection.upsert).mockResolvedValue(baseRecord as never);

  await integrationsRepository.upsertByUserProviderExternal({
    userId: "user-1",
    provider: "google",
    status: "connected",
    externalAccountId: "google-uid-1",
    scopesJson: '[]',
    accessTokenEncrypted: "iv:tag:data",
    metadataJson: '{}',
  });

  expect(prisma.integrationConnection.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        userId_provider_externalAccountId: {
          userId: "user-1",
          provider: "google",
          externalAccountId: "google-uid-1",
        },
      },
    }),
  );
});

test("markRevoked sets status revoked and clears tokens", async () => {
  const revoked = { ...baseRecord, status: "revoked", accessTokenEncrypted: "", refreshTokenEncrypted: null };
  vi.mocked(prisma.integrationConnection.update).mockResolvedValue(revoked as never);

  const result = await integrationsRepository.markRevoked("conn-1");

  expect(prisma.integrationConnection.update).toHaveBeenCalledWith({
    where: { id: "conn-1" },
    data: expect.objectContaining({ status: "revoked", accessTokenEncrypted: "" }),
  });
  expect(result.status).toBe("revoked");
});

test("touchLastSynced updates lastSyncedAt", async () => {
  const synced = { ...baseRecord, lastSyncedAt: new Date("2026-03-25T11:00:00Z") };
  vi.mocked(prisma.integrationConnection.update).mockResolvedValue(synced as never);

  const at = new Date("2026-03-25T11:00:00Z");
  await integrationsRepository.touchLastSynced("conn-1", at);

  expect(prisma.integrationConnection.update).toHaveBeenCalledWith({
    where: { id: "conn-1" },
    data: { lastSyncedAt: at },
  });
});
