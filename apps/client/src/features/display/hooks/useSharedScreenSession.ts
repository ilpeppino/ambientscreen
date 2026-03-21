import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SharedScreenSession } from "@ambient/shared-contracts";
import {
  createSharedSession,
  getSharedSessionById,
  getSharedSessions,
  joinSharedSession,
  leaveSharedSession,
  updateSharedSession,
} from "../../../services/api/sharedSessionsApi";
import {
  createSharedSessionClient,
  type SharedSessionConnectionState,
} from "../services/sharedSessionClient";

interface UseSharedScreenSessionInput {
  apiBaseUrl: string;
  deviceId: string;
  displayName?: string;
}

interface SharedScreenSessionState {
  availableSessions: SharedScreenSession[];
  sharedSession: SharedScreenSession | null;
  activeSessionId: string | null;
  connectionState: SharedSessionConnectionState;
  loadingSessions: boolean;
  loadingSessionState: boolean;
  error: string | null;
  refreshSessions: () => Promise<void>;
  createAndJoinSession: (name: string) => Promise<void>;
  joinSessionById: (sessionId: string) => Promise<void>;
  leaveCurrentSession: () => Promise<void>;
  patchCurrentSession: (patch: {
    name?: string;
    isActive?: boolean;
    activeProfileId?: string | null;
    slideshowEnabled?: boolean;
    slideshowIntervalSec?: number;
    rotationProfileIds?: string[];
    currentIndex?: number;
  }) => Promise<void>;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function useSharedScreenSession(input: UseSharedScreenSessionInput): SharedScreenSessionState {
  const [availableSessions, setAvailableSessions] = useState<SharedScreenSession[]>([]);
  const [sharedSession, setSharedSession] = useState<SharedScreenSession | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<SharedSessionConnectionState>("disconnected");
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingSessionState, setLoadingSessionState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

  const resyncActiveSession = useCallback(async () => {
    const sessionId = activeSessionIdRef.current;
    if (!sessionId) {
      return;
    }

    try {
      setLoadingSessionState(true);
      const session = await getSharedSessionById(sessionId);
      if (!session.isActive) {
        console.info("[shared-session] active session is disabled; leaving shared mode", {
          sessionId,
        });
        setSharedSession(null);
        setActiveSessionId(null);
        return;
      }

      setSharedSession(session);
      setError(null);
      console.info("[shared-session] resynced", {
        sessionId,
      });
    } catch (sessionError) {
      setError(toErrorMessage(sessionError, "Failed to resync shared session"));
      setSharedSession(null);
      setActiveSessionId(null);
    } finally {
      setLoadingSessionState(false);
    }
  }, []);

  const clientRef = useRef(
    createSharedSessionClient({
      apiBaseUrl: input.apiBaseUrl,
      onConnectionStateChange: (nextState) => {
        setConnectionState(nextState);
      },
      onResyncRequested: () => {
        void resyncActiveSession();
      },
      onEvent: () => {
        void resyncActiveSession();
      },
    }),
  );

  useEffect(() => {
    clientRef.current.setSessionId(activeSessionId);
    if (!activeSessionId) {
      clientRef.current.disconnect();
      return;
    }

    clientRef.current.connect();

    return () => {
      clientRef.current.disconnect();
    };
  }, [activeSessionId]);

  useEffect(() => () => {
    clientRef.current.disconnect();
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const sessions = await getSharedSessions();
      setAvailableSessions(sessions);
      setError(null);
    } catch (sessionsError) {
      setError(toErrorMessage(sessionsError, "Failed to load shared sessions"));
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const joinSessionById = useCallback(async (sessionId: string) => {
    try {
      setLoadingSessionState(true);
      const session = await joinSharedSession(sessionId, {
        deviceId: input.deviceId,
        displayName: input.displayName,
      });
      setActiveSessionId(session.id);
      setSharedSession(session);
      setError(null);
      console.info("[shared-session] joined", {
        sessionId: session.id,
        deviceId: input.deviceId,
      });
      await refreshSessions();
    } catch (joinError) {
      setError(toErrorMessage(joinError, "Failed to join shared session"));
    } finally {
      setLoadingSessionState(false);
    }
  }, [input.deviceId, input.displayName, refreshSessions]);

  const createAndJoinSession = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Session name is required");
      return;
    }

    try {
      setLoadingSessionState(true);
      const createdSession = await createSharedSession({
        name: trimmedName,
      });
      await joinSessionById(createdSession.id);
      await refreshSessions();
    } catch (createError) {
      setError(toErrorMessage(createError, "Failed to create shared session"));
    } finally {
      setLoadingSessionState(false);
    }
  }, [joinSessionById, refreshSessions]);

  const leaveCurrentSession = useCallback(async () => {
    if (!activeSessionId) {
      return;
    }

    try {
      setLoadingSessionState(true);
      await leaveSharedSession(activeSessionId, {
        deviceId: input.deviceId,
      });
      console.info("[shared-session] left", {
        sessionId: activeSessionId,
        deviceId: input.deviceId,
      });
      setActiveSessionId(null);
      setSharedSession(null);
      setError(null);
      await refreshSessions();
    } catch (leaveError) {
      setError(toErrorMessage(leaveError, "Failed to leave shared session"));
    } finally {
      setLoadingSessionState(false);
    }
  }, [activeSessionId, input.deviceId, refreshSessions]);

  const patchCurrentSession = useCallback(async (patch: {
    name?: string;
    isActive?: boolean;
    activeProfileId?: string | null;
    slideshowEnabled?: boolean;
    slideshowIntervalSec?: number;
    rotationProfileIds?: string[];
    currentIndex?: number;
  }) => {
    if (!activeSessionId) {
      return;
    }

    try {
      const updated = await updateSharedSession(activeSessionId, patch);
      setSharedSession(updated);
      setError(null);
      console.info("[shared-session] updated", {
        sessionId: activeSessionId,
        patch,
      });
      await refreshSessions();
    } catch (patchError) {
      setError(toErrorMessage(patchError, "Failed to update shared session"));
    }
  }, [activeSessionId, refreshSessions]);

  return useMemo(() => ({
    availableSessions,
    sharedSession,
    activeSessionId,
    connectionState,
    loadingSessions,
    loadingSessionState,
    error,
    refreshSessions,
    createAndJoinSession,
    joinSessionById,
    leaveCurrentSession,
    patchCurrentSession,
  }), [
    availableSessions,
    sharedSession,
    activeSessionId,
    connectionState,
    loadingSessions,
    loadingSessionState,
    error,
    refreshSessions,
    createAndJoinSession,
    joinSessionById,
    leaveCurrentSession,
    patchCurrentSession,
  ]);
}
