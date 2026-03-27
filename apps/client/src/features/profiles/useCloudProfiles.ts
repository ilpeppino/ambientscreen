import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/auth.context";
import {
  activateProfile as activateProfileApi,
  createProfile as createProfileApi,
  deleteProfile as deleteProfileApi,
  getProfiles as getProfilesApi,
  renameProfile as renameProfileApi,
  updateProfile as updateProfileApi,
} from "../../services/api/profilesApi";
import type { Profile } from "@ambient/shared-contracts";
import { isUnauthorizedApiError } from "../../services/api/apiClient";

export function useCloudProfiles() {
  const { token, logout } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const refreshProfiles = useCallback(async () => {
    if (!token) {
      setProfiles([]);
      setActiveProfileId(null);
      setProfilesError(null);
      return;
    }

    setIsLoadingProfiles(true);
    try {
      const result = await getProfilesApi();
      setProfiles(result.profiles);
      setActiveProfileId(result.activeProfileId);
      setProfilesError(null);
    } catch (error) {
      if (isUnauthorizedApiError(error)) {
        await logout();
        return;
      }
      setProfiles([]);
      setActiveProfileId(null);
      setProfilesError(error instanceof Error ? error.message : "Failed to load profiles");
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [logout, token]);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  const activateProfile = useCallback(async (profileId: string) => {
    try {
      const response = await activateProfileApi(profileId);
      setActiveProfileId(response.activeProfileId);
      return response.activeProfileId;
    } catch (error) {
      if (isUnauthorizedApiError(error)) {
        await logout();
      }
      throw error;
    }
  }, [logout]);

  const createProfile = useCallback(async (name: string) => {
    try {
      await createProfileApi(name);
      await refreshProfiles();
    } catch (error) {
      if (isUnauthorizedApiError(error)) {
        await logout();
      }
      throw error;
    }
  }, [logout, refreshProfiles]);

  const renameProfile = useCallback(async (profileId: string, name: string) => {
    try {
      await renameProfileApi(profileId, name);
      await refreshProfiles();
    } catch (error) {
      if (isUnauthorizedApiError(error)) {
        await logout();
      }
      throw error;
    }
  }, [logout, refreshProfiles]);

  const updateProfile = useCallback(
    async (
      profileId: string,
      patch: { name?: string; defaultSlideDurationSeconds?: number },
    ) => {
      try {
        await updateProfileApi(profileId, patch);
        await refreshProfiles();
      } catch (error) {
        if (isUnauthorizedApiError(error)) {
          await logout();
        }
        throw error;
      }
    },
    [logout, refreshProfiles],
  );

  const deleteProfile = useCallback(async (profileId: string) => {
    try {
      await deleteProfileApi(profileId);
      await refreshProfiles();
    } catch (error) {
      if (isUnauthorizedApiError(error)) {
        await logout();
      }
      throw error;
    }
  }, [logout, refreshProfiles]);

  return {
    profiles,
    activeProfileId,
    isLoadingProfiles,
    profilesError,
    refreshProfiles,
    activateProfile,
    createProfile,
    renameProfile,
    updateProfile,
    deleteProfile,
  };
}
