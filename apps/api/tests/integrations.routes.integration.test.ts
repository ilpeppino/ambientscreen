import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { integrationsRouter } from "../src/modules/integrations/integrations.routes";
import { integrationsService } from "../src/modules/integrations/integrations.service";
import { apiErrors } from "../src/core/http/api-error";

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const baseSummary = {
  id: VALID_UUID,
  provider: "google",
  status: "connected",
  accountLabel: "owner@example.com",
  accountEmail: "owner@example.com",
  externalAccountId: "google-uid-1",
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  lastSyncedAt: null,
  createdAt: "2026-03-25T10:00:00.000Z",
  updatedAt: "2026-03-25T10:00:00.000Z",
};

beforeEach(() => {
  vi.spyOn(integrationsService, "listConnections").mockResolvedValue([baseSummary]);
  vi.spyOn(integrationsService, "getConnectionById").mockResolvedValue(baseSummary);
  vi.spyOn(integrationsService, "updateConnectionLabel").mockResolvedValue({
    ...baseSummary,
    accountLabel: "My Calendar",
  });
  vi.spyOn(integrationsService, "deleteConnection").mockResolvedValue(undefined);
  vi.spyOn(integrationsService, "refreshConnection").mockResolvedValue(baseSummary);
});

afterEach(() => {
  vi.restoreAllMocks();
});

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
    params: options.params ?? {},
    query: options.query ?? {},
    authUser: { id: "user-1", email: "owner@ambient.dev" },
  };

  const response = { statusCode: 200, body: null as unknown };

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

test("GET / lists integration connections for authenticated user", async () => {
  const response = await invokeRoute(integrationsRouter, "get", "/");

  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual({ items: [baseSummary] });
  expect(integrationsService.listConnections).toHaveBeenCalledWith("user-1", {});
});

test("GET / passes provider filter from query string", async () => {
  await invokeRoute(integrationsRouter, "get", "/", { query: { provider: "google" } });

  expect(integrationsService.listConnections).toHaveBeenCalledWith(
    "user-1",
    expect.objectContaining({ provider: "google" }),
  );
});

test("GET / returns 400 for unknown provider filter", async () => {
  const response = await invokeRoute(integrationsRouter, "get", "/", {
    query: { provider: "unknown_provider" },
  });

  expect(response.statusCode).toBe(400);
});

test("GET /:integrationConnectionId returns a single connection", async () => {
  const response = await invokeRoute(integrationsRouter, "get", "/:integrationConnectionId", {
    params: { integrationConnectionId: VALID_UUID },
  });

  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual(baseSummary);
  expect(integrationsService.getConnectionById).toHaveBeenCalledWith("user-1", VALID_UUID);
});

test("GET /:integrationConnectionId returns 400 for non-UUID id", async () => {
  const response = await invokeRoute(integrationsRouter, "get", "/:integrationConnectionId", {
    params: { integrationConnectionId: "not-a-uuid" },
  });

  expect(response.statusCode).toBe(400);
});

test("PATCH /:integrationConnectionId updates accountLabel", async () => {
  const response = await invokeRoute(integrationsRouter, "patch", "/:integrationConnectionId", {
    params: { integrationConnectionId: VALID_UUID },
    body: { accountLabel: "My Calendar" },
  });

  expect(response.statusCode).toBe(200);
  expect((response.body as typeof baseSummary).accountLabel).toBe("My Calendar");
  expect(integrationsService.updateConnectionLabel).toHaveBeenCalledWith(
    "user-1",
    VALID_UUID,
    expect.objectContaining({ accountLabel: "My Calendar" }),
  );
});

test("PATCH /:integrationConnectionId returns 400 for invalid UUID", async () => {
  const response = await invokeRoute(integrationsRouter, "patch", "/:integrationConnectionId", {
    params: { integrationConnectionId: "bad-id" },
    body: { accountLabel: "x" },
  });

  expect(response.statusCode).toBe(400);
});

test("DELETE /:integrationConnectionId revokes and returns 204", async () => {
  const response = await invokeRoute(integrationsRouter, "delete", "/:integrationConnectionId", {
    params: { integrationConnectionId: VALID_UUID },
  });

  expect(response.statusCode).toBe(204);
  expect(integrationsService.deleteConnection).toHaveBeenCalledWith("user-1", VALID_UUID);
});

test("DELETE /:integrationConnectionId returns 404 when not found", async () => {
  vi.spyOn(integrationsService, "deleteConnection").mockRejectedValue(
    apiErrors.integrationNotFound("Connection not found."),
  );

  const response = await invokeRoute(integrationsRouter, "delete", "/:integrationConnectionId", {
    params: { integrationConnectionId: VALID_UUID },
  });

  expect(response.statusCode).toBe(404);
});

test("POST /:integrationConnectionId/refresh returns refreshed connection", async () => {
  const response = await invokeRoute(integrationsRouter, "post", "/:integrationConnectionId/refresh", {
    params: { integrationConnectionId: VALID_UUID },
  });

  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual(baseSummary);
  expect(integrationsService.refreshConnection).toHaveBeenCalledWith("user-1", VALID_UUID);
});
