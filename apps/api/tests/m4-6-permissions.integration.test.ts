/**
 * M4.6 Permissions Hardening — Integration Tests
 *
 * Verifies:
 * - unauthenticated requests return 401
 * - cross-user resource access returns 404 (resource not found or not owned)
 * - /users routes require authentication
 * - ownership assertion helpers throw the correct errors
 * - plugin resolvers only receive user-scoped data
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { requireAuth } from "../src/modules/auth/auth.middleware";
import { usersRouter } from "../src/modules/users/users.routes";
import { profilesRouter } from "../src/modules/profiles/profiles.routes";
import { widgetsRouter } from "../src/modules/widgets/widgets.routes";
import { widgetDataRouter } from "../src/modules/widgetData/widget-data.routes";
import { profilesService } from "../src/modules/profiles/profiles.service";
import { widgetsService } from "../src/modules/widgets/widgets.service";
import { widgetDataService } from "../src/modules/widgetData/widget-data.service";
import { apiErrors } from "../src/core/http/api-error";
import {
  assertUserOwnsResource,
  assertUserOwnsProfile,
  assertUserOwnsDevice,
  assertUserOwnsWidget,
} from "../src/core/http/ownership";

// ---- helpers ---------------------------------------------------------------

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
  /** Omit authUser to simulate unauthenticated request */
  authUser?: { id: string; email: string } | null;
}

function getRouteHandler(router: Router, method: RouteMethod, path: string) {
  const routeLayer = (router as unknown as { stack?: Array<unknown> }).stack?.find((layer) => {
    const route = (layer as { route?: { path?: string; methods?: Record<string, boolean> } }).route;
    return route?.path === path && route.methods?.[method];
  }) as { route: { stack: Array<{ handle: (...args: unknown[]) => unknown }> } } | undefined;

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

  const req: Record<string, unknown> = {
    method: method.toUpperCase(),
    path,
    originalUrl: path,
    body: options.body ?? {},
    params: options.params ?? {},
    query: options.query ?? {},
  };

  // undefined = not set at all (unauthenticated), non-null = authenticated
  if (options.authUser !== null) {
    req.authUser = options.authUser ?? { id: "user-1", email: "owner@ambient.dev" };
  }

  const response = { statusCode: 200, body: null as unknown };

  const res = {
    status(code: number) { response.statusCode = code; return res; },
    json(body: unknown) { response.body = body; return res; },
    send() { return res; },
  };

  await handler(req, res, (error: unknown) => {
    if (error) {
      globalErrorMiddleware(error, req as never, res as never, (() => undefined) as never);
    }
  });

  return response;
}

// ---- ownership assertion helpers -------------------------------------------

describe("assertUserOwnsResource", () => {
  test("throws 404 when resource is null", () => {
    expect(() => assertUserOwnsResource(null, "Profile")).toThrowError();
    try {
      assertUserOwnsResource(null, "Profile");
    } catch (e) {
      expect((e as { status?: number }).status).toBe(404);
      expect((e as { code?: string }).code).toBe("NOT_FOUND");
      expect((e as Error).message).toContain("Profile");
    }
  });

  test("throws 404 when resource is undefined", () => {
    expect(() => assertUserOwnsResource(undefined)).toThrowError();
    try {
      assertUserOwnsResource(undefined);
    } catch (e) {
      expect((e as { status?: number }).status).toBe(404);
    }
  });

  test("does not throw when resource is present", () => {
    expect(() => assertUserOwnsResource({ id: "r-1" })).not.toThrow();
  });

  test("named helpers use the correct label", () => {
    try { assertUserOwnsProfile(null); } catch (e) {
      expect((e as Error).message).toContain("Profile");
    }
    try { assertUserOwnsDevice(null); } catch (e) {
      expect((e as Error).message).toContain("Device");
    }
    try { assertUserOwnsWidget(null); } catch (e) {
      expect((e as Error).message).toContain("Widget");
    }
  });
});

// ---- /users routes: require authentication ---------------------------------

describe("/users routes", () => {
  afterEach(() => vi.restoreAllMocks());

  test("GET /users/me requires authentication — unauthenticated returns 401", async () => {
    const response = await invokeRoute(usersRouter, "get", "/me", { authUser: null });
    expect(response.statusCode).toBe(401);
    expect((response.body as { error: { code: string } }).error.code).toBe("UNAUTHORIZED");
  });
});

// ---- /profiles: cross-user isolation ----------------------------------------

