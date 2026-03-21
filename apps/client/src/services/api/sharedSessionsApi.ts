import { API_BASE_URL } from "../../core/config/api";
import type { SharedScreenSession } from "@ambient/shared-contracts";

const SHARED_SESSIONS_TIMEOUT_MS = 8000;

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

interface CreateSharedSessionPayload {
  name: string;
  activeProfileId?: string;
  slideshowEnabled?: boolean;
  slideshowIntervalSec?: number;
  rotationProfileIds?: string[];
  currentIndex?: number;
}

interface UpdateSharedSessionPayload {
  name?: string;
  isActive?: boolean;
  activeProfileId?: string | null;
  slideshowEnabled?: boolean;
  slideshowIntervalSec?: number;
  rotationProfileIds?: string[];
  currentIndex?: number;
}

interface JoinSharedSessionPayload {
  deviceId: string;
  displayName?: string;
}

interface LeaveSharedSessionPayload {
  deviceId: string;
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
  }, SHARED_SESSIONS_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: abortController.signal,
    });
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw new Error(`Request timed out after ${SHARED_SESSIONS_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function getSharedSessions(): Promise<SharedScreenSession[]> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/shared-sessions`);
  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch shared sessions: ${message}`);
  }

  return response.json();
}

export async function createSharedSession(payload: CreateSharedSessionPayload): Promise<SharedScreenSession> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/shared-sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to create shared session: ${message}`);
  }

  return response.json();
}

export async function getSharedSessionById(sessionId: string): Promise<SharedScreenSession> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/shared-sessions/${sessionId}`);
  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch shared session: ${message}`);
  }

  return response.json();
}

export async function updateSharedSession(
  sessionId: string,
  payload: UpdateSharedSessionPayload,
): Promise<SharedScreenSession> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/shared-sessions/${sessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to update shared session: ${message}`);
  }

  return response.json();
}

export async function joinSharedSession(
  sessionId: string,
  payload: JoinSharedSessionPayload,
): Promise<SharedScreenSession> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/shared-sessions/${sessionId}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to join shared session: ${message}`);
  }

  return response.json();
}

export async function leaveSharedSession(
  sessionId: string,
  payload: LeaveSharedSessionPayload,
): Promise<SharedScreenSession> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/shared-sessions/${sessionId}/leave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to leave shared session: ${message}`);
  }

  return response.json();
}
