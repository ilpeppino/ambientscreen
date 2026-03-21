import assert from "node:assert/strict";
import test from "node:test";
import { buildRealtimeUrl, createRealtimeClient, type RealtimeEvent } from "../src/features/display/services/realtimeClient";

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

test("buildRealtimeUrl converts http API URL to ws realtime endpoint", () => {
  assert.equal(
    buildRealtimeUrl("http://localhost:3000", "profile-1"),
    "ws://localhost:3000/realtime?profileId=profile-1",
  );
  assert.equal(
    buildRealtimeUrl("https://ambient.example.com", null),
    "wss://ambient.example.com/realtime",
  );
});

test("createRealtimeClient tracks connection lifecycle and sends profile subscription", async () => {
  const states: string[] = [];
  const createdSockets: FakeSocket[] = [];

  const client = createRealtimeClient({
    apiBaseUrl: "http://localhost:3000",
    websocketFactory: () => {
      const socket = createFakeSocket();
      createdSockets.push(socket);
      return socket;
    },
    onConnectionStateChange: (state) => {
      states.push(state);
    },
    onEvent: () => undefined,
  });

  client.setProfileId("profile-1");
  client.connect();

  assert.equal(createdSockets.length, 1);
  assert.equal(states[0], "connecting");

  createdSockets[0].emitOpen();
  assert.equal(states[1], "connected");

  assert.deepEqual(
    createdSockets[0].sentPayloads,
    [JSON.stringify({ type: "subscribe", profileId: "profile-1" })],
  );

  client.disconnect();
  assert.equal(states[states.length - 1], "disconnected");
});

test("createRealtimeClient forwards valid events and ignores invalid payloads", () => {
  const receivedEvents: RealtimeEvent[] = [];
  const createdSockets: FakeSocket[] = [];

  const client = createRealtimeClient({
    apiBaseUrl: "http://localhost:3000",
    websocketFactory: () => {
      const socket = createFakeSocket();
      createdSockets.push(socket);
      return socket;
    },
    onConnectionStateChange: () => undefined,
    onEvent: (event) => {
      receivedEvents.push(event);
    },
  });

  client.connect();
  createdSockets[0].emitOpen();

  createdSockets[0].emitMessage("not-json");
  createdSockets[0].emitMessage(JSON.stringify({ type: "unknown", profileId: "p1", timestamp: "t" }));
  createdSockets[0].emitMessage(
    JSON.stringify({
      type: "widget.updated",
      profileId: "profile-1",
      widgetId: "widget-1",
      timestamp: "2026-03-21T12:00:00.000Z",
    }),
  );

  assert.equal(receivedEvents.length, 1);
  assert.equal(receivedEvents[0].type, "widget.updated");
  assert.equal(receivedEvents[0].profileId, "profile-1");
  assert.equal(receivedEvents[0].widgetId, "widget-1");
});

test("createRealtimeClient reconnects after unexpected disconnect", async () => {
  const states: string[] = [];
  const createdSockets: FakeSocket[] = [];

  const client = createRealtimeClient({
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
    onEvent: () => undefined,
  });

  client.connect();
  createdSockets[0].emitOpen();
  createdSockets[0].emitClose();

  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 10);
  });

  assert.equal(createdSockets.length, 2);
  assert.ok(states.includes("disconnected"));
  assert.equal(states[states.length - 1], "connecting");

  client.disconnect();
});
