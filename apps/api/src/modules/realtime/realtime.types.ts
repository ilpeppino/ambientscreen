export type ProfileRealtimeEventType =
  | "profile.updated"
  | "widget.created"
  | "widget.updated"
  | "widget.deleted"
  | "layout.updated"
  | "display.refreshRequested";

export type SharedSessionRealtimeEventType =
  | "sharedSession.updated"
  | "sharedSession.profileChanged"
  | "sharedSession.rotationAdvanced"
  | "sharedSession.participantJoined"
  | "sharedSession.participantLeft";

export interface ProfileRealtimeEvent {
  scope: "profile";
  type: ProfileRealtimeEventType;
  profileId: string;
  widgetId?: string;
  timestamp: string;
}

export interface SharedSessionRealtimeEvent {
  scope: "sharedSession";
  type: SharedSessionRealtimeEventType;
  sessionId: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export type RealtimeEvent = ProfileRealtimeEvent | SharedSessionRealtimeEvent;

export interface RealtimeServer {
  publish: (event: RealtimeEvent) => void;
  close: () => Promise<void>;
}

export type RealtimeConnectionState = "connecting" | "connected" | "disconnected" | "error";
