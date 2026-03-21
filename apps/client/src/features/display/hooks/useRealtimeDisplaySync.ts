import { useEffect, useMemo, useRef, useState } from "react";
import {
  createRealtimeClient,
  type RealtimeConnectionState,
  type RealtimeEvent,
} from "../services/realtimeClient";
import { createRefreshDebouncer } from "./realtimeDisplaySync.logic";

interface UseRealtimeDisplaySyncInput {
  apiBaseUrl: string;
  activeProfileId: string | null;
  enabled?: boolean;
  debounceMs?: number;
  onRefreshRequested: () => void;
}

const DEFAULT_DEBOUNCE_MS = 300;

const REFRESH_TRIGGER_EVENT_TYPES = new Set<RealtimeEvent["type"]>([
  "profile.updated",
  "widget.created",
  "widget.updated",
  "widget.deleted",
  "layout.updated",
  "display.refreshRequested",
]);

export function useRealtimeDisplaySync(input: UseRealtimeDisplaySyncInput): RealtimeConnectionState {
  const enabled = input.enabled ?? true;
  const debounceMs = input.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("disconnected");

  const refreshCallbackRef = useRef(input.onRefreshRequested);
  refreshCallbackRef.current = input.onRefreshRequested;

  const activeProfileIdRef = useRef(input.activeProfileId);
  activeProfileIdRef.current = input.activeProfileId;

  const debouncer = useMemo(
    () => createRefreshDebouncer(() => refreshCallbackRef.current(), debounceMs),
    [debounceMs],
  );

  const debouncerRef = useRef(debouncer);
  debouncerRef.current = debouncer;

  const clientRef = useRef(
    createRealtimeClient({
      apiBaseUrl: input.apiBaseUrl,
      onConnectionStateChange: (state) => {
        setConnectionState(state);
      },
      onEvent: (event) => {
        const activeProfileId = activeProfileIdRef.current;
        if (!activeProfileId || event.profileId !== activeProfileId) {
          return;
        }

        if (!REFRESH_TRIGGER_EVENT_TYPES.has(event.type)) {
          return;
        }

        debouncerRef.current.trigger();
      },
    }),
  );

  useEffect(() => {
    clientRef.current.setProfileId(input.activeProfileId);
  }, [input.activeProfileId]);

  useEffect(() => {
    if (!enabled) {
      clientRef.current.disconnect();
      return;
    }

    clientRef.current.connect();

    return () => {
      clientRef.current.disconnect();
    };
  }, [enabled]);

  useEffect(() => {
    return () => {
      debouncer.cancel();
    };
  }, [debouncer]);

  return connectionState;
}
