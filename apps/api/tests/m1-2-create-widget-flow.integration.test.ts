import { test, expect, afterEach, beforeEach, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { usersRepository } from "../src/modules/users/users.repository";
import { usersRouter } from "../src/modules/users/users.routes";
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
      createdAt: now,
      updatedAt: now
    };
    widgetsStore.push(newWidget);
    return newWidget as never;
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

test("M1-2: widget can be created from UI types and appears in refreshed list", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const createClockWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "clockDate" }
  });
  expect(createClockWidgetResponse.statusCode).toBe(201);

  const createCalendarWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "calendar" }
  });
  expect(createCalendarWidgetResponse.statusCode).toBe(201);

  const listResponse = await invokeRoute(widgetsRouter, "get", "/");
  expect(listResponse.statusCode).toBe(200);

  const widgets = listResponse.body as Array<{
    type: string;
    layout: { x: number; y: number; w: number; h: number };
  }>;
  expect(widgets.length).toBe(2);
  expect(widgets[0].type).toBe("clockDate");
  expect(widgets[0].layout).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  expect(widgets[1].type).toBe("calendar");
  expect(widgets[1].layout).toEqual({ x: 1, y: 0, w: 1, h: 1 });
});

test("M1-2: unsupported widget type is rejected", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const createResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "stocksTicker" }
  });
  expect(createResponse.statusCode).toBe(400);
});

test("M3-3: weather widget can be created with city and units config", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const createResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "weather",
      config: {
        city: "Rotterdam",
        units: "imperial"
      }
    }
  });
  expect(createResponse.statusCode).toBe(201);

  const createdWidget = createResponse.body as {
    type: string;
    config: {
      city?: string;
      units?: string;
    };
  };
  expect(createdWidget.type).toBe("weather");
  expect(createdWidget.config.city).toBe("Rotterdam");
  expect(createdWidget.config.units).toBe("imperial");
});

test("M2-1: widget can be created with explicit layout and is returned with layout", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const createResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "clockDate",
      layout: {
        x: 2,
        y: 1,
        w: 3,
        h: 2
      }
    }
  });

  expect(createResponse.statusCode).toBe(201);
  const createdWidget = createResponse.body as {
    layout: { x: number; y: number; w: number; h: number };
  };
  expect(createdWidget.layout).toEqual({ x: 2, y: 1, w: 3, h: 2 });
});

test("M2-4: explicit overlapping layout is rejected", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const firstCreate = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "clockDate",
      layout: { x: 0, y: 0, w: 4, h: 2 }
    }
  });
  expect(firstCreate.statusCode).toBe(201);

  const overlappingCreate = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "weather",
      layout: { x: 2, y: 0, w: 4, h: 2 }
    }
  });
  expect(overlappingCreate.statusCode).toBe(400);
});

test("M3-3: weather widget creation rejects invalid units config", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const createResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "weather",
      config: {
        location: "Rotterdam",
        units: "kelvin"
      }
    }
  });
  expect(createResponse.statusCode).toBe(400);
});

test("M4-3: calendar widget can be created with provider, account, and time window config", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const createResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "calendar",
      config: {
        provider: "ical",
        account: "https://calendar.example.com/work.ics",
        timeWindow: "next24h",
        maxEvents: 8,
        includeAllDay: false
      }
    }
  });
  expect(createResponse.statusCode).toBe(201);

  const createdWidget = createResponse.body as {
    type: string;
    config: {
      provider?: string;
      account?: string;
      timeWindow?: string;
      maxEvents?: number;
      includeAllDay?: boolean;
    };
  };
  expect(createdWidget.type).toBe("calendar");
  expect(createdWidget.config.provider).toBe("ical");
  expect(createdWidget.config.account).toBe("https://calendar.example.com/work.ics");
  expect(createdWidget.config.timeWindow).toBe("next24h");
  expect(createdWidget.config.maxEvents).toBe(8);
  expect(createdWidget.config.includeAllDay).toBe(false);
});

test("M4-3: calendar widget creation rejects invalid provider/time window config", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const createResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "calendar",
      config: {
        provider: "googleCalendar",
        account: "not-a-url",
        timeWindow: "next30d"
      }
    }
  });
  expect(createResponse.statusCode).toBe(400);
});

test("M2-1: widget config must match widget contract schema", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" }
  });

  const invalidClockConfigResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "clockDate",
      config: {
        hour12: "sometimes"
      }
    }
  });
  expect(invalidClockConfigResponse.statusCode).toBe(400);

  const invalidCalendarConfigResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "calendar",
      config: {
        maxEvents: 99
      }
    }
  });
  expect(invalidCalendarConfigResponse.statusCode).toBe(400);
});

test("M1-2: creating widget succeeds for authenticated requests", async () => {
  const createResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "weather" }
  });
  expect(createResponse.statusCode).toBe(201);
});
