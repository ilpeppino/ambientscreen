import type { RealtimeEvent, RealtimeServer } from "./realtime.types";

const noopRealtimeServer: RealtimeServer = {
  publish: () => undefined,
  close: async () => undefined,
};

let activeRealtimeServer: RealtimeServer = noopRealtimeServer;

export function configureRealtimeServer(server: RealtimeServer) {
  activeRealtimeServer = server;
}

export function publishRealtimeEvent(event: RealtimeEvent) {
  activeRealtimeServer.publish(event);
}

export function resetRealtimeServerForTests() {
  activeRealtimeServer = noopRealtimeServer;
}
