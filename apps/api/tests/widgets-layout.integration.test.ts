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
const originalWidgetsUpdateLayouts = widgetsRepository.updateLayouts;

const mutableUsersRepository = usersRepository as unknown as {
  findAll: () => Promise<TestUser[]>;
};

const mutableWidgetsRepository = widgetsRepository as unknown as {
  findAll: (userId: string) => Promise<TestWidget[]>;
  updateLayouts: (
    userId: string,
    widgets: Array<{ id: string; layout: { x: number; y: number; w: number; h: number } }>,
  ) => Promise<TestWidget[]>;
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
      config: {},
      layout: { x: 0, y: 0, w: 2, h: 2 },
      isActive: true,
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      updatedAt: new Date("2026-03-21T10:00:00.000Z"),
    },
    {
      id: "widget-2",
      userId: "user-1",
      type: "weather",
      config: {},
      layout: { x: 2, y: 0, w: 2, h: 2 },
      isActive: false,
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      updatedAt: new Date("2026-03-21T10:00:00.000Z"),
    },
  ];

  mutableUsersRepository.findAll = async () => usersStore;
  mutableWidgetsRepository.findAll = async (userId: string) =>
    widgetsStore.filter((widget) => widget.userId === userId);
  mutableWidgetsRepository.updateLayouts = async (userId, widgets) => {
    widgetsStore = widgetsStore.map((widget) => {
      if (widget.userId !== userId) {
        return widget;
      }

      const updated = widgets.find((item) => item.id === widget.id);
      if (!updated) {
        return widget;
      }

      return {
        ...widget,
        layout: updated.layout,
        updatedAt: new Date("2026-03-21T11:00:00.000Z"),
      };
    });

    return widgetsStore.filter((widget) => widgets.some((item) => item.id === widget.id));
  };
});

after(() => {
  mutableUsersRepository.findAll = originalUsersFindAll as typeof mutableUsersRepository.findAll;
  mutableWidgetsRepository.findAll =
    originalWidgetsFindAll as typeof mutableWidgetsRepository.findAll;
  mutableWidgetsRepository.updateLayouts =
    originalWidgetsUpdateLayouts as typeof mutableWidgetsRepository.updateLayouts;
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

test("PATCH /widgets/layout persists layout changes and GET /widgets returns updated layout", async () => {
  const patchResponse = await invokeRoute(widgetsRouter, "patch", "/layout", {
    body: {
      widgets: [
        {
          id: "widget-1",
          layout: { x: 4, y: 1, w: 3, h: 2 },
        },
        {
          id: "widget-2",
          layout: { x: 7, y: 1, w: 5, h: 2 },
        },
      ],
    },
  });

  assert.equal(patchResponse.statusCode, 200);

  const reloadResponse = await invokeRoute(widgetsRouter, "get", "/");
  assert.equal(reloadResponse.statusCode, 200);

  const widgets = reloadResponse.body as TestWidget[];
  const widgetOne = widgets.find((widget) => widget.id === "widget-1");
  const widgetTwo = widgets.find((widget) => widget.id === "widget-2");

  assert.ok(widgetOne);
  assert.ok(widgetTwo);
  assert.deepEqual(widgetOne.layout, { x: 4, y: 1, w: 3, h: 2 });
  assert.deepEqual(widgetTwo.layout, { x: 7, y: 1, w: 5, h: 2 });
});

test("PATCH /widgets/layout rejects invalid payload", async () => {
  const patchResponse = await invokeRoute(widgetsRouter, "patch", "/layout", {
    body: {
      widgets: [
        {
          id: "widget-1",
          layout: { x: 11, y: 0, w: 2, h: 1 },
        },
      ],
    },
  });

  assert.equal(patchResponse.statusCode, 400);
});
