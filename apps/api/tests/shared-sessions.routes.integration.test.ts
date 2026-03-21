import { test, expect, beforeEach, afterEach, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { profilesService } from "../src/modules/profiles/profiles.service";
import { sharedSessionsRouter } from "../src/modules/sharedSessions/sharedSessions.routes";
import { sharedSessionsService } from "../src/modules/sharedSessions/sharedSessions.service";

interface TestParticipant {
  id: string;
  sessionId: string;
  deviceId: string;
  displayName: string | null;
  lastSeenAt: Date;
  createdAt: Date;
}

interface TestSession {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  activeProfileId: string | null;
  slideshowEnabled: boolean;
  slideshowIntervalSec: number;
  rotationProfileIds: string[];
  currentIndex: number;
  lastAdvancedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  participants: TestParticipant[];
}

type RouteMethod = "get" | "post" | "patch";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
}

let sessionCounter = 0;
let participantCounter = 0;
let sessionsStore: TestSession[] = [];

beforeEach(() => {
  sessionCounter = 0;
  participantCounter = 0;
  sessionsStore = [
    {
      id: "session-1",
      userId: "user-1",
      name: "Lobby",
      isActive: true,
      activeProfileId: "profile-1",
      slideshowEnabled: true,
      slideshowIntervalSec: 30,
      rotationProfileIds: ["profile-1", "profile-2"],
      currentIndex: 0,
      lastAdvancedAt: null,
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      updatedAt: new Date("2026-03-21T10:00:00.000Z"),
      participants: [],
    },
  ];

  vi.spyOn(profilesService, "getPrimaryUserId").mockImplementation(async () => "user-1");
  vi.spyOn(sharedSessionsService, "getSessionsForUser").mockImplementation(async (userId: string) =>
    sessionsStore.filter((session) => session.userId === userId),
  );
  vi.spyOn(sharedSessionsService, "getSessionByIdForUser").mockImplementation(async ({ id, userId }) =>
    sessionsStore.find((session) => session.id === id && session.userId === userId) ?? null,
  );
  vi.spyOn(sharedSessionsService, "createSession").mockImplementation(async (input) => {
    sessionCounter += 1;
    const now = new Date();
    const session: TestSession = {
      id: `session-${sessionCounter + 1}`,
      userId: input.userId,
      name: input.name,
      isActive: true,
      activeProfileId: input.activeProfileId ?? null,
      slideshowEnabled: input.slideshowEnabled ?? false,
      slideshowIntervalSec: input.slideshowIntervalSec ?? 60,
      rotationProfileIds: input.rotationProfileIds ?? [],
      currentIndex: input.currentIndex ?? 0,
      lastAdvancedAt: null,
      createdAt: now,
      updatedAt: now,
      participants: [],
    };

    sessionsStore.push(session);
    return session;
  });
  vi.spyOn(sharedSessionsService, "updateSession").mockImplementation(async (input) => {
    const target = sessionsStore.find((session) => session.id === input.id && session.userId === input.userId);
    if (!target) {
      return null;
    }

    if (input.name !== undefined) {
      target.name = input.name;
    }
    if (input.isActive !== undefined) {
      target.isActive = input.isActive;
    }
    if (input.activeProfileId !== undefined) {
      target.activeProfileId = input.activeProfileId;
    }
    if (input.slideshowEnabled !== undefined) {
      target.slideshowEnabled = input.slideshowEnabled;
    }
    if (input.slideshowIntervalSec !== undefined) {
      target.slideshowIntervalSec = input.slideshowIntervalSec;
    }
    if (input.rotationProfileIds !== undefined) {
      target.rotationProfileIds = input.rotationProfileIds;
    }
    if (input.currentIndex !== undefined) {
      target.currentIndex = input.currentIndex;
    }

    target.updatedAt = new Date();
    return target;
  });
  vi.spyOn(sharedSessionsService, "joinSession").mockImplementation(async (input) => {
    const target = sessionsStore.find((session) => session.id === input.id && session.userId === input.userId);
    if (!target) {
      return null;
    }

    const existingParticipant = target.participants.find((participant) => participant.deviceId === input.deviceId);
    const now = new Date();
    if (existingParticipant) {
      existingParticipant.displayName = input.displayName ?? existingParticipant.displayName;
      existingParticipant.lastSeenAt = now;
    } else {
      participantCounter += 1;
      target.participants.push({
        id: `participant-${participantCounter}`,
        sessionId: target.id,
        deviceId: input.deviceId,
        displayName: input.displayName ?? null,
        lastSeenAt: now,
        createdAt: now,
      });
    }

    target.updatedAt = now;
    return target;
  });
  vi.spyOn(sharedSessionsService, "leaveSession").mockImplementation(async (input) => {
    const target = sessionsStore.find((session) => session.id === input.id && session.userId === input.userId);
    if (!target) {
      return null;
    }

    target.participants = target.participants.filter((participant) => participant.deviceId !== input.deviceId);
    target.updatedAt = new Date();
    return target;
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

test("shared session routes support create/list/join/leave/update", async () => {
  const createResponse = await invokeRoute(sharedSessionsRouter, "post", "/", {
    body: {
      name: "Conference wall",
      activeProfileId: "profile-1",
      slideshowEnabled: true,
      slideshowIntervalSec: 45,
      rotationProfileIds: ["profile-1", "profile-2"],
      currentIndex: 0,
    },
  });
  expect(createResponse.statusCode).toBe(201);

  const createdSession = createResponse.body as TestSession;
  expect(createdSession.name).toBe("Conference wall");

  const listResponse = await invokeRoute(sharedSessionsRouter, "get", "/");
  expect(listResponse.statusCode).toBe(200);
  expect((listResponse.body as TestSession[]).length).toBe(2);

  const joinResponse = await invokeRoute(sharedSessionsRouter, "post", "/:id/join", {
    params: { id: createdSession.id },
    body: {
      deviceId: "device-tv-1",
      displayName: "Front Desk TV",
    },
  });
  expect(joinResponse.statusCode).toBe(200);
  expect((joinResponse.body as TestSession).participants.length).toBe(1);

  const updateResponse = await invokeRoute(sharedSessionsRouter, "patch", "/:id", {
    params: { id: createdSession.id },
    body: {
      activeProfileId: "profile-2",
      currentIndex: 1,
    },
  });
  expect(updateResponse.statusCode).toBe(200);
  expect((updateResponse.body as TestSession).activeProfileId).toBe("profile-2");
  expect((updateResponse.body as TestSession).currentIndex).toBe(1);

  const leaveResponse = await invokeRoute(sharedSessionsRouter, "post", "/:id/leave", {
    params: { id: createdSession.id },
    body: {
      deviceId: "device-tv-1",
    },
  });
  expect(leaveResponse.statusCode).toBe(200);
  expect((leaveResponse.body as TestSession).participants.length).toBe(0);
});

test("shared session routes validate payloads", async () => {
  const invalidCreateResponse = await invokeRoute(sharedSessionsRouter, "post", "/", {
    body: {
      name: "",
    },
  });
  expect(invalidCreateResponse.statusCode).toBe(400);

  const invalidJoinResponse = await invokeRoute(sharedSessionsRouter, "post", "/:id/join", {
    params: { id: "session-1" },
    body: {
      deviceId: "",
    },
  });
  expect(invalidJoinResponse.statusCode).toBe(400);

  const invalidPatchResponse = await invokeRoute(sharedSessionsRouter, "patch", "/:id", {
    params: { id: "session-1" },
    body: {},
  });
  expect(invalidPatchResponse.statusCode).toBe(400);
});
