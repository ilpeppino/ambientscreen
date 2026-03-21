import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { displayRouter } from "../src/modules/display/display.routes";
import { usersRepository } from "../src/modules/users/users.repository";
import { widgetResolvers } from "../src/modules/widgetData/widget-resolvers";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";

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

const originalUsersFindAll = usersRepository.findAll;
const originalWidgetsFindAll = widgetsRepository.findAll;
const originalClockResolver = widgetResolvers.clockDate;
const originalWeatherResolver = widgetResolvers.weather;

const mutableUsersRepository = usersRepository as unknown as {
  findAll: () => Promise<TestUser[]>;
};

const mutableWidgetsRepository = widgetsRepository as unknown as {
  findAll: (profileId: string) => Promise<TestWidget[]>;
};

let usersStore: TestUser[] = [];
let widgetsStore: TestWidget[] = [];

beforeEach(() => {
  usersStore = [
    {
      id: "user-1",
      email: "owner@ambient.dev",
      createdAt: new Date(),
    },
  ];
  widgetsStore = [
    {
      id: "widget-1",
      profileId: "user-1",
      type: "clockDate",
      config: {},
      layout: { x: 0, y: 0, w: 2, h: 1 },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "widget-2",
      profileId: "user-1",
      type: "weather",
      config: { location: "Amsterdam" },
      layout: { x: 2, y: 0, w: 2, h: 1 },
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  mutableUsersRepository.findAll = async () => usersStore;
  mutableWidgetsRepository.findAll = async (profileId: string) => {
    return widgetsStore.filter((widget) => widget.profileId === profileId);
  };

  widgetResolvers.clockDate = async ({ widgetInstanceId }) => {
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
    };
  };
  widgetResolvers.weather = async ({ widgetInstanceId }) => {
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
    };
  };
});

after(() => {
  mutableUsersRepository.findAll = originalUsersFindAll as typeof mutableUsersRepository.findAll;
  mutableWidgetsRepository.findAll =
    originalWidgetsFindAll as typeof mutableWidgetsRepository.findAll;
  widgetResolvers.clockDate = originalClockResolver;
  widgetResolvers.weather = originalWeatherResolver;
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

async function invokeGetRoute(router: Router, path: string) {
  const handler = getRouteHandler(router, path);
  const req = {
    method: "GET",
    path,
    originalUrl: path,
    params: {},
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
  assert.equal(response.statusCode, 200);

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

  assert.equal(body.widgets.length, 2);
  assert.equal(body.widgets[0].widgetInstanceId, "widget-1");
  assert.deepEqual(body.widgets[0].layout, { x: 0, y: 0, w: 2, h: 1 });
  assert.equal(body.widgets[0].state, "ready");
  assert.equal(typeof body.widgets[0].meta.resolvedAt, "string");

  assert.equal(body.widgets[1].widgetInstanceId, "widget-2");
  assert.deepEqual(body.widgets[1].layout, { x: 2, y: 0, w: 2, h: 1 });
  assert.equal(body.widgets[1].state, "ready");
  assert.equal(typeof body.widgets[1].meta.resolvedAt, "string");
});

test("GET /display-layout continues when one resolver fails", async () => {
  widgetResolvers.weather = async () => {
    throw new Error("weather unavailable");
  };

  const response = await invokeGetRoute(displayRouter, "/display-layout");
  assert.equal(response.statusCode, 200);

  const body = response.body as {
    widgets: Array<{
      widgetInstanceId: string;
      widgetKey: string;
      state: string;
      meta: { errorCode?: string };
    }>;
  };

  assert.equal(body.widgets.length, 2);

  const clockWidget = body.widgets.find((widget) => widget.widgetKey === "clockDate");
  const weatherWidget = body.widgets.find((widget) => widget.widgetKey === "weather");

  assert.ok(clockWidget);
  assert.equal(clockWidget.state, "ready");
  assert.ok(weatherWidget);
  assert.equal(weatherWidget.state, "error");
  assert.equal(weatherWidget.meta.errorCode, "WIDGET_RESOLUTION_FAILED");
});
