import type {
  ProfileRealtimeEvent,
  ProfileRealtimeEventType,
  SharedSessionRealtimeEvent,
  SharedSessionRealtimeEventType,
} from "./realtime.types";

interface CreateRealtimeEventInput {
  type: ProfileRealtimeEventType;
  profileId: string;
  widgetId?: string;
  timestamp?: string;
}

interface CreateSharedSessionRealtimeEventInput {
  type: SharedSessionRealtimeEventType;
  sessionId: string;
  timestamp?: string;
  payload?: Record<string, unknown>;
}

export function createRealtimeEvent(input: CreateRealtimeEventInput): ProfileRealtimeEvent {
  return {
    scope: "profile",
    type: input.type,
    profileId: input.profileId,
    ...(input.widgetId ? { widgetId: input.widgetId } : {}),
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

export function createSharedSessionRealtimeEvent(
  input: CreateSharedSessionRealtimeEventInput,
): SharedSessionRealtimeEvent {
  return {
    scope: "sharedSession",
    type: input.type,
    sessionId: input.sessionId,
    timestamp: input.timestamp ?? new Date().toISOString(),
    ...(input.payload ? { payload: input.payload } : {}),
  };
}
