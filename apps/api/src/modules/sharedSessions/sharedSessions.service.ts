import { apiErrors } from "../../core/http/api-error";
import { profilesService } from "../profiles/profiles.service";
import {
  createSharedSessionRealtimeEvent,
} from "../realtime/realtime.events";
import { publishRealtimeEvent } from "../realtime/realtime.runtime";
import {
  sharedSessionsRepository,
  type SharedScreenSessionRecord,
  type SharedSessionParticipantRecord,
} from "./sharedSessions.repository";

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
}

interface JoinSharedSessionInput {
  id: string;
  userId: string;
  deviceId: string;
  displayName?: string;
}

interface LeaveSharedSessionInput {
  id: string;
  userId: string;
  deviceId: string;
}

function normalizeCurrentIndex(index: number, profileCount: number): number {
  if (profileCount <= 0) {
    return 0;
  }

  if (!Number.isInteger(index) || index < 0) {
    return 0;
  }

  return index % profileCount;
}

function isRotationDue(session: SharedScreenSessionRecord, now: Date): boolean {
  if (!session.slideshowEnabled || !session.isActive) {
    return false;
  }

  if (session.rotationProfileIds.length < 2 || session.slideshowIntervalSec <= 0) {
    return false;
  }

  if (!session.lastAdvancedAt) {
    return true;
  }

  const elapsedMs = now.getTime() - session.lastAdvancedAt.getTime();
  return elapsedMs >= session.slideshowIntervalSec * 1000;
}

function toSharedPlaybackState(session: SharedScreenSessionRecord) {
  return {
    sessionId: session.id,
    activeProfileId: session.activeProfileId,
    slideshowEnabled: session.slideshowEnabled,
    slideshowIntervalSec: session.slideshowIntervalSec,
    rotationProfileIds: session.rotationProfileIds,
    currentIndex: session.currentIndex,
    lastAdvancedAt: session.lastAdvancedAt,
  };
}

function participantToPayload(participant: SharedSessionParticipantRecord) {
  return {
    id: participant.id,
    deviceId: participant.deviceId,
    displayName: participant.displayName,
    lastSeenAt: participant.lastSeenAt,
    createdAt: participant.createdAt,
  };
}

async function ensureProfilesBelongToUser(userId: string, profileIds: string[]): Promise<void> {
  if (profileIds.length === 0) {
    return;
  }

  const profiles = await profilesService.getProfilesForUser(userId);
  const availableIds = new Set(profiles.map((profile) => profile.id));
  const missing = profileIds.find((profileId) => !availableIds.has(profileId));
  if (missing) {
    throw apiErrors.validation("Shared session references one or more non-existent profiles", {
      missingProfileId: missing,
    });
  }
}

async function ensureProfileBelongsToUser(userId: string, profileId: string | null | undefined): Promise<void> {
  if (!profileId) {
    return;
  }

  await ensureProfilesBelongToUser(userId, [profileId]);
}

async function emitSessionUpdated(session: SharedScreenSessionRecord) {
  publishRealtimeEvent(
    createSharedSessionRealtimeEvent({
      type: "sharedSession.updated",
      sessionId: session.id,
      payload: {
        playbackState: toSharedPlaybackState(session),
        isActive: session.isActive,
      },
    }),
  );
}

