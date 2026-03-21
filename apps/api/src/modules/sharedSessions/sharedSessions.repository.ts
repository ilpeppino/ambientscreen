import { prisma } from "../../core/db/prisma";

export interface SharedSessionParticipantRecord {
  id: string;
  sessionId: string;
  deviceId: string;
  displayName: string | null;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface SharedScreenSessionRecord {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  activeProfileId: string | null;
  slideshowEnabled: boolean;
  slideshowIntervalSec: number;
  rotationProfileIds: string[];
  currentIndex: number;
  lastAdvancedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  participants: SharedSessionParticipantRecord[];
}

interface UpdateSharedSessionInput {
  id: string;
  userId: string;
  name?: string;
  isActive?: boolean;
  activeProfileId?: string | null;
  slideshowEnabled?: boolean;
  slideshowIntervalSec?: number;
  rotationProfileIds?: string[];
  currentIndex?: number;
  lastAdvancedAt?: Date | null;
}

interface AdvanceSessionRotationInput {
  id: string;
  expectedCurrentIndex: number;
  expectedLastAdvancedAt: Date | null;
  nextCurrentIndex: number;
  nextActiveProfileId: string;
  advancedAt: Date;
}

const includeSessionRelations = {
  participants: {
    orderBy: [{ createdAt: "asc" as const }],
  },
};

export const sharedSessionsRepository = {
  findAllByUser(userId: string): Promise<SharedScreenSessionRecord[]> {
    return prisma.sharedScreenSession.findMany({
      where: { userId },
      include: includeSessionRelations,
      orderBy: [{ createdAt: "asc" }],
    });
  },

  findByIdForUser(input: { id: string; userId: string }): Promise<SharedScreenSessionRecord | null> {
    return prisma.sharedScreenSession.findFirst({
      where: {
        id: input.id,
        userId: input.userId,
      },
      include: includeSessionRelations,
    });
  },

  create(input: {
    userId: string;
    name: string;
    activeProfileId?: string | null;
    slideshowEnabled?: boolean;
    slideshowIntervalSec?: number;
    rotationProfileIds?: string[];
    currentIndex?: number;
  }): Promise<SharedScreenSessionRecord> {
    return prisma.sharedScreenSession.create({
      data: {
        userId: input.userId,
        name: input.name,
        activeProfileId: input.activeProfileId ?? null,
        slideshowEnabled: input.slideshowEnabled ?? false,
        slideshowIntervalSec: input.slideshowIntervalSec ?? 60,
        rotationProfileIds: input.rotationProfileIds ?? [],
        currentIndex: input.currentIndex ?? 0,
      },
      include: includeSessionRelations,
    });
  },

  async update(input: UpdateSharedSessionInput): Promise<SharedScreenSessionRecord | null> {
    const updateResult = await prisma.sharedScreenSession.updateMany({
      where: {
        id: input.id,
        userId: input.userId,
      },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.activeProfileId !== undefined ? { activeProfileId: input.activeProfileId } : {}),
        ...(input.slideshowEnabled !== undefined ? { slideshowEnabled: input.slideshowEnabled } : {}),
        ...(input.slideshowIntervalSec !== undefined ? { slideshowIntervalSec: input.slideshowIntervalSec } : {}),
        ...(input.rotationProfileIds !== undefined ? { rotationProfileIds: input.rotationProfileIds } : {}),
        ...(input.currentIndex !== undefined ? { currentIndex: input.currentIndex } : {}),
        ...(input.lastAdvancedAt !== undefined ? { lastAdvancedAt: input.lastAdvancedAt } : {}),
      },
    });

    if (updateResult.count !== 1) {
      return null;
    }

    return prisma.sharedScreenSession.findUnique({
      where: { id: input.id },
      include: includeSessionRelations,
    });
  },

  async upsertParticipant(input: {
    sessionId: string;
    deviceId: string;
    displayName?: string;
  }): Promise<SharedSessionParticipantRecord> {
    return prisma.sharedScreenParticipant.upsert({
      where: {
        sessionId_deviceId: {
          sessionId: input.sessionId,
          deviceId: input.deviceId,
        },
      },
      create: {
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        displayName: input.displayName?.trim() || null,
        lastSeenAt: new Date(),
      },
      update: {
        ...(input.displayName !== undefined ? { displayName: input.displayName.trim() || null } : {}),
        lastSeenAt: new Date(),
      },
    });
  },

  async removeParticipant(input: { sessionId: string; deviceId: string }): Promise<boolean> {
    const result = await prisma.sharedScreenParticipant.deleteMany({
      where: {
        sessionId: input.sessionId,
        deviceId: input.deviceId,
      },
    });

    return result.count > 0;
  },

  findActiveSessionsForRotation(): Promise<SharedScreenSessionRecord[]> {
    return prisma.sharedScreenSession.findMany({
      where: {
        isActive: true,
        slideshowEnabled: true,
        slideshowIntervalSec: {
          gt: 0,
        },
        rotationProfileIds: {
          isEmpty: false,
        },
      },
      include: includeSessionRelations,
      orderBy: [{ updatedAt: "asc" }],
    });
  },

  async advanceRotation(input: AdvanceSessionRotationInput): Promise<SharedScreenSessionRecord | null> {
    const updateResult = await prisma.sharedScreenSession.updateMany({
      where: {
        id: input.id,
        currentIndex: input.expectedCurrentIndex,
        ...(input.expectedLastAdvancedAt
          ? { lastAdvancedAt: input.expectedLastAdvancedAt }
          : { lastAdvancedAt: null }),
      },
      data: {
        currentIndex: input.nextCurrentIndex,
        activeProfileId: input.nextActiveProfileId,
        lastAdvancedAt: input.advancedAt,
      },
    });

    if (updateResult.count !== 1) {
      return null;
    }

    return prisma.sharedScreenSession.findUnique({
      where: { id: input.id },
      include: includeSessionRelations,
    });
  },
};
