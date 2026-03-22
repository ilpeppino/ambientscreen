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

function formatDateAsIcsUtcDay(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function buildCalendarIcsFixture(): {
  ics: string;
  expectedAllDayStartIso: string;
  expectedTimedStartIso: string;
  expectedTimedEndIso: string;
} {
  const todayUtc = new Date();
  const dayString = formatDateAsIcsUtcDay(todayUtc);

  const timedStart = new Date(Date.UTC(
    todayUtc.getUTCFullYear(),
    todayUtc.getUTCMonth(),
    todayUtc.getUTCDate(),
    14,
    0,
    0,
    0,
  ));
  const timedEnd = new Date(timedStart);
  timedEnd.setUTCMinutes(30);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:event-1",
    `DTSTART;VALUE=DATE:${dayString}`,
    "SUMMARY:All Day Planning",
    "LOCATION:HQ",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:event-2",
    `DTSTART:${dayString}T140000Z`,
    `DTEND:${dayString}T143000Z`,
    "SUMMARY:Client Sync",
    "LOCATION:Room 4A",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    ics,
    expectedAllDayStartIso: `${timedStart.toISOString().slice(0, 10)}T00:00:00.000Z`,
    expectedTimedStartIso: timedStart.toISOString(),
    expectedTimedEndIso: timedEnd.toISOString(),
  };
}

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

    if (requestUrl === "https://calendar.example.com/demo.ics") {
      const { ics } = buildCalendarIcsFixture();

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

test("M4-1: calendar widget data endpoint returns normalized event list", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" },
  });

  const createCalendarWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
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
  expect(createCalendarWidgetResponse.statusCode).toBe(201);

  const calendarWidgetId = (createCalendarWidgetResponse.body as { id: string }).id;
  const calendarDataResponse = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: calendarWidgetId },
  });

  expect(calendarDataResponse.statusCode).toBe(200);
  const {
    expectedAllDayStartIso,
    expectedTimedStartIso,
    expectedTimedEndIso,
  } = buildCalendarIcsFixture();
  const calendarEnvelope = calendarDataResponse.body as {
    state: string;
    data: {
      upcomingCount: number;
      events: Array<{
        id: string;
        title: string;
        startIso: string;
        endIso: string | null;
        allDay: boolean;
        location: string | null;
      }>;
    };
    meta: {
      source: string;
      fetchedAt: string;
    };
  };

  expect(calendarEnvelope.state).toBe("ready");
  expect(calendarEnvelope.data.upcomingCount).toBe(2);
  expect(calendarEnvelope.data.events[0]).toEqual({
    id: "event-1",
    title: "All Day Planning",
    startIso: expectedAllDayStartIso,
    endIso: null,
    allDay: true,
    location: "HQ",
  });
  expect(calendarEnvelope.data.events[1]).toEqual({
    id: "event-2",
    title: "Client Sync",
    startIso: expectedTimedStartIso,
    endIso: expectedTimedEndIso,
    allDay: false,
    location: "Room 4A",
  });
  expect(calendarEnvelope.meta.source).toBe("ical");
  expect(typeof calendarEnvelope.meta.fetchedAt).toBe("string");
});

test("M4-1: calendar widget data endpoint returns empty when feed is not configured", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev", password: "password123" },
  });

  const createCalendarWidgetResponse = await invokeRoute(widgetsRouter, "post", "/", {
    body: {
      type: "calendar",
      config: {
        provider: "ical",
        timeWindow: "next7d",
      },
    },
  });
  expect(createCalendarWidgetResponse.statusCode).toBe(201);

  const calendarWidgetId = (createCalendarWidgetResponse.body as { id: string }).id;
  const calendarDataResponse = await invokeRoute(widgetDataRouter, "get", "/:id", {
    params: { id: calendarWidgetId },
  });

  expect(calendarDataResponse.statusCode).toBe(200);
  const calendarEnvelope = calendarDataResponse.body as {
    state: string;
    data: {
      upcomingCount: number;
      events: unknown[];
    };
    meta: {
      errorCode: string;
    };
  };

  expect(calendarEnvelope.state).toBe("empty");
  expect(calendarEnvelope.data.upcomingCount).toBe(0);
  expect(calendarEnvelope.data.events.length).toBe(0);
  expect(calendarEnvelope.meta.errorCode).toBe("CALENDAR_FEED_NOT_CONFIGURED");
});
