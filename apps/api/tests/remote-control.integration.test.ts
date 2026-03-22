import { createServer } from "node:http";
import express from "express";
import { afterEach, beforeEach, test, expect, vi } from "vitest";
import WebSocket from "ws";
import { authService } from "../src/modules/auth/auth.service";
import { devicesRepository } from "../src/modules/devices/devices.repository";
import { requireAuth } from "../src/modules/auth/auth.middleware";
import { devicesRouter } from "../src/modules/devices/devices.routes";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { createRealtimeServer } from "../src/modules/realtime/realtime.server";
import { configureRealtimeServer, resetRealtimeServerForTests } from "../src/modules/realtime/realtime.runtime";

function rawDataToString(data: WebSocket.RawData): string {
  if (typeof data === "string") return data;
  if (data instanceof Buffer) return data.toString("utf8");
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  return Buffer.from(new Uint8Array(data)).toString("utf8");
}

function waitForOpen(client: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOpen = () => { cleanup(); resolve(); };
    const onError = (error: Error) => { cleanup(); reject(error); };
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
    const onMessage = (data: WebSocket.RawData) => { cleanup(); resolve(rawDataToString(data)); };
    const onError = (error: Error) => { cleanup(); reject(error); };
    function cleanup() {
      client.off("message", onMessage);
      client.off("error", onError);
    }
    client.on("message", onMessage);
    client.on("error", onError);
  });
}

async function startServerWithEphemeralPort(httpServer: ReturnType<typeof createServer>): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => { cleanup(); reject(error); };
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
  return authService.createToken({ userId, email: `${userId}@ambient.dev` });
}

beforeEach(() => {
  vi.spyOn(devicesRepository, "findByIdForUser").mockImplementation(async ({ id, userId }) => {
    if ((id === "device-1" || id === "device-2") && userId === "user-1") {
      return {
        id,
        userId,
        name: "Test Device",
        platform: "web",
        deviceType: "display",
        lastSeenAt: new Date("2026-03-22T09:00:00.000Z"),
        createdAt: new Date("2026-03-22T09:00:00.000Z"),
        updatedAt: new Date("2026-03-22T09:00:00.000Z"),
      } as never;
    }
    return null as never;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  resetRealtimeServerForTests();
});

test("POST /devices/:id/command delivers command to connected device WebSocket end-to-end", async (t) => {
  const app = express();
  app.use(express.json());
  app.use("/devices", requireAuth, devicesRouter);
  app.use(globalErrorMiddleware);

  const httpServer = createServer(app);
  const realtimeServer = createRealtimeServer(httpServer);
  configureRealtimeServer(realtimeServer);

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
  const deviceClient = new WebSocket(
    `ws://127.0.0.1:${port}/realtime?token=${token}&deviceId=device-1`,
  );
  await waitForOpen(deviceClient);
  // Allow the async subscribeClientToDevice to resolve before issuing the command.
  await new Promise((resolve) => setTimeout(resolve, 50));

  const messagePromise = waitForMessage(deviceClient);

  const response = await fetch(`http://127.0.0.1:${port}/devices/device-1/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type: "REFRESH" }),
  });

  expect(response.status).toBe(202);
  const body = await response.json() as { success: boolean; deviceId: string; commandType: string };
  expect(body.success).toBe(true);
  expect(body.deviceId).toBe("device-1");
  expect(body.commandType).toBe("REFRESH");

  const payload = await messagePromise;
  const parsed = JSON.parse(payload) as {
    scope: string;
    type: string;
    deviceId: string;
    command: { type: string };
  };
  expect(parsed.scope).toBe("device");
  expect(parsed.type).toBe("device.command");
  expect(parsed.deviceId).toBe("device-1");
  expect(parsed.command.type).toBe("REFRESH");

  deviceClient.close();
  await realtimeServer.close();
  await new Promise<void>((resolve) => { httpServer.close(() => resolve()); });
});

test("POST /devices/:id/command delivers SET_PROFILE command with profileId to connected device", async (t) => {
  const app = express();
  app.use(express.json());
  app.use("/devices", requireAuth, devicesRouter);
  app.use(globalErrorMiddleware);

  const httpServer = createServer(app);
  const realtimeServer = createRealtimeServer(httpServer);
  configureRealtimeServer(realtimeServer);

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
  const deviceClient = new WebSocket(
    `ws://127.0.0.1:${port}/realtime?token=${token}&deviceId=device-1`,
  );
  await waitForOpen(deviceClient);
  await new Promise((resolve) => setTimeout(resolve, 50));

  const messagePromise = waitForMessage(deviceClient);

  const response = await fetch(`http://127.0.0.1:${port}/devices/device-1/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type: "SET_PROFILE", profileId: "profile-abc" }),
  });

  expect(response.status).toBe(202);

  const payload = await messagePromise;
  const parsed = JSON.parse(payload) as {
    scope: string;
    type: string;
    deviceId: string;
    command: { type: string; profileId?: string };
  };
  expect(parsed.command.type).toBe("SET_PROFILE");
  expect(parsed.command.profileId).toBe("profile-abc");

  deviceClient.close();
  await realtimeServer.close();
  await new Promise<void>((resolve) => { httpServer.close(() => resolve()); });
});

test("POST /devices/:id/command returns 400 when target device has no active WebSocket (offline)", async (t) => {
  const app = express();
  app.use(express.json());
  app.use("/devices", requireAuth, devicesRouter);
  app.use(globalErrorMiddleware);

  const httpServer = createServer(app);
  const realtimeServer = createRealtimeServer(httpServer);
  configureRealtimeServer(realtimeServer);

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

  // No WebSocket connected for device-2 — it is offline.
  const token = createAuthToken("user-1");
  const response = await fetch(`http://127.0.0.1:${port}/devices/device-2/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type: "REFRESH" }),
  });

  expect(response.status).toBe(400);
  const body = await response.json() as { error: { code: string; message: string } };
  expect(body.error.code).toBe("BAD_REQUEST");
  expect(body.error.message).toBe("Target device is offline");

  await realtimeServer.close();
  await new Promise<void>((resolve) => { httpServer.close(() => resolve()); });
});

test("POST /devices/:id/command returns 400 when device disconnects before command is issued", async (t) => {
  const app = express();
  app.use(express.json());
  app.use("/devices", requireAuth, devicesRouter);
  app.use(globalErrorMiddleware);

  const httpServer = createServer(app);
  const realtimeServer = createRealtimeServer(httpServer);
  configureRealtimeServer(realtimeServer);

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
  const deviceClient = new WebSocket(
    `ws://127.0.0.1:${port}/realtime?token=${token}&deviceId=device-1`,
  );
  await waitForOpen(deviceClient);
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Disconnect before issuing the command.
  deviceClient.close();
  await new Promise((resolve) => setTimeout(resolve, 50));

  const response = await fetch(`http://127.0.0.1:${port}/devices/device-1/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type: "REFRESH" }),
  });

  expect(response.status).toBe(400);
  const body = await response.json() as { error: { code: string } };
  expect(body.error.code).toBe("BAD_REQUEST");

  await realtimeServer.close();
  await new Promise<void>((resolve) => { httpServer.close(() => resolve()); });
});
