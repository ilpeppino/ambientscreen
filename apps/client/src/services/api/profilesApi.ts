import { API_BASE_URL } from "../../core/config/api";
import type { Profile } from "@ambient/shared-contracts";

const PROFILES_TIMEOUT_MS = 8000;

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

async function toApiErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    if (body.error?.message) {
      return body.error.message;
    }
  } catch {
    // Fallback to status-based message when response is not JSON.
  }

  return `Request failed with status ${response.status}`;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort();
  }, PROFILES_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: abortController.signal,
    });
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw new Error(`Request timed out after ${PROFILES_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function getProfiles(): Promise<Profile[]> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/profiles`);
  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch profiles: ${message}`);
  }

  return response.json();
}

export async function createProfile(name: string): Promise<Profile> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to create profile: ${message}`);
  }

  return response.json();
}

export async function renameProfile(profileId: string, name: string): Promise<Profile> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/profiles/${profileId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to rename profile: ${message}`);
  }

  return response.json();
}

export async function deleteProfile(profileId: string): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/profiles/${profileId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to delete profile: ${message}`);
  }
}
