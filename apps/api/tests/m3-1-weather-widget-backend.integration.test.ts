import { test, expect, beforeEach, afterEach, vi } from "vitest";
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

  vi.spyOn(usersRepository, "findAll").mockImplementation(async () => usersStore);
  vi.spyOn(usersRepository, "findByEmail").mockImplementation(async (email: string) => {
    return usersStore.find((user) => user.email === email) ?? null;
  });
  vi.spyOn(usersRepository, "create").mockImplementation(async (email: string) => {
    userCounter += 1;
    const newUser: TestUser = {
      id: `user-${userCounter}`,
      email,
      createdAt: new Date(),
    };
    usersStore.push(newUser);
    return newUser;
  });

  vi.spyOn(widgetsRepository, "findAll").mockImplementation(async (profileId: string) => {
    return widgetsStore
      .filter((widget) => widget.profileId === profileId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  });
  vi.spyOn(widgetsRepository, "findById").mockImplementation(async (id: string) => {
    return widgetsStore.find((widget) => widget.id === id) ?? null;
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
      updatedAt: now,
    };
    widgetsStore.push(newWidget);
    return newWidget;
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
        updatedAt: new Date(),
      };
    });

    return widgetsStore.find((item) => item.id === widgetId) as TestWidget;
  });

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
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

    return new Response(JSON.stringify({ message: "not mocked" }), {
      status: 404,
    });
  });
});

afterEach(() => { vi.restoreAllMocks(); });

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

test("M3-1: weather widget data endpoint returns normalized provider payload", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" },
  });

  const createWeatherWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "weather",
      config: {
        location: "Amsterdam",
        units: "metric",
      },
    },
  });
  expect(createWeatherWidgetResponse.statusCode).toBe(201);

  const weatherWidgetId = (createWeatherWidgetResponse.body as { id: string }).id;
  const weatherDataResponse = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: weatherWidgetId },
  });

  expect(weatherDataResponse.statusCode).toBe(200);
  const weatherEnvelope = weatherDataResponse.body as {
    state: string;
    data: {
      location: string | null;
      temperatureC: number | null;
      conditionLabel: string | null;
    };
    meta: {
      source: string;
      fetchedAt: string;
    };
  };

  expect(weatherEnvelope.state).toBe("ready");
  expect(weatherEnvelope.data.location).toBe("Amsterdam, North Holland, Netherlands");
  expect(weatherEnvelope.data.temperatureC).toBe(9.2);
  expect(weatherEnvelope.data.conditionLabel).toBe("Rain");
  expect(weatherEnvelope.meta.source).toBe("open-meteo");
  expect(weatherEnvelope.meta.fetchedAt).toBe("2026-03-20T08:15:00.000Z");
});
