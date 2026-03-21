import { profilesRepository } from "./profiles.repository";
import { createRealtimeEvent } from "../realtime/realtime.events";
import { publishRealtimeEvent } from "../realtime/realtime.runtime";
import { usersService } from "../users/users.service";
import { orchestrationService } from "../orchestration/orchestration.service";

export interface ProfileRecord {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
}

export const profilesService = {
  async getPrimaryUserId(): Promise<string> {
    const users = await usersService.getAllUsers();
    if (users.length === 0) {
      throw new Error("No users exist yet. Create a user first.");
    }

    return users[0].id;
  },

  getProfilesForUser(userId: string) {
    return profilesRepository.findAllByUser(userId);
  },

  async getProfilesForPrimaryUser() {
    const userId = await this.getPrimaryUserId();
    await this.getOrCreateDefaultProfileForUser(userId);
    return profilesRepository.findAllByUser(userId);
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

  async resolveProfileForUser(data: { userId: string; profileId?: string | null }) {
    if (!data.profileId) {
      return {
        id: data.userId,
        userId: data.userId,
        name: "Default",
        isDefault: true,
        createdAt: new Date(0),
      };
    }

    const profile = await profilesRepository.findById(data.profileId);
    if (!profile || profile.userId !== data.userId) {
      return null;
    }

    return profile;
  },

  async createProfileForUser(data: { userId: string; name: string }) {
    const existingProfiles = await profilesRepository.findAllByUser(data.userId);
    const createdProfile = await profilesRepository.create({
      userId: data.userId,
      name: data.name,
      isDefault: existingProfiles.length === 0,
    });

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
    const profile = await profilesRepository.findById(data.profileId);
    if (!profile || profile.userId !== data.userId) {
      return null;
    }

    const updatedProfile = await profilesRepository.updateName(profile.id, data.name);

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
    const profile = await profilesRepository.findById(data.profileId);
    if (!profile || profile.userId !== data.userId) {
      return { deleted: false as const, reason: "notFound" as const };
    }

    const profileCount = await profilesRepository.countByUser(data.userId);
    if (profileCount <= 1) {
      return { deleted: false as const, reason: "lastProfile" as const };
    }

    await profilesRepository.deleteByIdWithWidgets(profile.id);
    await orchestrationService.removeProfileFromRotationRules({
      userId: data.userId,
      profileId: profile.id,
    });

    if (profile.isDefault) {
      const remainingProfiles = await profilesRepository.findAllByUser(data.userId);
      if (remainingProfiles.length > 0) {
        const updatedDefaultProfile = await profilesRepository.setDefaultProfileForUser(
          data.userId,
          remainingProfiles[0].id,
        );
        publishRealtimeEvent(
          createRealtimeEvent({
            type: "profile.updated",
            profileId: updatedDefaultProfile.id,
          }),
        );
        publishRealtimeEvent(
          createRealtimeEvent({
            type: "display.refreshRequested",
            profileId: updatedDefaultProfile.id,
          }),
        );
      }
    }

    return { deleted: true as const };
  },
};
