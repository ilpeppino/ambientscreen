import { test, expect, afterEach, beforeEach, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { slidesRouter } from "../src/modules/slides/slides.routes";
import { profilesService } from "../src/modules/profiles/profiles.service";
import { slidesService } from "../src/modules/slides/slides.service";

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

beforeEach(() => {
  vi.spyOn(profilesService, "resolveProfileForUser").mockResolvedValue({
    id: "profile-1",
    userId: "user-1",
    name: "Default",
    isDefault: true,
    createdAt: new Date(),
  } as never);

  vi.spyOn(slidesService, "listSlides").mockResolvedValue([
    {
      id: "slide-1",
      profileId: "profile-1",
      name: "Default",
      order: 0,
      durationSeconds: null,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      itemCount: 2,
    },
  ] as never);

  vi.spyOn(slidesService, "createSlide").mockResolvedValue({
    id: "slide-2",
    profileId: "profile-1",
    name: "Secondary",
    order: 1,
    durationSeconds: 15,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    itemCount: 0,
  } as never);

  vi.spyOn(slidesService, "updateSlide").mockResolvedValue({
    id: "slide-1",
    profileId: "profile-1",
    name: "Main",
    order: 0,
    durationSeconds: 20,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    itemCount: 2,
  } as never);

  vi.spyOn(slidesService, "deleteSlide").mockResolvedValue({
    deleted: true,
  } as never);
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

test("slides routes support list/create/update/delete", async () => {
  const listResponse = await invokeRoute(slidesRouter, "get", "/", {
    query: { profileId: "profile-1" },
  });
  expect(listResponse.statusCode).toBe(200);
  expect(listResponse.body).toEqual({
    slides: [expect.objectContaining({ id: "slide-1" })],
  });

  const createResponse = await invokeRoute(slidesRouter, "post", "/", {
    query: { profileId: "profile-1" },
    body: { name: "Secondary", durationSeconds: 15, isEnabled: true },
  });
  expect(createResponse.statusCode).toBe(201);

  const updateResponse = await invokeRoute(slidesRouter, "patch", "/:id", {
    params: { id: "slide-1" },
    query: { profileId: "profile-1" },
    body: { name: "Main", durationSeconds: 20 },
  });
  expect(updateResponse.statusCode).toBe(200);

  const deleteResponse = await invokeRoute(slidesRouter, "delete", "/:id", {
    params: { id: "slide-1" },
    query: { profileId: "profile-1" },
  });
  expect(deleteResponse.statusCode).toBe(204);
});

test("DELETE /slides/:id rejects deleting the last remaining slide", async () => {
  vi.spyOn(slidesService, "deleteSlide").mockResolvedValueOnce({
    deleted: false,
    reason: "lastSlide",
  } as never);

  const response = await invokeRoute(slidesRouter, "delete", "/:id", {
    params: { id: "slide-1" },
  });

  expect(response.statusCode).toBe(400);
});

test("PATCH /slides/:id returns 404 when slide is not found", async () => {
  vi.spyOn(slidesService, "updateSlide").mockResolvedValueOnce(null as never);

  const response = await invokeRoute(slidesRouter, "patch", "/:id", {
    params: { id: "slide-unknown" },
    body: { name: "Unknown" },
  });

  expect(response.statusCode).toBe(404);
});
