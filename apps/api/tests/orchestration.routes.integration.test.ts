import { test, expect, beforeEach, afterEach, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { orchestrationRouter } from "../src/modules/orchestration/orchestration.routes";
import { orchestrationService } from "../src/modules/orchestration/orchestration.service";
import { profilesService } from "../src/modules/profiles/profiles.service";

interface TestRule {
  id: string;
  userId: string;
  type: string;
  intervalSec: number;
  isActive: boolean;
  rotationProfileIds: string[];
  currentIndex: number;
  createdAt: Date;
}

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
}

let ruleCounter = 0;
let ruleStore: TestRule[] = [];

beforeEach(() => {
  ruleCounter = 0;
  ruleStore = [
    {
      id: "rule-1",
      userId: "user-1",
      type: "interval",
      intervalSec: 60,
      isActive: true,
      rotationProfileIds: [],
      currentIndex: 0,
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
    },
  ];

  vi.spyOn(profilesService, "getProfilesForUser").mockImplementation(async (userId: string) => ([
    { id: "profile-1", userId },
    { id: "profile-2", userId },
    { id: "profile-3", userId },
  ]));
  vi.spyOn(orchestrationService, "getRulesForUser").mockImplementation(async (userId: string) =>
    ruleStore.filter((rule) => rule.userId === userId));
  vi.spyOn(orchestrationService, "getRuleByIdForUser").mockImplementation(async ({ id, userId }) => (
    ruleStore.find((rule) => rule.id === id && rule.userId === userId) ?? null
  ));
  vi.spyOn(orchestrationService, "createRule").mockImplementation(async (
    {
      userId,
      type,
      intervalSec,
      isActive,
      rotationProfileIds,
      currentIndex,
    },
  ) => {
    ruleCounter += 1;
    const rule: TestRule = {
      id: `rule-${ruleCounter + 1}`,
      userId,
      type,
      intervalSec,
      isActive: isActive ?? true,
      rotationProfileIds: rotationProfileIds ?? [],
      currentIndex: currentIndex ?? 0,
      createdAt: new Date(),
    };

    ruleStore.push(rule);
    return rule;
  });
  vi.spyOn(orchestrationService, "updateRule").mockImplementation(async (
    {
      id,
      userId,
      type,
      intervalSec,
      isActive,
      rotationProfileIds,
      currentIndex,
    },
  ) => {
    const current = ruleStore.find((rule) => rule.id === id && rule.userId === userId);
    if (!current) {
      return null;
    }

    if (type !== undefined) {
      current.type = type;
    }
    if (intervalSec !== undefined) {
      current.intervalSec = intervalSec;
    }
    if (isActive !== undefined) {
      current.isActive = isActive;
    }
    if (rotationProfileIds !== undefined) {
      current.rotationProfileIds = rotationProfileIds;
    }
    if (currentIndex !== undefined) {
      current.currentIndex = currentIndex;
    }

    return current;
  });
  vi.spyOn(orchestrationService, "deleteRule").mockImplementation(async ({ id, userId }) => {
    const beforeCount = ruleStore.length;
    ruleStore = ruleStore.filter((rule) => !(rule.id === id && rule.userId === userId));
    return ruleStore.length !== beforeCount;
  });
});

afterEach(() => { vi.restoreAllMocks(); });

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

test("orchestration rule CRUD routes create, update, list, and delete", async () => {
  const createResponse = await invokeRoute(orchestrationRouter, "post", "/", {
    body: {
      type: "interval",
      intervalSec: 30,
      isActive: true,
    },
  });

  expect(createResponse.statusCode).toBe(201);

  const createdRule = createResponse.body as TestRule;
  expect(createdRule.type).toBe("interval");
  expect(createdRule.intervalSec).toBe(30);

  const updateResponse = await invokeRoute(orchestrationRouter, "patch", "/:id", {
    params: { id: createdRule.id },
    body: {
      intervalSec: 45,
      isActive: false,
    },
  });

  expect(updateResponse.statusCode).toBe(200);
  expect((updateResponse.body as TestRule).intervalSec).toBe(45);
  expect((updateResponse.body as TestRule).isActive).toBe(false);

  const listResponse = await invokeRoute(orchestrationRouter, "get", "/");
  expect(listResponse.statusCode).toBe(200);
  expect((listResponse.body as TestRule[]).length).toBe(2);

  const deleteResponse = await invokeRoute(orchestrationRouter, "delete", "/:id", {
    params: { id: createdRule.id },
  });
  expect(deleteResponse.statusCode).toBe(204);
});

test("orchestration routes validate intervalSec", async () => {
  const createResponse = await invokeRoute(orchestrationRouter, "post", "/", {
    body: {
      type: "interval",
      intervalSec: 0,
    },
  });

  expect(createResponse.statusCode).toBe(400);

  const updateResponse = await invokeRoute(orchestrationRouter, "patch", "/:id", {
    params: { id: "rule-1" },
    body: {
      intervalSec: -10,
    },
  });

  expect(updateResponse.statusCode).toBe(400);
});

test("orchestration routes reject unsupported type", async () => {
  const response = await invokeRoute(orchestrationRouter, "post", "/", {
    body: {
      type: "unsupported",
      intervalSec: 10,
    },
  });

  expect(response.statusCode).toBe(400);
});

test("orchestration routes validate rotation payload and store profile IDs", async () => {
  const createResponse = await invokeRoute(orchestrationRouter, "post", "/", {
    body: {
      type: "rotation",
      intervalSec: 15,
      rotationProfileIds: ["profile-1", "profile-2"],
      isActive: true,
    },
  });

  expect(createResponse.statusCode).toBe(201);
  const createdRule = createResponse.body as TestRule;
  expect(createdRule.type).toBe("rotation");
  expect(createdRule.rotationProfileIds).toEqual(["profile-1", "profile-2"]);

  const invalidCreateResponse = await invokeRoute(orchestrationRouter, "post", "/", {
    body: {
      type: "rotation",
      intervalSec: 15,
      rotationProfileIds: ["profile-1"],
      isActive: true,
    },
  });

  expect(invalidCreateResponse.statusCode).toBe(400);
});

test("orchestration routes reject non-existent rotation profiles", async () => {
  const response = await invokeRoute(orchestrationRouter, "post", "/", {
    body: {
      type: "rotation",
      intervalSec: 20,
      rotationProfileIds: ["profile-1", "missing-profile"],
      isActive: true,
    },
  });

  expect(response.statusCode).toBe(400);
});
