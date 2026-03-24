import type { RemoteCommand } from "@ambient/shared-contracts";
import type { RealtimeEvent, RealtimeServer } from "./realtime.types";

const noopRealtimeServer: RealtimeServer = {
  publish: () => undefined,
  publishDeviceCommand: () => false,
  getDeviceConnectionSnapshot: () => ({
    online: false,
    lastConnectedAt: null,
  }),
  close: async () => undefined,
};

let activeRealtimeServer: RealtimeServer = noopRealtimeServer;

export function configureRealtimeServer(server: RealtimeServer) {
  activeRealtimeServer = server;
}

export function publishRealtimeEvent(event: RealtimeEvent) {
  activeRealtimeServer.publish(event);
}

export function publishDeviceRemoteCommand(input: {
  userId: string;
  deviceId: string;
  command: RemoteCommand;
}): boolean {
  return activeRealtimeServer.publishDeviceCommand(input);
}

export function getDeviceConnectionSnapshot(deviceId: string) {
  return activeRealtimeServer.getDeviceConnectionSnapshot(deviceId);
}

export function resetRealtimeServerForTests() {
  activeRealtimeServer = noopRealtimeServer;
}
