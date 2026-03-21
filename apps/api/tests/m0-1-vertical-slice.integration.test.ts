import { test, expect, afterEach, beforeEach, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { usersRepository } from "../src/modules/users/users.repository";
import { usersRouter } from "../src/modules/users/users.routes";
import { widgetDataRouter } from "../src/modules/widgetData/widget-data.routes";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import { widgetsRouter } from "../src/modules/widgets/widgets.routes";
import { profilesService } from "../src/modules/profiles/profiles.service";

interface TestUser {
  id: string;
  email: string;
  createdAt: Date;
}

interface TestWidget {
  id: string;
  profileId: string;
  type: string;
  config: Record<string, unknown>;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type RouteMethod = "get" | "post";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
}

let usersStore: TestUser[] = [];
let widgetsStore: TestWidget[] = [];
let userCounter = 0;
let widgetCounter = 0;

beforeEach(() => {
  usersStore = [];
  widgetsStore = [];
  userCounter = 0;
  widgetCounter = 0;

  vi.spyOn(profilesService, "resolveProfileForUser").mockImplementation(async ({ userId }) => ({
    id: userId,
    userId,
    name: "Default",
    isDefault: true,
    createdAt: new Date(),
  }) as never);

  vi.spyOn(usersRepository, "findAll").mockImplementation(async () => usersStore as never);
  vi.spyOn(usersRepository, "findByEmail").mockImplementation(async (email: string, _passwordHash: string) => {
    return (usersStore.find((user) => user.email === email) ?? null) as never;
  });
  vi.spyOn(usersRepository, "create").mockImplementation(async (email: string, _passwordHash: string) => {
    const duplicateUser = usersStore.find((user) => user.email === email);
    if (duplicateUser) {
      throw { code: "P2002" };
    }

    userCounter += 1;
    const newUser: TestUser = {
      id: `user-${userCounter}`,
      email,
      createdAt: new Date()
    };
    usersStore.push(newUser);
    return newUser as never;
  });

  vi.spyOn(widgetsRepository, "findAll").mockImplementation(async (profileId: string) => {
    return widgetsStore
      .filter((widget) => widget.profileId === profileId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) as never;
  });
  vi.spyOn(widgetsRepository, "findById").mockImplementation(async (id: string) => {
    return (widgetsStore.find((widget) => widget.id === id) ?? null) as never;
  });
  vi.spyOn(widgetsRepository, "findByIdForUser").mockImplementation(async (id: string) => {
    return (widgetsStore.find((widget) => widget.id === id) ?? null) as never;
  });
  vi.spyOn(widgetsRepository, "create").mockImplementation(async (input) => {
    widgetCounter += 1;
    const now = new Date();
    const newWidget: TestWidget = {
      id: `widget-${widgetCounter}`,
      profileId: input.profileId,
      type: input.type,
      config: input.config as Record<string, unknown>,
      layout: input.layout,
      isActive: input.isActive,
      createdAt: now,
      updatedAt: now
    };
    widgetsStore.push(newWidget);
    return newWidget as never;
  });
  vi.spyOn(widgetsRepository, "activateWidget").mockImplementation(async (profileId: string, widgetId: string) => {
    const widget = widgetsStore.find((item) => item.id === widgetId && item.profileId === profileId);
    if (!widget) {
      throw new Error("Widget not found");
    }

    widgetsStore = widgetsStore.map((item) => {
      if (item.profileId !== profileId) {
        return item;
      }

      return {
        ...item,
        isActive: item.id === widgetId,
        updatedAt: new Date()
      };
    });

    return widgetsStore.find((item) => item.id === widgetId) as never;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function getRouteHandler(router: Router, method: RouteMethod, path: string) {
  const routeLayer = (router as unknown as { stack?: Array<unknown> }).stack?.find(
    (layer) => {
      const route = (layer as { route?: { path?: string; methods?: Record<string, boolean> } })
        .route;
      return route?.path === path && route.methods?.[method];
    }
  ) as
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
  options: InvokeRouteOptions = {}
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
    body: null as unknown
  };

  const res = {
    status(statusCode: number) {
      response.statusCode = statusCode;
      return res;
    },
    json(body: unknown) {
      response.body = body;
      return res;
    }
  };

  await handler(req, res, (error: unknown) => {
    if (error) {
      globalErrorMiddleware(error, req as never, res as never, (() => undefined) as never);
    }
  });

  return response;
}

test("M0-1: users endpoints handle create/list and duplicate safely", async () => {
  const createResponse = await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });
  expect(createResponse.statusCode).toBe(201);
  expect((createResponse.body as { email: string }).email).toBe("owner@ambient.dev");

  const duplicateResponse = await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });
  expect(duplicateResponse.statusCode).toBe(409);

  const listResponse = await invokeRoute(usersRouter, "get", "/");
  expect(listResponse.statusCode).toBe(200);
  const users = listResponse.body as Array<{ id: string }>;
  expect(users.length).toBe(1);
  expect(users[0].id).toBe("user-1");
});

test("M0-1: widgets endpoints create/list and validate input payload", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const invalidWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "unsupported-widget"
    }
  });
  expect(invalidWidgetResponse.statusCode).toBe(400);

  const createFirstWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "clockDate",
      config: { timezone: "UTC" },
      position: 1
    }
  });
  expect(createFirstWidgetResponse.statusCode).toBe(201);

  const createSecondWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "clockDate",
      config: { timezone: "Europe/Amsterdam" },
      position: 0
    }
  });
  expect(createSecondWidgetResponse.statusCode).toBe(201);

  const listResponse = await invokeRoute(widgetsRouter, "get", "/");
  expect(listResponse.statusCode).toBe(200);
  const widgets = listResponse.body as Array<{
    layout: { x: number; y: number; w: number; h: number };
  }>;
  expect(widgets.length).toBe(2);
  expect(widgets[0].layout).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  expect(widgets[1].layout).toEqual({ x: 1, y: 0, w: 1, h: 1 });
});

test("M0-1: widget-data endpoint returns clock data and handles missing widgets", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const clockWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "clockDate",
      config: {},
      position: 0
    }
  });
  const clockWidgetId = (clockWidgetResponse.body as { id: string }).id;

  const clockDataResponse = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: clockWidgetId }
  });
  expect(clockDataResponse.statusCode).toBe(200);
  const clockData = clockDataResponse.body as {
    state: string;
    data: { formattedTime: string };
  };
  expect(clockData.state).toBe("ready");
  expect(typeof clockData.data.formattedTime).toBe("string");

  const missingWidgetResponse = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: "does-not-exist" }
  });
  expect(missingWidgetResponse.statusCode).toBe(404);
});
