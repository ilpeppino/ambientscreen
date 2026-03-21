import type { RealtimeEvent, RealtimeEventType } from "./realtime.types";

interface CreateRealtimeEventInput {
  type: RealtimeEventType;
  profileId: string;
  widgetId?: string;
  timestamp?: string;
}

export function createRealtimeEvent(input: CreateRealtimeEventInput): RealtimeEvent {
  return {
    type: input.type,
    profileId: input.profileId,
    ...(input.widgetId ? { widgetId: input.widgetId } : {}),
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}
