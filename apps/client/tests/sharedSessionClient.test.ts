import { expect, test } from "vitest";
import {
  createSharedSessionClient,
  type SharedSessionRealtimeEvent,
} from "../src/features/display/services/sharedSessionClient";

interface FakeSocket {
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: { code?: number; reason?: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  close: () => void;
  send: (payload: string) => void;
  sentPayloads: string[];
  emitOpen: () => void;
  emitClose: () => void;
  emitError: () => void;
  emitMessage: (payload: string) => void;
}

function createFakeSocket(): FakeSocket {
  const socket: FakeSocket = {
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    sentPayloads: [],
    close() {
      socket.emitClose();
    },
    send(payload: string) {
      socket.sentPayloads.push(payload);
    },
    emitOpen() {
      socket.onopen?.({});
    },
    emitClose() {
      socket.onclose?.({ code: 1000 });
    },
    emitError() {
      socket.onerror?.({});
    },
    emitMessage(payload: string) {
      socket.onmessage?.({ data: payload });
    },
  };

  return socket;
}

test("shared session client subscribes and forwards session events", async () => {
  const states: string[] = [];
  const events: SharedSessionRealtimeEvent[] = [];
  const createdSockets: FakeSocket[] = [];

  const client = createSharedSessionClient({
    apiBaseUrl: "http://localhost:3000",
    websocketFactory: () => {
      const socket = createFakeSocket();
      createdSockets.push(socket);
      return socket;
    },
    onConnectionStateChange: (state) => {
      states.push(state);
    },
    onResyncRequested: () => undefined,
    onEvent: (event) => {
      events.push(event);
    },
  });

  client.setSessionId("session-1");
  client.connect();
  expect(createdSockets.length).toBe(1);
  createdSockets[0].emitOpen();

  expect(states).toEqual(["connecting", "connected"]);
  expect(createdSockets[0].sentPayloads).toEqual([
    JSON.stringify({ type: "subscribeSession", sessionId: "session-1" }),
  ]);

  createdSockets[0].emitMessage(JSON.stringify({
    scope: "sharedSession",
    type: "sharedSession.updated",
    sessionId: "session-1",
    timestamp: "2026-03-21T12:00:00.000Z",
  }));
  createdSockets[0].emitMessage(JSON.stringify({
    scope: "sharedSession",
    type: "sharedSession.updated",
    sessionId: "session-2",
    timestamp: "2026-03-21T12:00:01.000Z",
  }));

  expect(events.length).toBe(1);
  expect(events[0].sessionId).toBe("session-1");
});


test("shared session client reconnects and requests resync", async () => {
  const states: string[] = [];
  const createdSockets: FakeSocket[] = [];
  let resyncRequestedCount = 0;

  const client = createSharedSessionClient({
    apiBaseUrl: "http://localhost:3000",
    reconnectDelayMs: 1,
    maxReconnectDelayMs: 1,
    websocketFactory: () => {
      const socket = createFakeSocket();
      createdSockets.push(socket);
      return socket;
    },
    onConnectionStateChange: (state) => {
      states.push(state);
    },
    onResyncRequested: () => {
      resyncRequestedCount += 1;
    },
    onEvent: () => undefined,
  });

  client.setSessionId("session-1");
  client.connect();
  createdSockets[0].emitOpen();
  createdSockets[0].emitClose();

  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 10);
  });

  expect(createdSockets.length).toBe(2);
  createdSockets[1].emitOpen();
  expect(resyncRequestedCount).toBe(2);
  expect(states.includes("disconnected")).toBeTruthy();

  client.disconnect();
});