export const sharedSessionsService = {
  getSessionsForUser(userId: string) {
    return sharedSessionsRepository.findAllByUser(userId);
  },

  getSessionByIdForUser(input: { id: string; userId: string }) {
    return sharedSessionsRepository.findByIdForUser(input);
  },

  async createSession(input: {
    userId: string;
    name: string;
    activeProfileId?: string | null;
    slideshowEnabled?: boolean;
    slideshowIntervalSec?: number;
    rotationProfileIds?: string[];
    currentIndex?: number;
  }) {
    await ensureProfileBelongsToUser(input.userId, input.activeProfileId);
    await ensureProfilesBelongToUser(input.userId, input.rotationProfileIds ?? []);

    const rotationProfileIds = input.rotationProfileIds ?? [];
    const currentIndex = normalizeCurrentIndex(
      input.currentIndex ?? 0,
      rotationProfileIds.length,
    );
    const activeProfileId = input.activeProfileId
      ?? (rotationProfileIds.length > 0 ? rotationProfileIds[currentIndex] : null);

    const createdSession = await sharedSessionsRepository.create({
      userId: input.userId,
      name: input.name,
      activeProfileId,
      slideshowEnabled: input.slideshowEnabled ?? false,
      slideshowIntervalSec: input.slideshowIntervalSec ?? 60,
      rotationProfileIds,
      currentIndex,
    });

    await emitSessionUpdated(createdSession);
    return createdSession;
  },

  async updateSession(input: UpdateSharedSessionInput): Promise<SharedScreenSessionRecord | null> {
    const existingSession = await sharedSessionsRepository.findByIdForUser({
      id: input.id,
      userId: input.userId,
    });

    if (!existingSession) {
      return null;
    }

    await ensureProfileBelongsToUser(input.userId, input.activeProfileId);
    await ensureProfilesBelongToUser(input.userId, input.rotationProfileIds ?? []);

    const nextRotationProfileIds = input.rotationProfileIds ?? existingSession.rotationProfileIds;
    const nextCurrentIndex = normalizeCurrentIndex(
      input.currentIndex ?? existingSession.currentIndex,
      nextRotationProfileIds.length,
    );

    const requestedActiveProfileId = input.activeProfileId;
    const nextActiveProfileId = requestedActiveProfileId !== undefined
      ? requestedActiveProfileId
      : existingSession.activeProfileId;

    const updatedSession = await sharedSessionsRepository.update({
      id: input.id,
      userId: input.userId,
      name: input.name,
      isActive: input.isActive,
      activeProfileId: nextActiveProfileId,
      slideshowEnabled: input.slideshowEnabled,
      slideshowIntervalSec: input.slideshowIntervalSec,
      rotationProfileIds: nextRotationProfileIds,
      currentIndex: nextCurrentIndex,
      lastAdvancedAt: input.currentIndex !== undefined ? existingSession.lastAdvancedAt : undefined,
    });

    if (!updatedSession) {
      return null;
    }

    if (requestedActiveProfileId !== undefined && requestedActiveProfileId !== existingSession.activeProfileId) {
      publishRealtimeEvent(
        createSharedSessionRealtimeEvent({
          type: "sharedSession.profileChanged",
          sessionId: updatedSession.id,
          payload: {
            activeProfileId: requestedActiveProfileId,
          },
        }),
      );
    }

    await emitSessionUpdated(updatedSession);
    return updatedSession;
  },

  async joinSession(input: JoinSharedSessionInput): Promise<SharedScreenSessionRecord | null> {
    const session = await sharedSessionsRepository.findByIdForUser({
      id: input.id,
      userId: input.userId,
    });

    if (!session) {
      return null;
    }

    if (!session.isActive) {
      throw apiErrors.validation("Cannot join an inactive shared session.");
    }

    const participant = await sharedSessionsRepository.upsertParticipant({
      sessionId: session.id,
      deviceId: input.deviceId,
      displayName: input.displayName,
    });

    const updatedSession = await sharedSessionsRepository.findByIdForUser({
      id: input.id,
      userId: input.userId,
    });

    if (!updatedSession) {
      return null;
    }

    publishRealtimeEvent(
      createSharedSessionRealtimeEvent({
        type: "sharedSession.participantJoined",
        sessionId: session.id,
        payload: {
          participant: participantToPayload(participant),
        },
      }),
    );
    await emitSessionUpdated(updatedSession);

    return updatedSession;
  },

  async leaveSession(input: LeaveSharedSessionInput): Promise<SharedScreenSessionRecord | null> {
    const session = await sharedSessionsRepository.findByIdForUser({
      id: input.id,
      userId: input.userId,
    });

    if (!session) {
      return null;
    }

    const left = await sharedSessionsRepository.removeParticipant({
      sessionId: session.id,
      deviceId: input.deviceId,
    });

    const updatedSession = await sharedSessionsRepository.findByIdForUser({
      id: input.id,
      userId: input.userId,
    });

    if (!updatedSession) {
      return null;
    }

    if (left) {
      publishRealtimeEvent(
        createSharedSessionRealtimeEvent({
          type: "sharedSession.participantLeft",
          sessionId: session.id,
          payload: {
            deviceId: input.deviceId,
          },
        }),
      );
      await emitSessionUpdated(updatedSession);
    }

    return updatedSession;
  },

  async advanceDueSessionRotations(now: Date = new Date()): Promise<number> {
    const activeSessions = await sharedSessionsRepository.findActiveSessionsForRotation();
    let advancedCount = 0;

    for (const session of activeSessions) {
      if (!isRotationDue(session, now)) {
        continue;
      }

      const profileCount = session.rotationProfileIds.length;
      if (profileCount < 2) {
        continue;
      }

      const currentIndex = normalizeCurrentIndex(session.currentIndex, profileCount);
      const nextIndex = (currentIndex + 1) % profileCount;
      const nextProfileId = session.rotationProfileIds[nextIndex];

      const advancedSession = await sharedSessionsRepository.advanceRotation({
        id: session.id,
        expectedCurrentIndex: session.currentIndex,
        expectedLastAdvancedAt: session.lastAdvancedAt,
        nextCurrentIndex: nextIndex,
        nextActiveProfileId: nextProfileId,
        advancedAt: now,
      });

      if (!advancedSession) {
        continue;
      }

      advancedCount += 1;
      publishRealtimeEvent(
        createSharedSessionRealtimeEvent({
          type: "sharedSession.rotationAdvanced",
          sessionId: advancedSession.id,
          payload: {
            playbackState: toSharedPlaybackState(advancedSession),
          },
        }),
      );
      await emitSessionUpdated(advancedSession);
      console.info("[shared-session] rotation advanced", {
        sessionId: advancedSession.id,
        nextProfileId,
        nextIndex,
      });
    }

    return advancedCount;
  },
};
