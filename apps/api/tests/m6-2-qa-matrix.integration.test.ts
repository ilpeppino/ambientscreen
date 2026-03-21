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
      isActive: input.isActive,
      createdAt: now,
      updatedAt: now,
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
        updatedAt: new Date(),
      };
    });

    return widgetsStore.find((item) => item.id === widgetId) as never;
  });

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

afterEach(() => {
  vi.restoreAllMocks();
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

test("M6-2: critical admin and display flows pass for clockDate, weather, and calendar", async () => {
  const userCreateResponse = await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" },
  });
  expect(userCreateResponse.statusCode).toBe(201);

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
  expect(clockCreateResponse.statusCode).toBe(201);

  const weatherCreateResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "weather",
      config: {
        location: "Amsterdam",
        units: "metric",
      },
    },
  });
  expect(weatherCreateResponse.statusCode).toBe(201);

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
  expect(calendarCreateResponse.statusCode).toBe(201);

  const activateWeatherResponse = await invokeRoute(widgetsRouter, "patch", "/:id/active", {
    params: { id: (weatherCreateResponse.body as { id: string }).id },
  });
  expect(activateWeatherResponse.statusCode).toBe(200);
  expect((activateWeatherResponse.body as { isActive: boolean }).isActive).toBe(true);

  const widgetsListResponse = await invokeRoute(widgetsRouter, "get", "/");
  expect(widgetsListResponse.statusCode).toBe(200);
  const widgets = widgetsListResponse.body as Array<{
    id: string;
    type: string;
    isActive: boolean;
  }>;
  expect(widgets.length).toBe(3);
  expect(widgets.filter((widget) => widget.isActive).length).toBe(1);
  expect(
    widgets.some((widget) => widget.type === "weather" && widget.isActive),
  ).toBe(true);

  const clockEnvelopeResponse = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: (clockCreateResponse.body as { id: string }).id },
  });
  expect(clockEnvelopeResponse.statusCode).toBe(200);
  expect((clockEnvelopeResponse.body as { widgetKey: string }).widgetKey).toBe("clockDate");
  expect((clockEnvelopeResponse.body as { state: string }).state).toBe("ready");

  const weatherEnvelopeResponse = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: (weatherCreateResponse.body as { id: string }).id },
  });
  expect(weatherEnvelopeResponse.statusCode).toBe(200);
  expect((weatherEnvelopeResponse.body as { widgetKey: string }).widgetKey).toBe("weather");
  expect((weatherEnvelopeResponse.body as { state: string }).state).toBe("ready");
  expect(
    (weatherEnvelopeResponse.body as { data: { location: string } }).data.location,
  ).toBe("Amsterdam, North Holland, Netherlands");

  const calendarEnvelopeResponse = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: (calendarCreateResponse.body as { id: string }).id },
  });
  expect(calendarEnvelopeResponse.statusCode).toBe(200);
  expect((calendarEnvelopeResponse.body as { widgetKey: string }).widgetKey).toBe("calendar");
  expect((calendarEnvelopeResponse.body as { state: string }).state).toBe("ready");
  expect(
    (calendarEnvelopeResponse.body as { data: { upcomingCount: number } }).data.upcomingCount,
  ).toBe(2);
});

test("M6-2: widget-data returns not-found for unknown widget id", async () => {
  const response = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: "missing-widget" },
  });

  expect(response.statusCode).toBe(404);
  expect((response.body as { error: { code: string } }).error.code).toBe("NOT_FOUND");
});
