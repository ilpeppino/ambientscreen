import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";
import type { Profile, ProfilesListResponse } from "@ambient/shared-contracts";

const PROFILES_TIMEOUT_MS = 8000;

export async function getProfiles(): Promise<ProfilesListResponse> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/profiles`, undefined, PROFILES_TIMEOUT_MS);
  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch profiles: ${message}`);
  }

  return response.json();
}

export async function getProfile(profileId: string): Promise<Profile> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/profiles/${profileId}`, undefined, PROFILES_TIMEOUT_MS);
  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch profile: ${message}`);
  }

  return response.json();
}

export async function createProfile(name: string): Promise<Profile> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  }, PROFILES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to create profile: ${message}`);
  }

  return response.json();
}

export async function renameProfile(profileId: string, name: string): Promise<Profile> {
  return updateProfile(profileId, { name });
}

export async function updateProfile(
  profileId: string,
  payload: { name?: string; defaultSlideDurationSeconds?: number },
): Promise<Profile> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/profiles/${profileId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, PROFILES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to update profile: ${message}`);
  }

  return response.json();
}

export async function deleteProfile(profileId: string): Promise<void> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/profiles/${profileId}`, {
    method: "DELETE",
  }, PROFILES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to delete profile: ${message}`);
  }
}

export async function activateProfile(profileId: string): Promise<{ activeProfileId: string }> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/profiles/${profileId}/activate`, {
    method: "PATCH",
  }, PROFILES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to activate profile: ${message}`);
  }

  return response.json();
}

export async function clearProfileWidgets(profileId: string): Promise<{ deletedCount: number }> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/profiles/${profileId}/widgets`, {
    method: "DELETE",
  }, PROFILES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to clear profile widgets: ${message}`);
  }

  return response.json();
}
