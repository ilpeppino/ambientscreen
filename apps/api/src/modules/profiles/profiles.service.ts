import { profilesRepository } from "./profiles.repository";
import { createRealtimeEvent } from "../realtime/realtime.events";
import { publishRealtimeEvent } from "../realtime/realtime.runtime";
import { orchestrationService } from "../orchestration/orchestration.service";

export interface ProfileRecord {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  defaultSlideDurationSeconds: number;
}

export interface ProfilesListResult {
  profiles: ProfileRecord[];
  activeProfileId: string | null;
}

async function ensureActiveProfileForUser(userId: string): Promise<string | null> {
  const userState = await profilesRepository.getUserActiveProfileId(userId);
  if (userState?.activeProfileId) {
    const activeProfile = await profilesRepository.findByIdForUser({
      id: userState.activeProfileId,
      userId,
    });

    if (activeProfile) {
      return activeProfile.id;
    }
  }

  const defaultProfile = await profilesRepository.findDefaultByUser(userId);
  if (defaultProfile) {
    await profilesRepository.setUserActiveProfileId(userId, defaultProfile.id);
    return defaultProfile.id;
  }

  const existingProfiles = await profilesRepository.findAllByUser(userId);
  if (existingProfiles.length > 0) {
    const nextDefaultProfile = await profilesRepository.setDefaultProfileForUser(userId, existingProfiles[0].id);
    await profilesRepository.setUserActiveProfileId(userId, nextDefaultProfile.id);
    return nextDefaultProfile.id;
  }

  return null;
}

export const profilesService = {
  getProfilesForUser(userId: string) {
    return profilesRepository.findAllByUser(userId);
  },

  async getProfilesWithActiveForUser(userId: string): Promise<ProfilesListResult> {
    await this.getOrCreateDefaultProfileForUser(userId);
    const [profiles, activeProfileId] = await Promise.all([
      profilesRepository.findAllByUser(userId),
      ensureActiveProfileForUser(userId),
    ]);

    return {
      profiles,
      activeProfileId,
    };
  },

  async getOrCreateDefaultProfileForUser(userId: string): Promise<ProfileRecord> {
    const existingDefault = await profilesRepository.findDefaultByUser(userId);
    if (existingDefault) {
      return existingDefault;
    }

    const existingProfiles = await profilesRepository.findAllByUser(userId);
    if (existingProfiles.length > 0) {
      return profilesRepository.setDefaultProfileForUser(userId, existingProfiles[0].id);
    }

    return profilesRepository.create({
      userId,
      name: "Default",
      isDefault: true,
    });
  },

  async getProfileByIdForUser(data: { userId: string; profileId: string }) {
    return profilesRepository.findByIdForUser({
      id: data.profileId,
      userId: data.userId,
    });
  },

  async getActiveProfileIdForUser(userId: string): Promise<string | null> {
    await this.getOrCreateDefaultProfileForUser(userId);
    return ensureActiveProfileForUser(userId);
  },

  async activateProfileForUser(data: { userId: string; profileId: string }) {
    const profile = await profilesRepository.findByIdForUser({
      id: data.profileId,
      userId: data.userId,
    });

    if (!profile) {
      return null;
    }

    await profilesRepository.setUserActiveProfileId(data.userId, profile.id);

    publishRealtimeEvent(
      createRealtimeEvent({
        type: "profile.updated",
        profileId: profile.id,
      }),
    );
    publishRealtimeEvent(
      createRealtimeEvent({
        type: "display.refreshRequested",
        profileId: profile.id,
      }),
    );

    return profile;
  },

  async resolveProfileForUser(data: { userId: string; profileId?: string | null }) {
    if (!data.profileId) {
      const activeProfileId = await this.getActiveProfileIdForUser(data.userId);
      if (!activeProfileId) {
        return null;
      }

      return profilesRepository.findByIdForUser({
        id: activeProfileId,
        userId: data.userId,
      });
    }

    return profilesRepository.findByIdForUser({
      id: data.profileId,
      userId: data.userId,
    });
  },

  async createProfileForUser(data: { userId: string; name: string }) {
    const existingProfiles = await profilesRepository.findAllByUser(data.userId);
    const createdProfile = await profilesRepository.create({
      userId: data.userId,
      name: data.name,
      isDefault: existingProfiles.length === 0,
    });

    const activeProfileId = await this.getActiveProfileIdForUser(data.userId);
    if (!activeProfileId) {
      await profilesRepository.setUserActiveProfileId(data.userId, createdProfile.id);
    }

    publishRealtimeEvent(
      createRealtimeEvent({
        type: "profile.updated",
        profileId: createdProfile.id,
      }),
    );
    publishRealtimeEvent(
      createRealtimeEvent({
        type: "display.refreshRequested",
        profileId: createdProfile.id,
      }),
    );

    return createdProfile;
  },

  async renameProfileForUser(data: { userId: string; profileId: string; name: string }) {
    return this.updateProfileForUser({
      userId: data.userId,
      profileId: data.profileId,
      name: data.name,
    });
  },

  async updateProfileForUser(data: {
    userId: string;
    profileId: string;
    name?: string;
    defaultSlideDurationSeconds?: number;
  }) {
    const profile = await profilesRepository.findByIdForUser({
      id: data.profileId,
      userId: data.userId,
    });
    if (!profile) {
      return null;
    }

    const updatedProfile = await profilesRepository.update(profile.id, {
      name: data.name,
      defaultSlideDurationSeconds: data.defaultSlideDurationSeconds,
    });

    publishRealtimeEvent(
      createRealtimeEvent({
        type: "profile.updated",
        profileId: updatedProfile.id,
      }),
    );
    publishRealtimeEvent(
      createRealtimeEvent({
        type: "display.refreshRequested",
        profileId: updatedProfile.id,
      }),
    );

    return updatedProfile;
  },

  async deleteProfileForUser(data: { userId: string; profileId: string }) {
    const profile = await profilesRepository.findByIdForUser({
      id: data.profileId,
      userId: data.userId,
    });
    if (!profile) {
      return { deleted: false as const, reason: "notFound" as const };
    }

    const profileCount = await profilesRepository.countByUser(data.userId);
    if (profileCount <= 1) {
      return { deleted: false as const, reason: "lastProfile" as const };
    }

    const activeProfileIdBeforeDelete = await this.getActiveProfileIdForUser(data.userId);

    await profilesRepository.deleteByIdWithWidgets(profile.id);
    await orchestrationService.removeProfileFromRotationRules({
      userId: data.userId,
      profileId: profile.id,
    });

    const remainingProfiles = await profilesRepository.findAllByUser(data.userId);

    if (profile.isDefault && remainingProfiles.length > 0) {
      await profilesRepository.setDefaultProfileForUser(data.userId, remainingProfiles[0].id);
    }

    if (activeProfileIdBeforeDelete === profile.id) {
      const nextActiveProfileId = remainingProfiles[0]?.id ?? null;
      await profilesRepository.setUserActiveProfileId(data.userId, nextActiveProfileId);
    }

    publishRealtimeEvent(
      createRealtimeEvent({
        type: "display.refreshRequested",
        profileId: remainingProfiles[0]?.id,
      }),
    );

    return { deleted: true as const };
  },
};