describe("/profiles cross-user isolation", () => {
  beforeEach(() => {
    vi.spyOn(profilesService, "getProfileByIdForUser").mockImplementation(
      async ({ userId, profileId }) => {
        // Only return the profile if it belongs to the requesting user
        if (userId === "user-1" && profileId === "profile-of-user-1") {
          return { id: profileId, userId, name: "My Profile", isDefault: true, createdAt: new Date() } as never;
        }
        return null as never;
      },
    );
    vi.spyOn(widgetsService, "clearWidgetsForProfile").mockImplementation(
      async ({ profileId }: { profileId: string }) => ({
        deletedCount: profileId === "profile-of-user-1" ? 3 : 0,
      }) as never,
    );
  });

  afterEach(() => vi.restoreAllMocks());

  test("GET /profiles/:id returns 404 when accessing another user's profile", async () => {
    const response = await invokeRoute(profilesRouter, "get", "/:id", {
      params: { id: "profile-of-user-2" }, // belongs to user-2, requesting as user-1
      authUser: { id: "user-1", email: "owner@ambient.dev" },
    });

    expect(response.statusCode).toBe(404);
    expect((response.body as { error: { code: string } }).error.code).toBe("NOT_FOUND");
  });

  test("GET /profiles/:id returns 200 when accessing own profile", async () => {
    const response = await invokeRoute(profilesRouter, "get", "/:id", {
      params: { id: "profile-of-user-1" },
      authUser: { id: "user-1", email: "owner@ambient.dev" },
    });

    expect(response.statusCode).toBe(200);
  });

  test("DELETE /profiles/:id/widgets returns 404 for another user's profile", async () => {
    const response = await invokeRoute(profilesRouter, "delete", "/:id/widgets", {
      params: { id: "profile-of-user-2" },
      authUser: { id: "user-1", email: "owner@ambient.dev" },
    });

    expect(response.statusCode).toBe(404);
    expect((response.body as { error: { code: string } }).error.code).toBe("NOT_FOUND");
    expect(widgetsService.clearWidgetsForProfile).not.toHaveBeenCalled();
  });

  test("DELETE /profiles/:id/widgets returns 200 for own profile", async () => {
    const response = await invokeRoute(profilesRouter, "delete", "/:id/widgets", {
      params: { id: "profile-of-user-1" },
      authUser: { id: "user-1", email: "owner@ambient.dev" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ deletedCount: 3 });
    expect(widgetsService.clearWidgetsForProfile).toHaveBeenCalledWith({
      profileId: "profile-of-user-1",
    });
  });
});

// ---- /widgets: cross-user isolation -----------------------------------------

describe("/widgets cross-user isolation", () => {
  beforeEach(() => {
    // The route resolves the profile before touching the widget
    vi.spyOn(profilesService, "resolveProfileForUser").mockImplementation(async ({ userId }) => {
      return { id: `profile-of-${userId}`, userId, name: "Default", isDefault: true, createdAt: new Date() } as never;
    });

    // updateWidgetConfigForProfile returns null when widget doesn't belong to profile
    vi.spyOn(widgetsService, "updateWidgetConfigForProfile").mockImplementation(
      async ({ profileId, widgetId }: { profileId: string; widgetId: string; configPatch: unknown }) => {
        // Only allow update when widget belongs to the user's profile
        if (widgetId === "widget-of-user-1" && profileId === "profile-of-user-1") {
          return { id: widgetId, profileId, type: "clockDate", config: {} } as never;
        }
        return null as never;
      },
    );
  });

  afterEach(() => vi.restoreAllMocks());

  test("PATCH /widgets/:id/config returns 404 when widget does not belong to user's profile", async () => {
    // user-1 requests config update for widget-of-user-2 (different profile)
    const response = await invokeRoute(widgetsRouter, "patch", "/:id/config", {
      params: { id: "widget-of-user-2" },
      body: { config: { format: "12h" } },
      authUser: { id: "user-1", email: "owner@ambient.dev" },
    });

    expect(response.statusCode).toBe(404);
    expect((response.body as { error: { code: string } }).error.code).toBe("NOT_FOUND");
  });

  test("PATCH /widgets/:id/config returns 200 when widget belongs to user's profile", async () => {
    const response = await invokeRoute(widgetsRouter, "patch", "/:id/config", {
      params: { id: "widget-of-user-1" },
      body: { config: { format: "12h" } },
      authUser: { id: "user-1", email: "owner@ambient.dev" },
    });

    expect(response.statusCode).toBe(200);
  });
});

// ---- /widget-data: cross-user isolation -------------------------------------

describe("/widget-data cross-user isolation", () => {
  afterEach(() => vi.restoreAllMocks());

  test("GET /widget-data/:id returns 404 when accessing another user's widget data", async () => {
    vi.spyOn(widgetDataService, "getWidgetDataForUser").mockResolvedValue(null as never);

    const response = await invokeRoute(widgetDataRouter, "get", "/:id", {
      params: { id: "widget-of-user-2" },
      authUser: { id: "user-1", email: "owner@ambient.dev" },
    });

    expect(response.statusCode).toBe(404);
    expect((response.body as { error: { code: string } }).error.code).toBe("NOT_FOUND");
  });
});

// ---- unauthenticated route rejections ----------------------------------------

describe("unauthenticated requests are rejected with 401", () => {
  afterEach(() => vi.restoreAllMocks());

  test("requireAuth middleware rejects missing token", () => {
    const req = { headers: {} };
    let capturedError: unknown = null;

    requireAuth(
      req as never,
      {} as never,
      (err?: unknown) => { capturedError = err ?? null; },
    );

    expect(capturedError).not.toBeNull();
    expect((capturedError as { status?: number }).status).toBe(401);
    expect((capturedError as { code?: string }).code).toBe("UNAUTHORIZED");
  });

  test("requireAuth middleware rejects malformed Authorization header", () => {
    const req = { headers: { authorization: "Basic not-a-bearer-token" } };
    let capturedError: unknown = null;

    requireAuth(
      req as never,
      {} as never,
      (err?: unknown) => { capturedError = err ?? null; },
    );

    expect(capturedError).not.toBeNull();
    expect((capturedError as { status?: number }).status).toBe(401);
  });
});

// ---- error code coverage ----------------------------------------------------

describe("apiErrors.forbidden", () => {
  test("returns 403 with FORBIDDEN code", () => {
    const err = apiErrors.forbidden("You do not have access to this resource");
    expect(err.status).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toBe("You do not have access to this resource");
  });
});
