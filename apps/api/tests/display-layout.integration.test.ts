import { test, expect, afterEach, beforeEach, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { displayRouter } from "../src/modules/display/display.routes";
import { profilesService } from "../src/modules/profiles/profiles.service";
import { widgetResolvers } from "../src/modules/widgetData/widget-resolvers";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";

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

let widgetsStore: TestWidget[] = [];

beforeEach(() => {
  widgetsStore = [
    {
      id: "widget-1",
      profileId: "profile-1",
      type: "clockDate",
      config: {},
      layout: { x: 0, y: 0, w: 2, h: 1 },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "widget-2",
      profileId: "profile-1",
      type: "weather",
      config: { location: "Amsterdam" },
      layout: { x: 2, y: 0, w: 2, h: 1 },
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  vi.spyOn(profilesService, "resolveProfileForUser").mockImplementation(async () => ({
    id: "profile-1",
    userId: "user-1",
    name: "Default",
    isDefault: true,
    createdAt: new Date(),
  }) as never);
  vi.spyOn(widgetsRepository, "findAll").mockImplementation(async (profileId: string) => {
    return widgetsStore.filter((widget) => widget.profileId === profileId) as never;
  });

  vi.spyOn(widgetResolvers, "clockDate").mockImplementation(async ({ widgetInstanceId }) => {
    return {
      widgetInstanceId,
      widgetKey: "clockDate",
      state: "ready",
      data: {
        nowIso: "2026-03-21T10:00:00.000Z",
        formattedTime: "10:00:00",
        formattedDate: "21 March 2026",
        weekdayLabel: "Saturday",
      },
      meta: {
        source: "system",
      },
    } as never;
  });
  vi.spyOn(widgetResolvers, "weather").mockImplementation(async ({ widgetInstanceId }) => {
    return {
      widgetInstanceId,
      widgetKey: "weather",
      state: "ready",
      data: {
        location: "Amsterdam",
        temperatureC: 9.1,
        conditionLabel: "Rain",
      },
      meta: {
        source: "open-meteo",
      },
    } as never;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function getRouteHandler(router: Router, path: string) {
  const routeLayer = (router as unknown as { stack?: Array<unknown> }).stack?.find((layer) => {
    const route = (layer as { route?: { path?: string; methods?: Record<string, boolean> } })
      .route;
    return route?.path === path && route.methods?.get;
  }) as
    | {
        route: {
          stack: Array<{ handle: (...args: unknown[]) => Promise<void> | void }>;
        };
      }
    | undefined;

  if (!routeLayer) {
    throw new Error(`Route GET ${path} not found`);
  }

  return routeLayer.route.stack[0].handle;
}

async function invokeGetRoute(router: Router, path: string, query?: Record<string, string>) {
  const handler = getRouteHandler(router, path);
  const req = {
    method: "GET",
    path,
    originalUrl: path,
    params: {},
    query: query ?? {},
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

test("GET /display-layout returns multiple layout-aware widget envelopes", async () => {
  const response = await invokeGetRoute(displayRouter, "/display-layout");
  expect(response.statusCode).toBe(200);

  const body = response.body as {
    widgets: Array<{
      widgetInstanceId: string;
      widgetKey: string;
      layout: { x: number; y: number; w: number; h: number };
      state: string;
      data: Record<string, unknown> | null;
      meta: { resolvedAt: string };
    }>;
  };

  expect(body.widgets.length).toBe(2);
  expect(body.widgets[0].widgetInstanceId).toBe("widget-1");
  expect(body.widgets[0].layout).toEqual({ x: 0, y: 0, w: 2, h: 1 });
  expect(body.widgets[0].state).toBe("ready");
  expect(typeof body.widgets[0].meta.resolvedAt).toBe("string");

  expect(body.widgets[1].widgetInstanceId).toBe("widget-2");
  expect(body.widgets[1].layout).toEqual({ x: 2, y: 0, w: 2, h: 1 });
  expect(body.widgets[1].state).toBe("ready");
  expect(typeof body.widgets[1].meta.resolvedAt).toBe("string");
});

test("GET /display-layout continues when one resolver fails", async () => {
  vi.spyOn(widgetResolvers, "weather").mockImplementation(async () => {
    throw new Error("weather unavailable");
  });

  const response = await invokeGetRoute(displayRouter, "/display-layout");
  expect(response.statusCode).toBe(200);

  const body = response.body as {
    widgets: Array<{
      widgetInstanceId: string;
      widgetKey: string;
      state: string;
      meta: { errorCode?: string };
    }>;
  };

  expect(body.widgets.length).toBe(2);

  const clockWidget = body.widgets.find((widget) => widget.widgetKey === "clockDate");
  const weatherWidget = body.widgets.find((widget) => widget.widgetKey === "weather");

  expect(clockWidget).toBeTruthy();
  expect(clockWidget!.state).toBe("ready");
  expect(weatherWidget).toBeTruthy();
  expect(weatherWidget!.state).toBe("error");
  expect(weatherWidget!.meta.errorCode).toBe("WIDGET_RESOLUTION_FAILED");
});

test("GET /display-layout rejects unknown profile ownership context", async () => {
  vi.spyOn(profilesService, "resolveProfileForUser").mockImplementation(async () => null as never);

  const response = await invokeGetRoute(displayRouter, "/display-layout", {
    profileId: "profile-other-user",
  });

  expect(response.statusCode).toBe(404);
});
