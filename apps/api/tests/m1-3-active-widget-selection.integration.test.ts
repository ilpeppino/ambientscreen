import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
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
  userId: string;
  type: string;
  config: Record<string, unknown>;
  position: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type RouteMethod = "get" | "post" | "patch";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
}

const originalUsersRepository = {
  findAll: usersRepository.findAll,
  findByEmail: usersRepository.findByEmail,
  create: usersRepository.create
};

const originalWidgetsRepository = {
  findAll: widgetsRepository.findAll,
  findById: widgetsRepository.findById,
  create: widgetsRepository.create,
  activateWidget: widgetsRepository.activateWidget
};

const mutableUsersRepository = usersRepository as unknown as {
  findAll: () => Promise<TestUser[]>;
  findByEmail: (email: string) => Promise<TestUser | null>;
  create: (email: string) => Promise<TestUser>;
};

const mutableWidgetsRepository = widgetsRepository as unknown as {
  findAll: (userId: string) => Promise<TestWidget[]>;
  findById: (id: string) => Promise<TestWidget | null>;
  create: (input: {
    userId: string;
    type: string;
    config: unknown;
    position: number;
    isActive: boolean;
  }) => Promise<TestWidget>;
  activateWidget: (userId: string, widgetId: string) => Promise<TestWidget>;
};

let usersStore: TestUser[] = [];
let widgetsStore: TestWidget[] = [];
let userCounter = 0;
let widgetCounter = 0;

beforeEach(() => {
  usersStore = [];
  widgetsStore = [];
  userCounter = 0;
  widgetCounter = 0;

  mutableUsersRepository.findAll = async () => usersStore;
  mutableUsersRepository.findByEmail = async (email: string) => {
    return usersStore.find((user) => user.email === email) ?? null;
  };
  mutableUsersRepository.create = async (email: string) => {
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
    return newUser;
  };

  mutableWidgetsRepository.findAll = async (userId: string) => {
    return widgetsStore
      .filter((widget) => widget.userId === userId)
      .sort((a, b) => a.position - b.position);
  };
  mutableWidgetsRepository.findById = async (id: string) => {
    return widgetsStore.find((widget) => widget.id === id) ?? null;
  };
  mutableWidgetsRepository.create = async (input) => {
    widgetCounter += 1;
    const now = new Date();
    const newWidget: TestWidget = {
      id: `widget-${widgetCounter}`,
      userId: input.userId,
      type: input.type,
      config: input.config as Record<string, unknown>,
      position: input.position,
      isActive: input.isActive,
      createdAt: now,
      updatedAt: now
    };
    widgetsStore.push(newWidget);
    return newWidget;
  };
  mutableWidgetsRepository.activateWidget = async (userId: string, widgetId: string) => {
    const widget = widgetsStore.find((item) => item.id === widgetId && item.userId === userId);
    if (!widget) {
      throw new Error("Widget not found");
    }

    widgetsStore = widgetsStore.map((item) => {
      if (item.userId !== userId) {
        return item;
      }

      return {
        ...item,
        isActive: item.id === widgetId,
        updatedAt: new Date()
      };
    });

    return widgetsStore.find((item) => item.id === widgetId) as TestWidget;
  };
});

after(() => {
  mutableUsersRepository.findAll =
    originalUsersRepository.findAll as typeof mutableUsersRepository.findAll;
  mutableUsersRepository.findByEmail =
    originalUsersRepository.findByEmail as typeof mutableUsersRepository.findByEmail;
  mutableUsersRepository.create =
    originalUsersRepository.create as typeof mutableUsersRepository.create;

  mutableWidgetsRepository.findAll =
    originalWidgetsRepository.findAll as typeof mutableWidgetsRepository.findAll;
  mutableWidgetsRepository.findById =
    originalWidgetsRepository.findById as typeof mutableWidgetsRepository.findById;
  mutableWidgetsRepository.create =
    originalWidgetsRepository.create as typeof mutableWidgetsRepository.create;
  mutableWidgetsRepository.activateWidget =
    originalWidgetsRepository.activateWidget as typeof mutableWidgetsRepository.activateWidget;
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
    params: options.params ?? {}
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
    body: { email: "owner@ambient.dev" }
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
  assert.equal(activateResponse.statusCode, 200);
  assert.equal((activateResponse.body as { id: string; isActive: boolean }).id, secondWidget.id);
  assert.equal((activateResponse.body as { isActive: boolean }).isActive, true);

  const listResponse = await invokeRoute(widgetsRouter, "get", "/");
  assert.equal(listResponse.statusCode, 200);
  const widgets = listResponse.body as Array<{ id: string; isActive: boolean }>;
  assert.equal(widgets.length, 2);
  assert.equal(widgets.find((widget) => widget.id === firstWidget.id)?.isActive, false);
  assert.equal(widgets.find((widget) => widget.id === secondWidget.id)?.isActive, true);
  assert.equal(widgets.filter((widget) => widget.isActive).length, 1);
});

test("M1-3: first created widget is active and next widgets are inactive by default", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
  });

  await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "clockDate" }
  });
  await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "calendar" }
  });

  const listResponse = await invokeRoute(widgetsRouter, "get", "/");
  assert.equal(listResponse.statusCode, 200);
  const widgets = listResponse.body as Array<{ id: string; isActive: boolean }>;
  assert.equal(widgets.length, 2);
  assert.equal(widgets[0].isActive, true);
  assert.equal(widgets[1].isActive, false);
});

test("M1-3: activating unknown widget returns not found", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
  });

  const activateResponse = await invokeRoute(widgetsRouter, "patch", "/:id/active", {
    params: { id: "missing-widget-id" }
  });
  assert.equal(activateResponse.statusCode, 404);
});
