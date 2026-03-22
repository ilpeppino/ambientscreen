import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { devicesRouter } from "../src/modules/devices/devices.routes";
import { devicesService } from "../src/modules/devices/devices.service";

interface TestDevice {
  id: string;
  userId: string;
  name: string;
  platform: "ios" | "android" | "web";
  deviceType: "phone" | "tablet" | "display" | "web";
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
}

let nowCounter = 0;
let deviceCounter = 0;
let deviceStore: TestDevice[] = [];

function nextNow(): Date {
  nowCounter += 1;
  return new Date(Date.parse("2026-03-21T12:00:00.000Z") + nowCounter * 1000);
}

beforeEach(() => {
  nowCounter = 0;
  deviceCounter = 2;
  deviceStore = [
    {
      id: "device-1",
      userId: "user-1",
      name: "Owner iPhone",
      platform: "ios",
      deviceType: "phone",
      lastSeenAt: new Date("2026-03-21T11:00:00.000Z"),
      createdAt: new Date("2026-03-21T11:00:00.000Z"),
      updatedAt: new Date("2026-03-21T11:00:00.000Z"),
    },
    {
      id: "device-2",
      userId: "user-2",
      name: "Other User Tablet",
      platform: "android",
      deviceType: "tablet",
      lastSeenAt: new Date("2026-03-21T10:00:00.000Z"),
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      updatedAt: new Date("2026-03-21T10:00:00.000Z"),
    },
  ];

  vi.spyOn(devicesService, "register").mockImplementation(async (input) => {
    deviceCounter += 1;
    const now = nextNow();
    const created: TestDevice = {
      id: `device-${deviceCounter}`,
      userId: input.userId,
      name: input.name,
      platform: input.platform as TestDevice["platform"],
      deviceType: input.deviceType as TestDevice["deviceType"],
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };

    deviceStore.push(created);
    return created as never;
  });

  vi.spyOn(devicesService, "getDevicesForUser").mockImplementation(async (userId) => {
    return deviceStore
      .filter((device) => device.userId === userId)
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime()) as never;
  });

  vi.spyOn(devicesService, "heartbeat").mockImplementation(async ({ id, userId }) => {
    const target = deviceStore.find((device) => device.id === id && device.userId === userId);
    if (!target) {
      return null as never;
    }

    const now = nextNow();
    target.lastSeenAt = now;
    target.updatedAt = now;
    return target as never;
  });

  vi.spyOn(devicesService, "renameDevice").mockImplementation(async ({ id, userId, name }) => {
    const target = deviceStore.find((device) => device.id === id && device.userId === userId);
    if (!target) {
      return null as never;
    }

    target.name = name;
    target.updatedAt = nextNow();
    return target as never;
  });

  vi.spyOn(devicesService, "getDeviceForUser").mockImplementation(async ({ id, userId }) => {
    return (deviceStore.find((device) => device.id === id && device.userId === userId) ?? null) as never;
  });

  vi.spyOn(devicesService, "sendRemoteCommand").mockImplementation(({ id, userId, command }) => {
    const ownedDevice = deviceStore.find((device) => device.id === id && device.userId === userId);
    if (!ownedDevice) {
      return false as never;
    }

    if (id === "device-1") {
      return true as never;
    }

    if (id === "device-3") {
      return false as never;
    }

    return (command.type === "SET_PROFILE") as never;
  });

  vi.spyOn(devicesService, "deleteDevice").mockImplementation(async ({ id, userId }) => {
    const existingCount = deviceStore.length;
    deviceStore = deviceStore.filter((device) => !(device.id === id && device.userId === userId));
    return (existingCount !== deviceStore.length) as never;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function getRouteHandler(router: Router, method: RouteMethod, path: string) {
  const routeLayer = (router as unknown as { stack?: Array<unknown> }).stack?.find((layer) => {
    const route = (layer as { route?: { path?: string; methods?: Record<string, boolean> } }).route;
    return route?.path === path && route.methods?.[method];
  }) as
    | {
      route: {
        stack: Array<{ handle: (...args: unknown[]) => Promise<void> | void }>;
      };
    }
    | undefined;

  if (!routeLayer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  return routeLayer.route.stack[0].handle;
}

async function invokeRoute(
  router: Router,
  method: RouteMethod,
  path: string,
  options: InvokeRouteOptions = {},
) {
  const handler = getRouteHandler(router, method, path);
  const req = {
    method: method.toUpperCase(),
    path,
    originalUrl: path,
    body: options.body ?? {},
    params: options.params ?? {},
    authUser: {
      id: "user-1",
      email: "owner@ambient.dev",
    },
  };

  const response = {
    statusCode: 200,
    body: null as unknown,
  };

  const res = {
    status(statusCode: number) {
      response.statusCode = statusCode;
      return res;
    },
    json(body: unknown) {
      response.body = body;
      return res;
    },
    send() {
      return res;
    },
  };

  await handler(req, res, (error: unknown) => {
    if (error) {
      globalErrorMiddleware(error, req as never, res as never, (() => undefined) as never);
    }
  });

  return response;
}

test("register device creates a user-linked device", async () => {
  const response = await invokeRoute(devicesRouter, "post", "/register", {
    body: {
      name: "Peppe iPhone",
      platform: "ios",
      deviceType: "phone",
    },
  });

  expect(response.statusCode).toBe(201);
  expect(response.body).toEqual(expect.objectContaining({
    userId: "user-1",
    name: "Peppe iPhone",
    platform: "ios",
    deviceType: "phone",
  }));
});

test("list devices returns only authenticated user devices ordered by lastSeenAt desc", async () => {
  deviceStore.push({
    id: "device-3",
    userId: "user-1",
    name: "Web Dashboard",
    platform: "web",
    deviceType: "web",
    lastSeenAt: new Date("2026-03-21T12:10:00.000Z"),
    createdAt: new Date("2026-03-21T12:10:00.000Z"),
    updatedAt: new Date("2026-03-21T12:10:00.000Z"),
  });

  const response = await invokeRoute(devicesRouter, "get", "/");
  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual([
    expect.objectContaining({ id: "device-3", userId: "user-1" }),
    expect.objectContaining({ id: "device-1", userId: "user-1" }),
  ]);
});

test("heartbeat updates lastSeenAt for owner and rejects cross-user device access", async () => {
  const ownHeartbeat = await invokeRoute(devicesRouter, "post", "/heartbeat", {
    body: { deviceId: "device-1" },
  });
  expect(ownHeartbeat.statusCode).toBe(200);
  expect(ownHeartbeat.body).toEqual(expect.objectContaining({
    success: true,
    deviceId: "device-1",
  }));

  const crossUserHeartbeat = await invokeRoute(devicesRouter, "post", "/heartbeat", {
    body: { deviceId: "device-2" },
  });
  expect(crossUserHeartbeat.statusCode).toBe(404);
});

test("update and delete only work for device owner", async () => {
  const renameOwn = await invokeRoute(devicesRouter, "patch", "/:id", {
    params: { id: "device-1" },
    body: { name: "Renamed Owner Device" },
  });
  expect(renameOwn.statusCode).toBe(200);
  expect(renameOwn.body).toEqual(expect.objectContaining({
    id: "device-1",
    name: "Renamed Owner Device",
  }));

  const renameCrossUser = await invokeRoute(devicesRouter, "patch", "/:id", {
    params: { id: "device-2" },
    body: { name: "Should fail" },
  });
  expect(renameCrossUser.statusCode).toBe(404);

  const deleteCrossUser = await invokeRoute(devicesRouter, "delete", "/:id", {
    params: { id: "device-2" },
  });
  expect(deleteCrossUser.statusCode).toBe(404);

  const deleteOwn = await invokeRoute(devicesRouter, "delete", "/:id", {
    params: { id: "device-1" },
  });
  expect(deleteOwn.statusCode).toBe(204);
});

test("integration flow: same user registers two devices and heartbeat refreshes ordering", async () => {
  const firstRegister = await invokeRoute(devicesRouter, "post", "/register", {
    body: {
      name: "Display One",
      platform: "android",
      deviceType: "display",
    },
  });
  expect(firstRegister.statusCode).toBe(201);
  const firstDeviceId = (firstRegister.body as TestDevice).id;

  const secondRegister = await invokeRoute(devicesRouter, "post", "/register", {
    body: {
      name: "Display Two",
      platform: "web",
      deviceType: "web",
    },
  });
  expect(secondRegister.statusCode).toBe(201);
  const secondDeviceId = (secondRegister.body as TestDevice).id;

  const beforeHeartbeat = await invokeRoute(devicesRouter, "get", "/");
  expect(beforeHeartbeat.statusCode).toBe(200);
  expect((beforeHeartbeat.body as TestDevice[]).map((item) => item.id)).toEqual([
    secondDeviceId,
    firstDeviceId,
    "device-1",
  ]);

  const heartbeat = await invokeRoute(devicesRouter, "post", "/heartbeat", {
    body: { deviceId: firstDeviceId },
  });
  expect(heartbeat.statusCode).toBe(200);

  const afterHeartbeat = await invokeRoute(devicesRouter, "get", "/");
  expect((afterHeartbeat.body as TestDevice[])[0].id).toBe(firstDeviceId);
});

test("POST /:id/command sends remote command for owned online device", async () => {
  const response = await invokeRoute(devicesRouter, "post", "/:id/command", {
    params: { id: "device-1" },
    body: {
      type: "SET_PROFILE",
      profileId: "profile-123",
    },
  });

  expect(response.statusCode).toBe(202);
  expect(response.body).toEqual({
    success: true,
    deviceId: "device-1",
    commandType: "SET_PROFILE",
  });
});

test("POST /:id/command rejects non-owned devices and offline targets", async () => {
  const nonOwned = await invokeRoute(devicesRouter, "post", "/:id/command", {
    params: { id: "device-2" },
    body: { type: "REFRESH" },
  });
  expect(nonOwned.statusCode).toBe(404);

  deviceStore.push({
    id: "device-3",
    userId: "user-1",
    name: "Offline Display",
    platform: "web",
    deviceType: "display",
    lastSeenAt: new Date("2026-03-21T12:15:00.000Z"),
    createdAt: new Date("2026-03-21T12:15:00.000Z"),
    updatedAt: new Date("2026-03-21T12:15:00.000Z"),
  });

  const offline = await invokeRoute(devicesRouter, "post", "/:id/command", {
    params: { id: "device-3" },
    body: { type: "REFRESH" },
  });
  expect(offline.statusCode).toBe(400);
});

test("POST /:id/command validates command payload", async () => {
  const response = await invokeRoute(devicesRouter, "post", "/:id/command", {
    params: { id: "device-1" },
    body: {
      type: "SET_PROFILE",
    },
  });

  expect(response.statusCode).toBe(400);
});
