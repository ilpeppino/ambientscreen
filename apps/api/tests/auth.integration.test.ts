import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { authRouter } from "../src/modules/auth/auth.routes";
import { authService } from "../src/modules/auth/auth.service";
import { requireAuth } from "../src/modules/auth/auth.middleware";
import { tokenBlocklistRepository } from "../src/modules/auth/tokenBlocklist.repository";

type RouteMethod = "post" | "get";

interface InvokeRouteOptions {
  body?: unknown;
  headers?: Record<string, string | undefined>;
}

function getRouteHandlers(router: Router, method: RouteMethod, path: string) {
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

  return routeLayer.route.stack.map((layer) => layer.handle);
}

async function invokeRoute(
  router: Router,
  method: RouteMethod,
  path: string,
  options: InvokeRouteOptions = {},
) {
  const handlers = getRouteHandlers(router, method, path);
  const req = {
    method: method.toUpperCase(),
    path,
    originalUrl: path,
    body: options.body ?? {},
    headers: options.headers ?? {},
    authUser: undefined as unknown,
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

  // Run handlers in sequence; continue only if next() is called without error
  for (const handler of handlers) {
    let nextCalled = false;
    await handler(req, res, (error: unknown) => {
      if (error) {
        globalErrorMiddleware(error, req as never, res as never, (() => undefined) as never);
      } else {
        nextCalled = true;
      }
    });
    if (!nextCalled) break;
  }

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
  vi.spyOn(tokenBlocklistRepository, "isBlocked").mockResolvedValue(false);

  const unauthorizedReq = {
    headers: {},
  };
  const unauthorizedRes = {};
  let unauthorizedError: unknown = null;
  await requireAuth(unauthorizedReq as never, unauthorizedRes as never, (error?: unknown) => {
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
  await requireAuth(authorizedReq as never, authorizedRes as never, (error?: unknown) => {
    authorizedError = error ?? null;
  });

  expect(authorizedError).toBeNull();
  expect(authorizedReq.authUser).toEqual({
    id: "user-1",
    email: "owner@ambient.dev",
  });
});

test("POST /auth/logout revokes token and subsequent use returns 401", async () => {
  vi.spyOn(tokenBlocklistRepository, "isBlocked").mockResolvedValue(false);

  const blocklist = new Map<string, Date>();
  vi.spyOn(tokenBlocklistRepository, "block").mockImplementation(async (jti, expiresAt) => {
    blocklist.set(jti, expiresAt);
  });
  vi.spyOn(tokenBlocklistRepository, "isBlocked").mockImplementation(async (jti) => {
    return blocklist.has(jti);
  });

  // Login to get a real token
  vi.spyOn(authService, "login").mockResolvedValue({
    token: authService.createToken({ userId: "user-1", email: "owner@ambient.dev" }),
    user: { id: "user-1", email: "owner@ambient.dev" },
  });

  const loginResponse = await invokeRoute(authRouter, "post", "/login", {
    body: { email: "owner@ambient.dev", password: "password123" },
  });
  expect(loginResponse.statusCode).toBe(200);
  const token = (loginResponse.body as { token: string }).token;

  // Logout
  const logoutResponse = await invokeRoute(authRouter, "post", "/logout", {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(logoutResponse.statusCode).toBe(204);

  // Same token should now be rejected by requireAuth
  const req = {
    headers: { authorization: `Bearer ${token}` },
    authUser: undefined,
  };
  let error: unknown = null;
  await requireAuth(req as never, {} as never, (err?: unknown) => {
    error = err ?? null;
  });
  expect(error).toBeTruthy();
  expect((error as { status?: number }).status).toBe(401);
});
