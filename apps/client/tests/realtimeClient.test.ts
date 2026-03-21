import { test, expect } from "vitest";
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
  expect(
    buildRealtimeUrl("http://localhost:3000", "profile-1"),
  ).toBe("ws://localhost:3000/realtime?profileId=profile-1");
  expect(
    buildRealtimeUrl("https://ambient.example.com", null),
  ).toBe("wss://ambient.example.com/realtime");
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

  expect(createdSockets.length).toBe(1);
  expect(states[0]).toBe("connecting");

  createdSockets[0].emitOpen();
  expect(states[1]).toBe("connected");

  expect(createdSockets[0].sentPayloads).toEqual(
    [JSON.stringify({ type: "subscribe", profileId: "profile-1" })],
  );

  client.disconnect();
  expect(states[states.length - 1]).toBe("disconnected");
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

  expect(receivedEvents.length).toBe(1);
  expect(receivedEvents[0].type).toBe("widget.updated");
  expect(receivedEvents[0].profileId).toBe("profile-1");
  expect(receivedEvents[0].widgetId).toBe("widget-1");
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

  expect(createdSockets.length).toBe(2);
  expect(states.includes("disconnected")).toBeTruthy();
  expect(states[states.length - 1]).toBe("connecting");

  client.disconnect();
});
