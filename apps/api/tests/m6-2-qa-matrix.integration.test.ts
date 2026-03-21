import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { usersRepository } from "../src/modules/users/users.repository";
import { usersRouter } from "../src/modules/users/users.routes";
import { widgetDataRouter } from "../src/modules/widgetData/widget-data.routes";
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

const originalUsersRepository = {
  findAll: usersRepository.findAll,
  findByEmail: usersRepository.findByEmail,
  create: usersRepository.create,
};

const originalWidgetsRepository = {
  findAll: widgetsRepository.findAll,
  findById: widgetsRepository.findById,
  create: widgetsRepository.create,
  activateWidget: widgetsRepository.activateWidget,
};

const originalFetch = globalThis.fetch;

const mutableUsersRepository = usersRepository as unknown as {
  findAll: () => Promise<TestUser[]>;
  findByEmail: (email: string) => Promise<TestUser | null>;
  create: (email: string) => Promise<TestUser>;
};

const mutableWidgetsRepository = widgetsRepository as unknown as {
  findAll: (profileId: string) => Promise<TestWidget[]>;
  findById: (id: string) => Promise<TestWidget | null>;
  create: (input: {
    profileId: string;
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
  activateWidget: (profileId: string, widgetId: string) => Promise<TestWidget>;
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
    userCounter += 1;
    const newUser: TestUser = {
      id: `user-${userCounter}`,
      email,
      createdAt: new Date(),
    };
    usersStore.push(newUser);
    return newUser;
  };

  mutableWidgetsRepository.findAll = async (profileId: string) => {
    return widgetsStore
      .filter((widget) => widget.profileId === profileId)
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
      profileId: input.profileId,
      type: input.type,
      config: input.config as Record<string, unknown>,
      layout: input.layout,
      isActive: input.isActive,
      createdAt: now,
      updatedAt: now,
    };
    widgetsStore.push(newWidget);
    return newWidget;
  };
  mutableWidgetsRepository.activateWidget = async (profileId: string, widgetId: string) => {
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
        updatedAt: new Date(),
      };
    });

    return widgetsStore.find((item) => item.id === widgetId) as TestWidget;
  };

  globalThis.fetch = async (input) => {
    const requestUrl = String(input);

    if (requestUrl.startsWith("https://geocoding-api.open-meteo.com/v1/search")) {
      return new Response(
        JSON.stringify({
          results: [
            {
              name: "Amsterdam",
              admin1: "North Holland",
              country: "Netherlands",
              latitude: 52.374,
              longitude: 4.8897,
            },
          ],
        }),
        { status: 200 },
      );
    }

    if (requestUrl.startsWith("https://api.open-meteo.com/v1/forecast")) {
      return new Response(
        JSON.stringify({
          current: {
            temperature_2m: 9.24,
            weather_code: 61,
            time: "2026-03-20T08:15:00.000Z",
          },
          current_units: {
            temperature_2m: "°C",
          },
        }),
        { status: 200 },
      );
    }

    if (requestUrl === "https://calendar.example.com/demo.ics") {
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:event-1",
        "DTSTART;VALUE=DATE:20260321",
        "SUMMARY:All Day Planning",
        "LOCATION:HQ",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:event-2",
        "DTSTART:20260321T140000Z",
        "DTEND:20260321T143000Z",
        "SUMMARY:Client Sync",
        "LOCATION:Room 4A",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      return new Response(ics, { status: 200 });
    }

    return new Response(JSON.stringify({ message: "not mocked" }), {
      status: 404,
    });
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

  globalThis.fetch = originalFetch;
});

function getRouteHandler(router: Router, method: RouteMethod, path: string) {
  const routeLayer = (router as unknown as { stack?: Array<unknown> }).stack?.find(
    (layer) => {
      const route = (layer as { route?: { path?: string; methods?: Record<string, boolean> } })
        .route;
      return route?.path === path && route.methods?.[method];
    },
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

test("M6-2: critical admin and display flows pass for clockDate, weather, and calendar", async () => {
  const userCreateResponse = await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" },
  });
  assert.equal(userCreateResponse.statusCode, 201);

  const clockCreateResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "clockDate",
      config: {
        timezone: "Europe/Amsterdam",
        locale: "en-GB",
        hour12: false,
      },
    },
  });
  assert.equal(clockCreateResponse.statusCode, 201);

  const weatherCreateResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "weather",
      config: {
        location: "Amsterdam",
        units: "metric",
      },
    },
  });
  assert.equal(weatherCreateResponse.statusCode, 201);

  const calendarCreateResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "calendar",
      config: {
        provider: "ical",
        account: "https://calendar.example.com/demo.ics",
        timeWindow: "next7d",
        maxEvents: 5,
        includeAllDay: true,
      },
    },
  });
  assert.equal(calendarCreateResponse.statusCode, 201);

  const activateWeatherResponse = await invokeRoute(widgetsRouter, "patch", "/:id/active", {
    params: { id: (weatherCreateResponse.body as { id: string }).id },
  });
  assert.equal(activateWeatherResponse.statusCode, 200);
  assert.equal((activateWeatherResponse.body as { isActive: boolean }).isActive, true);

  const widgetsListResponse = await invokeRoute(widgetsRouter, "get", "/");
  assert.equal(widgetsListResponse.statusCode, 200);
  const widgets = widgetsListResponse.body as Array<{
    id: string;
    type: string;
    isActive: boolean;
  }>;
  assert.equal(widgets.length, 3);
  assert.equal(widgets.filter((widget) => widget.isActive).length, 1);
  assert.equal(
    widgets.some((widget) => widget.type === "weather" && widget.isActive),
    true,
  );

  const clockEnvelopeResponse = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: (clockCreateResponse.body as { id: string }).id },
  });
  assert.equal(clockEnvelopeResponse.statusCode, 200);
  assert.equal((clockEnvelopeResponse.body as { widgetKey: string }).widgetKey, "clockDate");
  assert.equal((clockEnvelopeResponse.body as { state: string }).state, "ready");

  const weatherEnvelopeResponse = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: (weatherCreateResponse.body as { id: string }).id },
  });
  assert.equal(weatherEnvelopeResponse.statusCode, 200);
  assert.equal((weatherEnvelopeResponse.body as { widgetKey: string }).widgetKey, "weather");
  assert.equal((weatherEnvelopeResponse.body as { state: string }).state, "ready");
  assert.equal(
    (weatherEnvelopeResponse.body as { data: { location: string } }).data.location,
    "Amsterdam, North Holland, Netherlands",
  );

  const calendarEnvelopeResponse = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: (calendarCreateResponse.body as { id: string }).id },
  });
  assert.equal(calendarEnvelopeResponse.statusCode, 200);
  assert.equal((calendarEnvelopeResponse.body as { widgetKey: string }).widgetKey, "calendar");
  assert.equal((calendarEnvelopeResponse.body as { state: string }).state, "ready");
  assert.equal(
    (calendarEnvelopeResponse.body as { data: { upcomingCount: number } }).data.upcomingCount,
    2,
  );
});

test("M6-2: widget-data returns not-found for unknown widget id", async () => {
  const response = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: "missing-widget" },
  });

  assert.equal(response.statusCode, 404);
  assert.equal((response.body as { error: { code: string } }).error.code, "NOT_FOUND");
});
