import { test, expect, afterEach, beforeEach, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { usersRepository } from "../src/modules/users/users.repository";
import { usersRouter } from "../src/modules/users/users.routes";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import { widgetsRouter } from "../src/modules/widgets/widgets.routes";

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

type RouteMethod = "get" | "post" | "patch";

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

test("M1-3: activating a widget makes it the only active widget", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const firstWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "clockDate" }
  });
  const firstWidget = firstWidgetResponse.body as { id: string };

  const secondWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "weather" }
  });
  const secondWidget = secondWidgetResponse.body as { id: string };

  const activateResponse = await invokeRoute(widgetsRouter, "patch", "/:id/active", {
    params: { id: secondWidget.id }
  });
  expect(activateResponse.statusCode).toBe(200);
  expect((activateResponse.body as { id: string; isActive: boolean }).id).toBe(secondWidget.id);
  expect((activateResponse.body as { isActive: boolean }).isActive).toBe(true);

  const listResponse = await invokeRoute(widgetsRouter, "get", "/");
  expect(listResponse.statusCode).toBe(200);
  const widgets = listResponse.body as Array<{ id: string; isActive: boolean }>;
  expect(widgets.length).toBe(2);
  expect(widgets.find((widget) => widget.id === firstWidget.id)?.isActive).toBe(false);
  expect(widgets.find((widget) => widget.id === secondWidget.id)?.isActive).toBe(true);
  expect(widgets.filter((widget) => widget.isActive).length).toBe(1);
});

test("M1-3: first created widget is active and next widgets are inactive by default", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "clockDate" }
  });
  await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "calendar" }
  });

  const listResponse = await invokeRoute(widgetsRouter, "get", "/");
  expect(listResponse.statusCode).toBe(200);
  const widgets = listResponse.body as Array<{ id: string; isActive: boolean }>;
  expect(widgets.length).toBe(2);
  expect(widgets[0].isActive).toBe(true);
  expect(widgets[1].isActive).toBe(false);
});

test("M1-3: activating unknown widget returns not found", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const activateResponse = await invokeRoute(widgetsRouter, "patch", "/:id/active", {
    params: { id: "missing-widget-id" }
  });
  expect(activateResponse.statusCode).toBe(404);
});
