import { test, expect, afterEach, beforeEach, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { usersRepository } from "../src/modules/users/users.repository";
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

type RouteMethod = "get" | "patch";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
}

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
      profileId: "user-1",
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

  vi.spyOn(profilesService, "resolveProfileForUser").mockImplementation(async ({ userId }) => ({
    id: userId,
    userId,
    name: "Default",
    isDefault: true,
    createdAt: new Date(),
  }) as never);
  vi.spyOn(usersRepository, "findAll").mockImplementation(async () => usersStore as never);
  vi.spyOn(widgetsRepository, "findAll").mockImplementation(async (profileId: string) =>
    widgetsStore.filter((widget) => widget.profileId === profileId) as never,
  );
  vi.spyOn(widgetsRepository, "findById").mockImplementation(async (id: string) =>
    (widgetsStore.find((widget) => widget.id === id) ?? null) as never,
  );
  vi.spyOn(widgetsRepository, "findByIdForUser").mockImplementation(async (id: string) =>
    (widgetsStore.find((widget) => widget.id === id) ?? null) as never,
  );
  vi.spyOn(widgetsRepository, "updateConfig").mockImplementation(async ({ id, profileId, config }) => {
    let updatedWidget: TestWidget | null = null;
    widgetsStore = widgetsStore.map((widget) => {
      if (widget.id !== id || widget.profileId !== profileId) {
        return widget;
      }

      updatedWidget = {
        ...widget,
        config,
        updatedAt: new Date("2026-03-21T11:00:00.000Z"),
      };

      return updatedWidget;
    });

    return updatedWidget as never;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
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

  expect(patchResponse.statusCode).toBe(200);

  const listResponse = await invokeRoute(widgetsRouter, "get", "/");
  expect(listResponse.statusCode).toBe(200);

  const widgets = listResponse.body as TestWidget[];
  expect(widgets.length).toBe(1);
  expect(widgets[0].config).toEqual({
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

  expect(patchResponse.statusCode).toBe(400);
});
