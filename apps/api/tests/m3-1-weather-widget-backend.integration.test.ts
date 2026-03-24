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

const originalFetch = globalThis.fetch;

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
    userCounter += 1;
    const newUser: TestUser = {
      id: `user-${userCounter}`,
      email,
      createdAt: new Date(),
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
      updatedAt: now,
    };
    widgetsStore.push(newWidget);
    return newWidget as never;
  });

  // Set API key so provider doesn't throw
  process.env.OPENWEATHER_API_KEY = "test-api-key";

  globalThis.fetch = async (input) => {
    const requestUrl = String(input);

    if (requestUrl.startsWith("https://api.openweathermap.org/data/2.5/weather")) {
      return new Response(
        JSON.stringify({
          name: "Amsterdam",
          sys: { country: "NL" },
          main: { temp: 9.2 },
          weather: [{ id: 501 }],
          dt: 1742464500,
        }),
        { status: 200 },
      );
    }

    if (requestUrl.startsWith("https://api.openweathermap.org/data/2.5/forecast")) {
      return new Response(
        JSON.stringify({
          city: { name: "Amsterdam", country: "NL" },
          list: [
            {
              dt: 1742475600,
              main: { temp: 8.5 },
              weather: [{ id: 500 }],
              dt_txt: "2026-03-20T12:00:00",
            },
            {
              dt: 1742486400,
              main: { temp: 7.1 },
              weather: [{ id: 800 }],
              dt_txt: "2026-03-20T15:00:00",
            },
            {
              dt: 1742497200,
              main: { temp: 6.3 },
              weather: [{ id: 800 }],
              dt_txt: "2026-03-20T18:00:00",
            },
          ],
        }),
        { status: 200 },
      );
    }

    return new Response(JSON.stringify({ message: "not mocked" }), {
      status: 404,
    });
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  delete process.env.OPENWEATHER_API_KEY;
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

test("M3-1: weather widget data endpoint returns normalized provider payload", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" },
  });

  const createWeatherWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "weather",
      config: {
        city: "Amsterdam",
        units: "metric",
        forecastSlots: 3,
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
      forecast: Array<{
        timeIso: string;
        temperatureC: number | null;
        conditionLabel: string | null;
      }>;
    };
    meta: {
      source: string;
      fetchedAt: string;
    };
  };

  expect(weatherEnvelope.state).toBe("ready");
  expect(weatherEnvelope.data.location).toBe("Amsterdam, NL");
  expect(weatherEnvelope.data.temperatureC).toBe(9.2);
  expect(weatherEnvelope.data.conditionLabel).toBe("Rain");
  expect(weatherEnvelope.meta.source).toBe("openweather");
  expect(typeof weatherEnvelope.meta.fetchedAt).toBe("string");
  expect(Array.isArray(weatherEnvelope.data.forecast)).toBe(true);
  expect(weatherEnvelope.data.forecast.length).toBe(3);
  expect(weatherEnvelope.data.forecast[0].conditionLabel).toBe("Rain");   // id 500
  expect(weatherEnvelope.data.forecast[1].conditionLabel).toBe("Clear"); // id 800
  expect(weatherEnvelope.data.forecast[2].conditionLabel).toBe("Clear"); // id 800
});

test("M3-1: weather widget accepts legacy location field via backward-compat mapper", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" },
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
  // Legacy location field is accepted during creation via extended schema
  expect(createWeatherWidgetResponse.statusCode).toBe(201);
});
