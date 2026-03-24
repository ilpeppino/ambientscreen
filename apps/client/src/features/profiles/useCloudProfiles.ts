import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/auth.context";
import {
  activateProfile as activateProfileApi,
  createProfile as createProfileApi,
  deleteProfile as deleteProfileApi,
  getProfiles as getProfilesApi,
  renameProfile as renameProfileApi,
} from "../../services/api/profilesApi";
import type { Profile } from "@ambient/shared-contracts";

export function useCloudProfiles() {
  const { token } = useAuth();
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
      setProfiles([]);
      setActiveProfileId(null);
      setProfilesError(error instanceof Error ? error.message : "Failed to load profiles");
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  const activateProfile = useCallback(async (profileId: string) => {
    const response = await activateProfileApi(profileId);
    setActiveProfileId(response.activeProfileId);
    return response.activeProfileId;
  }, []);

  const createProfile = useCallback(async (name: string) => {
    await createProfileApi(name);
    await refreshProfiles();
  }, [refreshProfiles]);

  const renameProfile = useCallback(async (profileId: string, name: string) => {
    await renameProfileApi(profileId, name);
    await refreshProfiles();
  }, [refreshProfiles]);

  const deleteProfile = useCallback(async (profileId: string) => {
    await deleteProfileApi(profileId);
    await refreshProfiles();
  }, [refreshProfiles]);

  return {
    profiles,
    activeProfileId,
    isLoadingProfiles,
    profilesError,
    refreshProfiles,
    activateProfile,
    createProfile,
    renameProfile,
    deleteProfile,
  };
}
