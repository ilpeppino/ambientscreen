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
    layout: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
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
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
      layout: input.layout,
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

test("M1-2: widget can be created from UI types and appears in refreshed list", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
  });

  const createClockWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "clockDate" }
  });
  assert.equal(createClockWidgetResponse.statusCode, 201);

  const createCalendarWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "calendar" }
  });
  assert.equal(createCalendarWidgetResponse.statusCode, 201);

  const listResponse = await invokeRoute(widgetsRouter, "get", "/");
  assert.equal(listResponse.statusCode, 200);

  const widgets = listResponse.body as Array<{
    type: string;
    layout: { x: number; y: number; w: number; h: number };
  }>;
  assert.equal(widgets.length, 2);
  assert.equal(widgets[0].type, "clockDate");
  assert.deepEqual(widgets[0].layout, { x: 0, y: 0, w: 1, h: 1 });
  assert.equal(widgets[1].type, "calendar");
  assert.deepEqual(widgets[1].layout, { x: 1, y: 0, w: 1, h: 1 });
});

test("M1-2: unsupported widget type is rejected", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
  });

  const createResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "stocksTicker" }
  });
  assert.equal(createResponse.statusCode, 400);
});

test("M3-3: weather widget can be created with location and units config", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
  });

  const createResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "weather",
      config: {
        location: "Rotterdam",
        units: "imperial"
      }
    }
  });
  assert.equal(createResponse.statusCode, 201);

  const createdWidget = createResponse.body as {
    type: string;
    config: {
      location?: string;
      units?: string;
    };
  };
  assert.equal(createdWidget.type, "weather");
  assert.equal(createdWidget.config.location, "Rotterdam");
  assert.equal(createdWidget.config.units, "imperial");
});

test("M2-1: widget can be created with explicit layout and is returned with layout", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
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

  assert.equal(createResponse.statusCode, 201);
  const createdWidget = createResponse.body as {
    layout: { x: number; y: number; w: number; h: number };
  };
  assert.deepEqual(createdWidget.layout, { x: 2, y: 1, w: 3, h: 2 });
});

test("M2-4: explicit overlapping layout is rejected", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
  });

  const firstCreate = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "clockDate",
      layout: { x: 0, y: 0, w: 4, h: 2 }
    }
  });
  assert.equal(firstCreate.statusCode, 201);

  const overlappingCreate = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "weather",
      layout: { x: 2, y: 0, w: 4, h: 2 }
    }
  });
  assert.equal(overlappingCreate.statusCode, 400);
});

test("M3-3: weather widget creation rejects invalid units config", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
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
  assert.equal(createResponse.statusCode, 400);
});

test("M4-3: calendar widget can be created with provider, account, and time window config", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
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
  assert.equal(createResponse.statusCode, 201);

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
  assert.equal(createdWidget.type, "calendar");
  assert.equal(createdWidget.config.provider, "ical");
  assert.equal(createdWidget.config.account, "https://calendar.example.com/work.ics");
  assert.equal(createdWidget.config.timeWindow, "next24h");
  assert.equal(createdWidget.config.maxEvents, 8);
  assert.equal(createdWidget.config.includeAllDay, false);
});

test("M4-3: calendar widget creation rejects invalid provider/time window config", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
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
  assert.equal(createResponse.statusCode, 400);
});

test("M2-1: widget config must match widget contract schema", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
  });

  const invalidClockConfigResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "clockDate",
      config: {
        hour12: "sometimes"
      }
    }
  });
  assert.equal(invalidClockConfigResponse.statusCode, 400);

  const invalidCalendarConfigResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "calendar",
      config: {
        maxEvents: 99
      }
    }
  });
  assert.equal(invalidCalendarConfigResponse.statusCode, 400);
});

test("M1-2: creating widget fails when no user exists", async () => {
  const createResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: { type: "weather" }
  });
  assert.equal(createResponse.statusCode, 400);
});
