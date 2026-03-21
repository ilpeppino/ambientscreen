import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { usersRepository } from "../src/modules/users/users.repository";
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

type RouteMethod = "get" | "patch";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
}

const originalUsersFindAll = usersRepository.findAll;
const originalWidgetsFindAll = widgetsRepository.findAll;
const originalWidgetsFindById = widgetsRepository.findById;
const originalWidgetsUpdateConfig = widgetsRepository.updateConfig;

const mutableUsersRepository = usersRepository as unknown as {
  findAll: () => Promise<TestUser[]>;
};

const mutableWidgetsRepository = widgetsRepository as unknown as {
  findAll: (userId: string) => Promise<TestWidget[]>;
  findById: (id: string) => Promise<TestWidget | null>;
  updateConfig: (input: {
    id: string;
    userId: string;
    config: Record<string, unknown>;
  }) => Promise<TestWidget | null>;
};

let usersStore: TestUser[] = [];
let widgetsStore: TestWidget[] = [];

beforeEach(() => {
  usersStore = [
    {
      id: "user-1",
      email: "owner@ambient.dev",
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
    },
  ];

  widgetsStore = [
    {
      id: "widget-1",
      userId: "user-1",
      type: "clockDate",
      config: {
        format: "24h",
        showSeconds: false,
        timezone: "local",
      },
      layout: { x: 0, y: 0, w: 2, h: 2 },
      isActive: true,
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      updatedAt: new Date("2026-03-21T10:00:00.000Z"),
    },
  ];

  mutableUsersRepository.findAll = async () => usersStore;
  mutableWidgetsRepository.findAll = async (userId: string) =>
    widgetsStore.filter((widget) => widget.userId === userId);
  mutableWidgetsRepository.findById = async (id: string) =>
    widgetsStore.find((widget) => widget.id === id) ?? null;
  mutableWidgetsRepository.updateConfig = async ({ id, userId, config }) => {
    let updatedWidget: TestWidget | null = null;
    widgetsStore = widgetsStore.map((widget) => {
      if (widget.id !== id || widget.userId !== userId) {
        return widget;
      }

      updatedWidget = {
        ...widget,
        config,
        updatedAt: new Date("2026-03-21T11:00:00.000Z"),
      };

      return updatedWidget;
    });

    return updatedWidget;
  };
});

after(() => {
  mutableUsersRepository.findAll = originalUsersFindAll as typeof mutableUsersRepository.findAll;
  mutableWidgetsRepository.findAll =
    originalWidgetsFindAll as typeof mutableWidgetsRepository.findAll;
  mutableWidgetsRepository.findById =
    originalWidgetsFindById as typeof mutableWidgetsRepository.findById;
  mutableWidgetsRepository.updateConfig =
    originalWidgetsUpdateConfig as typeof mutableWidgetsRepository.updateConfig;
});

function getRouteHandler(router: Router, method: RouteMethod, path: string) {
  const routeLayer = (router as unknown as { stack?: Array<unknown> }).stack?.find((layer) => {
    const route = (layer as { route?: { path?: string; methods?: Record<string, boolean> } })
      .route;
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
  };

  await handler(req, res, (error: unknown) => {
    if (error) {
      globalErrorMiddleware(error, req as never, res as never, (() => undefined) as never);
    }
  });

  return response;
}

test("PATCH /widgets/:id/config updates widget config and GET /widgets returns latest", async () => {
  const patchResponse = await invokeRoute(widgetsRouter, "patch", "/:id/config", {
    params: { id: "widget-1" },
    body: {
      config: {
        format: "12h",
        showSeconds: true,
        timezone: "UTC",
      },
    },
  });

  assert.equal(patchResponse.statusCode, 200);

  const listResponse = await invokeRoute(widgetsRouter, "get", "/");
  assert.equal(listResponse.statusCode, 200);

  const widgets = listResponse.body as TestWidget[];
  assert.equal(widgets.length, 1);
  assert.deepEqual(widgets[0].config, {
    format: "12h",
    showSeconds: true,
    timezone: "UTC",
  });
});

test("PATCH /widgets/:id/config rejects invalid config payload", async () => {
  const patchResponse = await invokeRoute(widgetsRouter, "patch", "/:id/config", {
    params: { id: "widget-1" },
    body: {
      config: {
        format: "30h",
      },
    },
  });

  assert.equal(patchResponse.statusCode, 400);
});
