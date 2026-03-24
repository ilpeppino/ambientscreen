import type { RemoteCommand } from "@ambient/shared-contracts";

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

export interface DeviceCommandRealtimeEvent {
  scope: "device";
  type: "device.command";
  deviceId: string;
  timestamp: string;
  command: RemoteCommand;
}

export type RealtimeEvent = ProfileRealtimeEvent | SharedSessionRealtimeEvent | DeviceCommandRealtimeEvent;

export interface DeviceConnectionSnapshot {
  online: boolean;
  lastConnectedAt: Date | null;
}

export interface RealtimeServer {
  publish: (event: RealtimeEvent) => void;
  publishDeviceCommand: (input: { userId: string; deviceId: string; command: RemoteCommand }) => boolean;
  getDeviceConnectionSnapshot: (deviceId: string) => DeviceConnectionSnapshot;
  close: () => Promise<void>;
}

export type RealtimeConnectionState = "connecting" | "connected" | "disconnected" | "error";
