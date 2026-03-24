import { createServer } from "node:http";
import { afterEach, beforeEach, test, expect, vi } from "vitest";
import WebSocket from "ws";
import { authService } from "../src/modules/auth/auth.service";
import { devicesRepository } from "../src/modules/devices/devices.repository";
import { profilesRepository } from "../src/modules/profiles/profiles.repository";
import { createRealtimeEvent } from "../src/modules/realtime/realtime.events";
import { createRealtimeServer } from "../src/modules/realtime/realtime.server";
import { sharedSessionsRepository } from "../src/modules/sharedSessions/sharedSessions.repository";

function rawDataToString(data: WebSocket.RawData): string {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof Buffer) {
    return data.toString("utf8");
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }

  return Buffer.from(new Uint8Array(data)).toString("utf8");
}

function waitForOpen(client: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    function cleanup() {
      client.off("open", onOpen);
      client.off("error", onError);
    }

    client.on("open", onOpen);
    client.on("error", onError);
  });
}

function waitForMessage(client: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const onMessage = (data: WebSocket.RawData) => {
      cleanup();
      resolve(rawDataToString(data));
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    function cleanup() {
      client.off("message", onMessage);
      client.off("error", onError);
    }

    client.on("message", onMessage);
    client.on("error", onError);
  });
}

function waitForSilence(client: WebSocket, durationMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, durationMs);

    const onMessage = () => {
      cleanup();
      reject(new Error("Unexpected message received."));
    };

    function cleanup() {
      clearTimeout(timeout);
      client.off("message", onMessage);
    }

    client.on("message", onMessage);
  });
}

async function startServerWithEphemeralPort(httpServer: ReturnType<typeof createServer>) {
  return new Promise<number>((resolve, reject) => {
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        reject(new Error("Expected numeric server address."));
        return;
      }
      resolve(address.port);
    };

    function cleanup() {
      httpServer.off("error", onError);
      httpServer.off("listening", onListening);
    }

    httpServer.on("error", onError);
    httpServer.on("listening", onListening);
    httpServer.listen(0, "127.0.0.1");
  });
}

function createAuthToken(userId = "user-1"): string {
  process.env.AUTH_JWT_SECRET = "test-auth-secret";
  return authService.createToken({
    userId,
    email: `${userId}@ambient.dev`,
  });
}

