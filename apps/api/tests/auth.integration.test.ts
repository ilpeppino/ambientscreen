import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { authRouter } from "../src/modules/auth/auth.routes";
import { authService } from "../src/modules/auth/auth.service";
import { requireAuth } from "../src/modules/auth/auth.middleware";

type RouteMethod = "post" | "get";

interface InvokeRouteOptions {
  body?: unknown;
  headers?: Record<string, string | undefined>;
}

function getRouteHandler(router: Router, method: RouteMethod, path: string) {
  const routeLayer = (router as unknown as { stack?: Array<unknown> }).stack?.find((layer) => {
    const route = (layer as { route?: { path?: string; methods?: Record<string, boolean> } }).route;
    return route?.path === path && route.methods?.[method];
  }) as
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
    headers: options.headers ?? {},
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
    send() {
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

beforeEach(() => {
  process.env.AUTH_JWT_SECRET = "test-auth-secret";
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("POST /auth/register and POST /auth/login return expected payloads", async () => {
  vi.spyOn(authService, "register").mockResolvedValue({
    id: "user-1",
    email: "owner@ambient.dev",
  });
  vi.spyOn(authService, "login").mockResolvedValue({
    token: "jwt-token",
    user: {
      id: "user-1",
      email: "owner@ambient.dev",
    },
  });

  const registerResponse = await invokeRoute(authRouter, "post", "/register", {
    body: {
      email: "owner@ambient.dev",
      password: "password123",
    },
  });
  expect(registerResponse.statusCode).toBe(201);
  expect(registerResponse.body).toEqual({
    user: {
      id: "user-1",
      email: "owner@ambient.dev",
    },
  });

  const loginResponse = await invokeRoute(authRouter, "post", "/login", {
    body: {
      email: "owner@ambient.dev",
      password: "password123",
    },
  });
  expect(loginResponse.statusCode).toBe(200);
  expect(loginResponse.body).toEqual({
    token: "jwt-token",
    user: {
      id: "user-1",
      email: "owner@ambient.dev",
    },
  });
});

test("requireAuth rejects missing token and accepts valid bearer token", async () => {
  const unauthorizedReq = {
    headers: {},
  };
  const unauthorizedRes = {};
  let unauthorizedError: unknown = null;
  requireAuth(unauthorizedReq as never, unauthorizedRes as never, (error?: unknown) => {
    unauthorizedError = error ?? null;
  });
  expect(unauthorizedError).toBeTruthy();
  expect((unauthorizedError as { status?: number }).status).toBe(401);

  const token = authService.createToken({
    userId: "user-1",
    email: "owner@ambient.dev",
  });
  const authorizedReq = {
    headers: {
      authorization: `Bearer ${token}`,
    },
    authUser: undefined,
  };
  const authorizedRes = {};
  let authorizedError: unknown = null;
  requireAuth(authorizedReq as never, authorizedRes as never, (error?: unknown) => {
    authorizedError = error ?? null;
  });

  expect(authorizedError).toBeNull();
  expect(authorizedReq.authUser).toEqual({
    id: "user-1",
    email: "owner@ambient.dev",
  });
});
