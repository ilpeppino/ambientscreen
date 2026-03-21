import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
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
  createdAt: Date;
}

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
}

const originalProfilesGetPrimaryUserId = profilesService.getPrimaryUserId;
const originalOrchestrationGetRulesForUser = orchestrationService.getRulesForUser;
const originalOrchestrationCreateRule = orchestrationService.createRule;
const originalOrchestrationUpdateRule = orchestrationService.updateRule;
const originalOrchestrationDeleteRule = orchestrationService.deleteRule;

const mutableProfilesService = profilesService as unknown as {
  getPrimaryUserId: () => Promise<string>;
};

const mutableOrchestrationService = orchestrationService as unknown as {
  getRulesForUser: (userId: string) => Promise<TestRule[]>;
  createRule: (data: {
    userId: string;
    type: string;
    intervalSec: number;
    isActive?: boolean;
  }) => Promise<TestRule>;
  updateRule: (data: {
    id: string;
    userId: string;
    type?: string;
    intervalSec?: number;
    isActive?: boolean;
  }) => Promise<TestRule | null>;
  deleteRule: (data: { id: string; userId: string }) => Promise<boolean>;
};

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
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
    },
  ];

  mutableProfilesService.getPrimaryUserId = async () => "user-1";
  mutableOrchestrationService.getRulesForUser = async (userId: string) =>
    ruleStore.filter((rule) => rule.userId === userId);
  mutableOrchestrationService.createRule = async ({ userId, type, intervalSec, isActive }) => {
    ruleCounter += 1;
    const rule: TestRule = {
      id: `rule-${ruleCounter + 1}`,
      userId,
      type,
      intervalSec,
      isActive: isActive ?? true,
      createdAt: new Date(),
    };

    ruleStore.push(rule);
    return rule;
  };
  mutableOrchestrationService.updateRule = async ({ id, userId, type, intervalSec, isActive }) => {
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

    return current;
  };
  mutableOrchestrationService.deleteRule = async ({ id, userId }) => {
    const beforeCount = ruleStore.length;
    ruleStore = ruleStore.filter((rule) => !(rule.id === id && rule.userId === userId));
    return ruleStore.length !== beforeCount;
  };
});

after(() => {
  mutableProfilesService.getPrimaryUserId = originalProfilesGetPrimaryUserId;
  mutableOrchestrationService.getRulesForUser =
    originalOrchestrationGetRulesForUser as typeof mutableOrchestrationService.getRulesForUser;
  mutableOrchestrationService.createRule =
    originalOrchestrationCreateRule as typeof mutableOrchestrationService.createRule;
  mutableOrchestrationService.updateRule =
    originalOrchestrationUpdateRule as typeof mutableOrchestrationService.updateRule;
  mutableOrchestrationService.deleteRule =
    originalOrchestrationDeleteRule as typeof mutableOrchestrationService.deleteRule;
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

test("orchestration rule CRUD routes create, update, list, and delete", async () => {
  const createResponse = await invokeRoute(orchestrationRouter, "post", "/", {
    body: {
      type: "interval",
      intervalSec: 30,
      isActive: true,
    },
  });

  assert.equal(createResponse.statusCode, 201);

  const createdRule = createResponse.body as TestRule;
  assert.equal(createdRule.type, "interval");
  assert.equal(createdRule.intervalSec, 30);

  const updateResponse = await invokeRoute(orchestrationRouter, "patch", "/:id", {
    params: { id: createdRule.id },
    body: {
      intervalSec: 45,
      isActive: false,
    },
  });

  assert.equal(updateResponse.statusCode, 200);
  assert.equal((updateResponse.body as TestRule).intervalSec, 45);
  assert.equal((updateResponse.body as TestRule).isActive, false);

  const listResponse = await invokeRoute(orchestrationRouter, "get", "/");
  assert.equal(listResponse.statusCode, 200);
  assert.equal((listResponse.body as TestRule[]).length, 2);

  const deleteResponse = await invokeRoute(orchestrationRouter, "delete", "/:id", {
    params: { id: createdRule.id },
  });
  assert.equal(deleteResponse.statusCode, 204);
});

test("orchestration routes validate intervalSec", async () => {
  const createResponse = await invokeRoute(orchestrationRouter, "post", "/", {
    body: {
      type: "interval",
      intervalSec: 0,
    },
  });

  assert.equal(createResponse.statusCode, 400);

  const updateResponse = await invokeRoute(orchestrationRouter, "patch", "/:id", {
    params: { id: "rule-1" },
    body: {
      intervalSec: -10,
    },
  });

  assert.equal(updateResponse.statusCode, 400);
});

test("orchestration routes reject unsupported type", async () => {
  const response = await invokeRoute(orchestrationRouter, "post", "/", {
    body: {
      type: "unsupported",
      intervalSec: 10,
    },
  });

  assert.equal(response.statusCode, 400);
});
