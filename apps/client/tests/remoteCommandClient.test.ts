import { expect, test } from "vitest";
import { setApiAuthToken } from "../src/services/api/apiClient";
import { createRemoteCommandClient } from "../src/features/remoteControl/services/remoteCommandClient";

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

test("remote command client subscribes to device channel and forwards valid commands", () => {
  setApiAuthToken("jwt-token");
  const receivedTypes: string[] = [];
  const createdSockets: FakeSocket[] = [];

  const client = createRemoteCommandClient({
    apiBaseUrl: "http://localhost:3000",
    websocketFactory: () => {
      const socket = createFakeSocket();
      createdSockets.push(socket);
      return socket;
    },
    onConnectionStateChange: () => undefined,
    onCommand: (command) => {
      receivedTypes.push(command.type);
    },
  });

  client.setDeviceId("device-1");
  client.connect();
  createdSockets[0].emitOpen();

  expect(createdSockets[0].sentPayloads).toEqual([
    JSON.stringify({ type: "subscribeDevice", deviceId: "device-1" }),
  ]);

  createdSockets[0].emitMessage(JSON.stringify({
    scope: "device",
    type: "device.command",
    deviceId: "device-1",
    timestamp: "2026-03-21T12:00:00.000Z",
    command: {
      type: "REFRESH",
    },
  }));

  createdSockets[0].emitMessage(JSON.stringify({
    scope: "device",
    type: "device.command",
    deviceId: "device-2",
    timestamp: "2026-03-21T12:00:01.000Z",
    command: {
      type: "REFRESH",
    },
  }));

  expect(receivedTypes).toEqual(["REFRESH"]);
  client.disconnect();
});

test("remote command client reconnects after disconnect", async () => {
  setApiAuthToken("jwt-token");
  const states: string[] = [];
  const createdSockets: FakeSocket[] = [];

  const client = createRemoteCommandClient({
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
    onCommand: () => undefined,
  });

  client.setDeviceId("device-1");
  client.connect();
  createdSockets[0].emitOpen();
  createdSockets[0].emitClose();

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 10);
  });

  expect(createdSockets.length).toBe(2);
  expect(states.includes("disconnected")).toBeTruthy();
  client.disconnect();
});
