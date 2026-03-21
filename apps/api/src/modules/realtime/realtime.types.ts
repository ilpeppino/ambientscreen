export type RealtimeEventType =
  | "profile.updated"
  | "widget.created"
  | "widget.updated"
  | "widget.deleted"
  | "layout.updated"
  | "display.refreshRequested";

export interface RealtimeEvent {
  type: RealtimeEventType;
  profileId: string;
  widgetId?: string;
  timestamp: string;
}

export interface RealtimeServer {
  publish: (event: RealtimeEvent) => void;
  close: () => Promise<void>;
}

export type RealtimeConnectionState = "connecting" | "connected" | "disconnected" | "error";
