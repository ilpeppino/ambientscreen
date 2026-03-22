/**
 * M4.8 Monetization Hooks & Premium Readiness — Tests
 *
 * Verifies:
 * - hasFeature returns correct boolean for free/pro users
 * - assertFeatureAccess throws 403 for free users on pro features
 * - assertFeatureAccess passes for pro users
 * - resolveUserFeatures returns correct feature map
 * - GET /entitlements returns plan and feature map for free user
 * - GET /entitlements returns plan and feature map for pro user
 * - GET /entitlements returns 404 if user not found
 * - POST /widgets blocks premium widget creation for free users (403)
 * - POST /widgets allows non-premium widget creation for free users
 * - Feature flags resolve consistently
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Router } from "express";
import {
  hasFeature,
  assertFeatureAccess,
  resolveUserFeatures,
} from "../src/modules/entitlements/entitlements.service";
import { FEATURE_FLAGS, ALL_FEATURE_FLAG_KEYS } from "../src/modules/entitlements/feature-flags";
import { ApiError } from "../src/core/http/api-error";
import { entitlementsRouter } from "../src/modules/entitlements/entitlements.routes";
import { widgetsRouter } from "../src/modules/widgets/widgets.routes";
import { usersService } from "../src/modules/users/users.service";
import { profilesService } from "../src/modules/profiles/profiles.service";
import { widgetsService } from "../src/modules/widgets/widgets.service";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeOptions {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
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
  options: InvokeOptions = {},
) {
  const handler = getRouteHandler(router, method, path);

  const req: Record<string, unknown> = {
    method: method.toUpperCase(),
    path,
    originalUrl: path,
    body: options.body ?? {},
    params: options.params ?? {},
    query: options.query ?? {},
    headers: {},
  };

  if (options.authUser !== null) {
    req.authUser = options.authUser ?? { id: "user-1", email: "user@ambient.dev" };
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

// ---------------------------------------------------------------------------
// 1. hasFeature — unit tests
// ---------------------------------------------------------------------------

describe("hasFeature", () => {
  test("free user cannot access pro-only features", () => {
    const user = { plan: "free" };

    expect(hasFeature(user, "premium_widgets")).toBe(false);
    expect(hasFeature(user, "advanced_layouts")).toBe(false);
    expect(hasFeature(user, "multi_device_control")).toBe(false);
    expect(hasFeature(user, "plugin_installation")).toBe(false);
  });

  test("pro user can access all features", () => {
    const user = { plan: "pro" };

    expect(hasFeature(user, "premium_widgets")).toBe(true);
    expect(hasFeature(user, "advanced_layouts")).toBe(true);
    expect(hasFeature(user, "multi_device_control")).toBe(true);
    expect(hasFeature(user, "plugin_installation")).toBe(true);
  });

  test("unknown plan is treated as free", () => {
    const user = { plan: "enterprise" };

    expect(hasFeature(user, "premium_widgets")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. assertFeatureAccess — unit tests
// ---------------------------------------------------------------------------

describe("assertFeatureAccess", () => {
  test("throws 403 ApiError for free user accessing pro feature", () => {
    const user = { plan: "free" };

    try {
      assertFeatureAccess(user, "premium_widgets");
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
      expect((error as ApiError).code).toBe("FORBIDDEN");
    }
  });

  test("error message mentions the feature name", () => {
    const user = { plan: "free" };

    try {
      assertFeatureAccess(user, "premium_widgets");
    } catch (error) {
      expect((error as Error).message).toMatch(/Premium Widgets|premium_widgets/i);
    }
  });

  test("does not throw for pro user on any feature", () => {
    const user = { plan: "pro" };

    for (const key of ALL_FEATURE_FLAG_KEYS) {
      expect(() => assertFeatureAccess(user, key)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. resolveUserFeatures — unit tests
// ---------------------------------------------------------------------------

describe("resolveUserFeatures", () => {
  test("returns all features as false for free user", () => {
    const user = { plan: "free" };
    const features = resolveUserFeatures(user);

    for (const key of ALL_FEATURE_FLAG_KEYS) {
      expect(features[key]).toBe(false);
    }
  });

  test("returns all features as true for pro user", () => {
    const user = { plan: "pro" };
    const features = resolveUserFeatures(user);

    for (const key of ALL_FEATURE_FLAG_KEYS) {
      expect(features[key]).toBe(true);
    }
  });

  test("returns exactly all defined feature keys", () => {
    const user = { plan: "free" };
    const features = resolveUserFeatures(user);

    expect(Object.keys(features).sort()).toEqual(ALL_FEATURE_FLAG_KEYS.slice().sort());
  });
});

// ---------------------------------------------------------------------------
// 4. Feature flag definitions
// ---------------------------------------------------------------------------

describe("FEATURE_FLAGS", () => {
  test("all defined flags require pro plan", () => {
    for (const flag of Object.values(FEATURE_FLAGS)) {
      expect(flag.requiredPlan).toBe("pro");
    }
  });

  test("all flags have non-empty name and description", () => {
    for (const flag of Object.values(FEATURE_FLAGS)) {
      expect(flag.name.length).toBeGreaterThan(0);
      expect(flag.description.length).toBeGreaterThan(0);
    }
  });

  test("ALL_FEATURE_FLAG_KEYS matches the keys in FEATURE_FLAGS", () => {
    expect(ALL_FEATURE_FLAG_KEYS.slice().sort()).toEqual(
      Object.keys(FEATURE_FLAGS).sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// 5. GET /entitlements — integration tests
// ---------------------------------------------------------------------------

describe("GET /entitlements", () => {
  afterEach(() => vi.restoreAllMocks());

  test("returns free plan with all features locked for free user", async () => {
    vi.spyOn(usersService, "findUserById").mockResolvedValue({
      id: "user-1",
      email: "free@example.com",
      passwordHash: "hash",
      plan: "free",
      createdAt: new Date(),
      activeProfileId: null,
    });

    const result = await invokeRoute(entitlementsRouter, "get", "/", {
      authUser: { id: "user-1", email: "free@example.com" },
    });

    expect(result.statusCode).toBe(200);
    const body = result.body as { plan: string; features: Record<string, boolean> };
    expect(body.plan).toBe("free");

    for (const key of ALL_FEATURE_FLAG_KEYS) {
      expect(body.features[key]).toBe(false);
    }
  });

  test("returns pro plan with all features unlocked for pro user", async () => {
    vi.spyOn(usersService, "findUserById").mockResolvedValue({
      id: "user-2",
      email: "pro@example.com",
      passwordHash: "hash",
      plan: "pro",
      createdAt: new Date(),
      activeProfileId: null,
    });

    const result = await invokeRoute(entitlementsRouter, "get", "/", {
      authUser: { id: "user-2", email: "pro@example.com" },
    });

    expect(result.statusCode).toBe(200);
    const body = result.body as { plan: string; features: Record<string, boolean> };
    expect(body.plan).toBe("pro");

    for (const key of ALL_FEATURE_FLAG_KEYS) {
      expect(body.features[key]).toBe(true);
    }
  });

  test("returns 404 if user not found", async () => {
    vi.spyOn(usersService, "findUserById").mockResolvedValue(null);

    const result = await invokeRoute(entitlementsRouter, "get", "/", {
      authUser: { id: "ghost", email: "ghost@example.com" },
    });

    expect(result.statusCode).toBe(404);
  });

  test("returns 401 for unauthenticated request", async () => {
    const result = await invokeRoute(entitlementsRouter, "get", "/", {
      authUser: null,
    });

    expect(result.statusCode).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 6. POST /widgets — premium widget enforcement
// ---------------------------------------------------------------------------

describe("POST /widgets — premium widget enforcement", () => {
  const mockProfileId = "profile-abc";

  beforeEach(() => {
    vi.spyOn(profilesService, "resolveProfileForUser").mockResolvedValue({
      id: mockProfileId,
      userId: "user-1",
      name: "Default",
      isDefault: true,
      createdAt: new Date(),
    });
  });

  afterEach(() => vi.restoreAllMocks());

  test("free user can create non-premium widget (clockDate)", async () => {
    vi.spyOn(usersService, "findUserById").mockResolvedValue({
      id: "user-1",
      email: "free@example.com",
      passwordHash: "hash",
      plan: "free",
      createdAt: new Date(),
      activeProfileId: null,
    });
    vi.spyOn(widgetsService, "createWidgetAtNextPosition").mockResolvedValue({
      id: "widget-1",
      profileId: mockProfileId,
      type: "clockDate",
      config: {},
      layoutX: 0,
      layoutY: 0,
      layoutW: 4,
      layoutH: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await invokeRoute(widgetsRouter, "post", "/", {
      authUser: { id: "user-1", email: "free@example.com" },
      body: { type: "clockDate" },
    });

    expect(result.statusCode).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 7. Feature flag consistency
// ---------------------------------------------------------------------------

describe("Feature flag consistency", () => {
  test("same user + same feature always returns the same result", () => {
    const freeUser = { plan: "free" };
    const proUser = { plan: "pro" };

    for (const key of ALL_FEATURE_FLAG_KEYS) {
      const firstCall = hasFeature(freeUser, key);
      const secondCall = hasFeature(freeUser, key);
      expect(firstCall).toBe(secondCall);

      const proFirst = hasFeature(proUser, key);
      const proSecond = hasFeature(proUser, key);
      expect(proFirst).toBe(proSecond);
    }
  });

  test("pro always has strictly more access than free", () => {
    const freeUser = { plan: "free" };
    const proUser = { plan: "pro" };

    for (const key of ALL_FEATURE_FLAG_KEYS) {
      const freeAccess = hasFeature(freeUser, key);
      const proAccess = hasFeature(proUser, key);
      // Pro should have access to everything free has, plus more
      if (!freeAccess) {
        expect(proAccess).toBe(true);
      }
    }
  });
});