beforeEach(() => {
  vi.spyOn(profilesRepository, "findByIdForUser").mockImplementation(async ({ id, userId }) => {
    if (id.startsWith("profile-") && userId === "user-1") {
      return {
        id,
        userId,
        name: "Mock Profile",
        isDefault: true,
        createdAt: new Date("2026-03-21T09:00:00.000Z"),
      } as never;
    }

    return null as never;
  });

  vi.spyOn(sharedSessionsRepository, "findByIdForUser").mockImplementation(async ({ id, userId }) => {
    if (id.startsWith("session-") && userId === "user-1") {
      return {
        id,
        userId,
        name: "Mock Session",
        isActive: true,
        activeProfileId: "profile-1",
        slideshowEnabled: false,
        slideshowIntervalSec: 60,
        rotationProfileIds: [],
        currentIndex: 0,
        lastAdvancedAt: null,
        createdAt: new Date("2026-03-21T09:00:00.000Z"),
        updatedAt: new Date("2026-03-21T09:00:00.000Z"),
        participants: [],
      } as never;
    }

    return null as never;
  });

  vi.spyOn(devicesRepository, "findByIdForUser").mockImplementation(async ({ id, userId }) => {
    if (id.startsWith("device-") && userId === "user-1") {
      return {
        id,
        userId,
        name: "Mock Device",
        platform: "web",
        deviceType: "display",
        lastSeenAt: new Date("2026-03-21T09:00:00.000Z"),
        createdAt: new Date("2026-03-21T09:00:00.000Z"),
        updatedAt: new Date("2026-03-21T09:00:00.000Z"),
      } as never;
    }

    return null as never;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("realtime server initializes and delivers events for subscribed profile", async (t) => {
  const httpServer = createServer();
  const realtimeServer = createRealtimeServer(httpServer);

  let port: number;
  try {
    port = await startServerWithEphemeralPort(httpServer);
  } catch (error) {
    if ((error as { code?: string }).code === "EPERM") {
      t.skip("Sandbox does not allow binding local ports.");
      return;
    }
    throw error;
  }

  const token = createAuthToken("user-1");
  const client = new WebSocket(`ws://127.0.0.1:${port}/realtime?token=${token}&profileId=profile-1`);
  await waitForOpen(client);

  const messagePromise = waitForMessage(client);

  realtimeServer.publish(
    createRealtimeEvent({
      type: "display.refreshRequested",
      profileId: "profile-1",
      widgetId: "widget-1",
      timestamp: "2026-03-21T10:00:00.000Z",
    }),
  );

  const payload = await messagePromise;
  const parsed = JSON.parse(payload) as {
    type: string;
    profileId: string;
    widgetId?: string;
    timestamp: string;
  };

  expect(parsed.type).toBe("display.refreshRequested");
  expect(parsed.profileId).toBe("profile-1");
  expect(parsed.widgetId).toBe("widget-1");
  expect(parsed.timestamp).toBe("2026-03-21T10:00:00.000Z");

  client.close();
  await realtimeServer.close();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

test("realtime server scopes event delivery by profile", async (t) => {
  const httpServer = createServer();
  const realtimeServer = createRealtimeServer(httpServer);

  let port: number;
  try {
    port = await startServerWithEphemeralPort(httpServer);
  } catch (error) {
    if ((error as { code?: string }).code === "EPERM") {
      t.skip("Sandbox does not allow binding local ports.");
      return;
    }
    throw error;
  }

  const token = createAuthToken("user-1");
  const profileOneClient = new WebSocket(`ws://127.0.0.1:${port}/realtime?token=${token}`);
  const profileTwoClient = new WebSocket(`ws://127.0.0.1:${port}/realtime?token=${token}`);
  await Promise.all([waitForOpen(profileOneClient), waitForOpen(profileTwoClient)]);

  profileOneClient.send(JSON.stringify({ type: "subscribe", profileId: "profile-1" }));
  profileTwoClient.send(JSON.stringify({ type: "subscribe", profileId: "profile-2" }));

  await new Promise((resolve) => setTimeout(resolve, 50));

  const profileOneMessagePromise = waitForMessage(profileOneClient);

  realtimeServer.publish(
    createRealtimeEvent({
      type: "layout.updated",
      profileId: "profile-1",
      timestamp: "2026-03-21T11:00:00.000Z",
    }),
  );

  const profileOnePayload = await profileOneMessagePromise;
  const profileOneEvent = JSON.parse(profileOnePayload) as { profileId: string; type: string };
  expect(profileOneEvent.profileId).toBe("profile-1");
  expect(profileOneEvent.type).toBe("layout.updated");

  await waitForSilence(profileTwoClient, 120);

  profileOneClient.close();
  profileTwoClient.close();
  await realtimeServer.close();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

test("realtime server scopes event delivery by shared session", async (t) => {
  const httpServer = createServer();
  const realtimeServer = createRealtimeServer(httpServer);

  let port: number;
  try {
    port = await startServerWithEphemeralPort(httpServer);
  } catch (error) {
    if ((error as { code?: string }).code === "EPERM") {
      t.skip("Sandbox does not allow binding local ports.");
      return;
    }
    throw error;
  }

  const token = createAuthToken("user-1");
  const sessionOneClient = new WebSocket(`ws://127.0.0.1:${port}/realtime?token=${token}`);
  const sessionTwoClient = new WebSocket(`ws://127.0.0.1:${port}/realtime?token=${token}`);
  await Promise.all([waitForOpen(sessionOneClient), waitForOpen(sessionTwoClient)]);

  sessionOneClient.send(JSON.stringify({ type: "subscribeSession", sessionId: "session-1" }));
  sessionTwoClient.send(JSON.stringify({ type: "subscribeSession", sessionId: "session-2" }));

  await new Promise((resolve) => setTimeout(resolve, 50));

  const sessionOneMessagePromise = waitForMessage(sessionOneClient);

  realtimeServer.publish({
    scope: "sharedSession",
    type: "sharedSession.updated",
    sessionId: "session-1",
    timestamp: "2026-03-21T12:00:00.000Z",
    payload: {
      activeProfileId: "profile-2",
    },
  });

  const sessionOnePayload = await sessionOneMessagePromise;
  const sessionOneEvent = JSON.parse(sessionOnePayload) as {
    sessionId: string;
    type: string;
  };
  expect(sessionOneEvent.sessionId).toBe("session-1");
  expect(sessionOneEvent.type).toBe("sharedSession.updated");

  await waitForSilence(sessionTwoClient, 120);

  sessionOneClient.close();
  sessionTwoClient.close();
  await realtimeServer.close();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

test("realtime server rejects unauthenticated websocket handshake", async (t) => {
  const httpServer = createServer();
  const realtimeServer = createRealtimeServer(httpServer);

  let port: number;
  try {
    port = await startServerWithEphemeralPort(httpServer);
  } catch (error) {
    if ((error as { code?: string }).code === "EPERM") {
      t.skip("Sandbox does not allow binding local ports.");
      return;
    }
    throw error;
  }

  const client = new WebSocket(`ws://127.0.0.1:${port}/realtime`);
  await new Promise<void>((resolve) => {
    const complete = () => resolve();
    client.on("close", complete);
    client.on("error", complete);
  });

  expect(client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING).toBeTruthy();

  await realtimeServer.close();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

test("realtime server delivers device commands only to the targeted device channel", async (t) => {
  const httpServer = createServer();
  const realtimeServer = createRealtimeServer(httpServer);

  let port: number;
  try {
    port = await startServerWithEphemeralPort(httpServer);
  } catch (error) {
    if ((error as { code?: string }).code === "EPERM") {
      t.skip("Sandbox does not allow binding local ports.");
      return;
    }
    throw error;
  }

  const token = createAuthToken("user-1");
  const targetClient = new WebSocket(`ws://127.0.0.1:${port}/realtime?token=${token}&deviceId=device-1`);
  const otherClient = new WebSocket(`ws://127.0.0.1:${port}/realtime?token=${token}&deviceId=device-2`);
  await Promise.all([waitForOpen(targetClient), waitForOpen(otherClient)]);

  const targetMessagePromise = waitForMessage(targetClient);
  const delivered = realtimeServer.publishDeviceCommand({
    userId: "user-1",
    deviceId: "device-1",
    command: {
      type: "SET_SLIDESHOW",
      enabled: true,
    },
  });

  expect(delivered).toBeTruthy();
  const payload = await targetMessagePromise;
  const parsed = JSON.parse(payload) as {
    scope: string;
    type: string;
    deviceId: string;
    command: { type: string; enabled?: boolean };
  };
  expect(parsed.scope).toBe("device");
  expect(parsed.type).toBe("device.command");
  expect(parsed.deviceId).toBe("device-1");
  expect(parsed.command.type).toBe("SET_SLIDESHOW");
  expect(parsed.command.enabled).toBe(true);

  await waitForSilence(otherClient, 120);

  targetClient.close();
  otherClient.close();
  await realtimeServer.close();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});
