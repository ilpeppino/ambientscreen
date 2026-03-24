import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";
import type { SharedScreenSession } from "@ambient/shared-contracts";

const SHARED_SESSIONS_TIMEOUT_MS = 8000;

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

export async function getSharedSessions(): Promise<SharedScreenSession[]> {
  const response = await apiFetchWithTimeout(
    `${API_BASE_URL}/shared-sessions`,
    undefined,
    SHARED_SESSIONS_TIMEOUT_MS,
  );
  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch shared sessions: ${message}`);
  }

  return response.json();
}

export async function createSharedSession(payload: CreateSharedSessionPayload): Promise<SharedScreenSession> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/shared-sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, SHARED_SESSIONS_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to create shared session: ${message}`);
  }

  return response.json();
}

export async function getSharedSessionById(sessionId: string): Promise<SharedScreenSession> {
  const response = await apiFetchWithTimeout(
    `${API_BASE_URL}/shared-sessions/${sessionId}`,
    undefined,
    SHARED_SESSIONS_TIMEOUT_MS,
  );
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
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/shared-sessions/${sessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, SHARED_SESSIONS_TIMEOUT_MS);

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
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/shared-sessions/${sessionId}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, SHARED_SESSIONS_TIMEOUT_MS);

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
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/shared-sessions/${sessionId}/leave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, SHARED_SESSIONS_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to leave shared session: ${message}`);
  }

  return response.json();
}
