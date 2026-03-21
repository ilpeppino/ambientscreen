import { test, expect, beforeEach, afterEach, vi } from "vitest";
import type { Router } from "express";
import {
  globalErrorMiddleware,
  notFoundMiddleware
} from "../src/core/http/error-middleware";
import { usersRepository } from "../src/modules/users/users.repository";
import { usersRouter } from "../src/modules/users/users.routes";

interface TestUser {
  id: string;
  email: string;
  createdAt: Date;
}

type RouteMethod = "get" | "post";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
}

let usersStore: TestUser[] = [];
let userCounter = 0;

beforeEach(() => {
  usersStore = [];
  userCounter = 0;

  vi.spyOn(usersRepository, "findAll").mockImplementation(async () => usersStore);
  vi.spyOn(usersRepository, "findByEmail").mockImplementation(async (email: string) => {
    return usersStore.find((user) => user.email === email) ?? null;
  });
  vi.spyOn(usersRepository, "create").mockImplementation(async (email: string) => {
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
  });
});

afterEach(() => { vi.restoreAllMocks(); });

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

test("M0-2: duplicate, validation, and internal errors are distinguishable with normalized JSON", async () => {
  await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
  });

  const duplicateResponse = await invokeRoute(usersRouter, "post", "/", {
    body: { email: "owner@ambient.dev" }
  });
  expect(duplicateResponse.statusCode).toBe(409);
  expect(duplicateResponse.body).toEqual({
    error: {
      code: "DUPLICATE_RESOURCE",
      message: "A user with this email already exists"
    }
  });

  const validationResponse = await invokeRoute(usersRouter, "post", "/", {
    body: { email: "not-an-email" }
  });
  expect(validationResponse.statusCode).toBe(400);
  const validationBody = validationResponse.body as {
    error: { code: string; details: unknown };
  };
  expect(validationBody.error.code).toBe("VALIDATION_ERROR");
  expect(validationBody.error.details).toBeTruthy();

  vi.spyOn(usersRepository, "findAll").mockImplementation(async () => {
    throw new Error("simulated db failure");
  });

  const internalResponse = await invokeRoute(usersRouter, "get", "/");
  expect(internalResponse.statusCode).toBe(500);
  expect(internalResponse.body).toEqual({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error"
    }
  });

  vi.spyOn(usersRepository, "findAll").mockImplementation(async () => usersStore);
  const aliveResponse = await invokeRoute(usersRouter, "get", "/");
  expect(aliveResponse.statusCode).toBe(200);
});

test("M0-2: unknown route errors are normalized as JSON", () => {
  const req = {
    method: "GET",
    originalUrl: "/missing"
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

  notFoundMiddleware(req as never, res as never);

  expect(response.statusCode).toBe(404);
  expect(response.body).toEqual({
    error: {
      code: "NOT_FOUND",
      message: "Route not found: GET /missing"
    }
  });
});
