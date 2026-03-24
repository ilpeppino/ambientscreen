/**
 * M5: Entitlement Enforcement — Integration Tests
 *
 * Acceptance criteria (issue #85):
 * - Free user → POST /plugins/:id/install → 403
 * - Pro user → POST /plugins/:id/install → 201
 * - Non-admin → GET /admin/plugins/pending → 403
 * - Free user → POST /widgets with premium widget type → 403
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Router } from "express";
import { pluginInstallationRouter } from "../src/modules/plugin-installation/pluginInstallation.routes";
import { pluginRegistryRepository } from "../src/modules/plugin-registry/pluginRegistry.repository";
import { pluginInstallationRepository } from "../src/modules/plugin-installation/pluginInstallation.repository";
import { usersService } from "../src/modules/users/users.service";
import { adminPluginsRouter } from "../src/modules/admin-plugins/adminPlugins.routes";
import { adminPluginsRepository } from "../src/modules/admin-plugins/adminPlugins.repository";
import { widgetsRouter } from "../src/modules/widgets/widgets.routes";
import { profilesService } from "../src/modules/profiles/profiles.service";
import { pluginInstallationService } from "../src/modules/plugin-installation/pluginInstallation.service";
import * as widgetPluginRegistry from "../src/modules/widgets/widgetPluginRegistry";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeOptions {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
  userId?: string;
  isAdmin?: boolean;
}

type RouteHandler = (...args: unknown[]) => unknown;

function getRouteHandlers(router: Router, method: RouteMethod, path: string): RouteHandler[] {
  const allLayers = (router as unknown as { stack?: Array<unknown> }).stack ?? [];

  const routerMiddleware: RouteHandler[] = [];
  for (const layer of allLayers) {
    const l = layer as { route?: unknown; handle?: RouteHandler };
    if (!l.route && l.handle) {
      routerMiddleware.push(l.handle);
    }
  }

  const routeLayer = allLayers.find((layer) => {
    const route = (layer as { route?: { path?: string; methods?: Record<string, boolean> } }).route;
    return route?.path === path && route.methods?.[method];
  }) as { route: { stack: Array<{ handle: RouteHandler }> } } | undefined;

  if (!routeLayer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  // Use only the last route handler to skip inline middleware (e.g. rate limiters).
  const lastHandler = routeLayer.route.stack[routeLayer.route.stack.length - 1].handle;
  return [...routerMiddleware, lastHandler];
}

async function invokeRoute(
  router: Router,
  method: RouteMethod,
  path: string,
  options: InvokeOptions = {},
) {
  const handlers = getRouteHandlers(router, method, path);

  const req: Record<string, unknown> = {
    method: method.toUpperCase(),
    path,
    originalUrl: path,
    body: options.body ?? {},
    params: options.params ?? {},
    query: options.query ?? {},
    headers: {},
    authUser: { id: options.userId ?? "user-1", email: "user@ambient.dev" },
  };

  const response = { statusCode: 200, body: null as unknown };

  const res = {
    status(code: number) { response.statusCode = code; return res; },
    json(body: unknown) { response.body = body; return res; },
    send() { return res; },
  };

  let idx = 0;
  async function callNext(error?: unknown): Promise<void> {
    if (error) {
      globalErrorMiddleware(error, req as never, res as never, (() => undefined) as never);
      return;
    }
    if (idx < handlers.length) {
      const h = handlers[idx++];
      await h(req, res, callNext);
    }
  }

  await callNext();

  return response;
}

// ---------------------------------------------------------------------------
// Shared mock helpers
// ---------------------------------------------------------------------------

function mockApprovedPlugin(pluginId = "plugin-1") {
  vi.spyOn(pluginRegistryRepository, "findById").mockResolvedValue({
    id: pluginId,
    key: "test-plugin",
    name: "Test Plugin",
    description: "A test plugin",
    category: "time",
    isPremium: false,
    isApproved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function mockNoExistingInstallation() {
  vi.spyOn(pluginInstallationRepository, "findByUserAndPlugin").mockResolvedValue(null);
}

function mockInstallationCreate(pluginId = "plugin-1") {
  vi.spyOn(pluginInstallationRepository, "create").mockResolvedValue({
    id: "install-1",
    userId: "user-1",
    pluginId,
    isEnabled: true,
    installedAt: new Date(),
    updatedAt: new Date(),
  });
}

// ---------------------------------------------------------------------------
// 1. Plugin installation entitlement enforcement
// ---------------------------------------------------------------------------

describe("POST /plugins/:pluginId/install — entitlement enforcement", () => {
  afterEach(() => vi.restoreAllMocks());

  test("free user cannot install a marketplace plugin → 403", async () => {
    vi.spyOn(usersService, "findUserById").mockResolvedValue({
      id: "user-1",
      email: "free@ambient.dev",
      passwordHash: "hash",
      plan: "free",
      isAdmin: false,
      createdAt: new Date(),
      activeProfileId: null,
    });
    mockApprovedPlugin();
    mockNoExistingInstallation();

    const res = await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: "plugin-1" },
      userId: "user-1",
    });

    expect(res.statusCode).toBe(403);
  });

  test("pro user can install an approved marketplace plugin → 201", async () => {
    vi.spyOn(usersService, "findUserById").mockResolvedValue({
      id: "user-2",
      email: "pro@ambient.dev",
      passwordHash: "hash",
      plan: "pro",
      isAdmin: false,
      createdAt: new Date(),
      activeProfileId: null,
    });
    mockApprovedPlugin();
    mockNoExistingInstallation();
    mockInstallationCreate();

    const res = await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: "plugin-1" },
      userId: "user-2",
    });

    expect(res.statusCode).toBe(201);
    expect((res.body as Record<string, unknown>).isEnabled).toBe(true);
  });

  test("returns 404 when user is not found", async () => {
    vi.spyOn(usersService, "findUserById").mockResolvedValue(null);

    const res = await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: "plugin-1" },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 2. Admin-only routes enforce non-admin guard
// ---------------------------------------------------------------------------

describe("Admin-only routes — non-admin guard", () => {
  beforeEach(() => {
    vi.spyOn(adminPluginsRepository, "findUserById").mockImplementation(async (userId) => {
      if (userId === "admin-1") return { isAdmin: true };
      return { isAdmin: false };
    });
    vi.spyOn(adminPluginsRepository, "findPending").mockResolvedValue([]);
  });

  afterEach(() => vi.restoreAllMocks());

  test("non-admin → GET /admin/plugins/pending → 403", async () => {
    const res = await invokeRoute(adminPluginsRouter, "get", "/pending", { userId: "user-1" });
    expect(res.statusCode).toBe(403);
  });

  test("admin → GET /admin/plugins/pending → 200", async () => {
    const res = await invokeRoute(adminPluginsRouter, "get", "/pending", { userId: "admin-1" });
    expect(res.statusCode).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 3. Premium widget creation blocked for free users
// ---------------------------------------------------------------------------

describe("POST /widgets — premium widget blocked for free users", () => {
  const mockProfileId = "profile-abc";

  beforeEach(() => {
    vi.spyOn(profilesService, "resolveProfileForUser").mockResolvedValue({
      id: mockProfileId,
      userId: "user-1",
      name: "Default",
      isDefault: true,
      createdAt: new Date(),
    });
    vi.spyOn(pluginInstallationService, "assertPluginInstalledAndEnabled").mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  test("free user cannot create a premium widget → 403", async () => {
    vi.spyOn(usersService, "findUserById").mockResolvedValue({
      id: "user-1",
      email: "free@ambient.dev",
      passwordHash: "hash",
      plan: "free",
      isAdmin: false,
      createdAt: new Date(),
      activeProfileId: null,
    });
    vi.spyOn(widgetPluginRegistry, "getWidgetPlugin").mockReturnValue({
      manifest: {
        key: "clockDate",
        name: "Clock / Date",
        description: "Time widget",
        category: "time",
        premium: true,
        defaultLayout: { w: 4, h: 2 },
        refreshPolicy: { intervalMs: 60000 },
      },
      configSchema: {},
      defaultConfig: {},
      api: { resolveData: async () => ({ state: "ready" as const, data: {} }) },
    } as ReturnType<typeof widgetPluginRegistry.getWidgetPlugin>);

    const res = await invokeRoute(widgetsRouter, "post", "/", {
      userId: "user-1",
      body: { type: "clockDate" },
    });

    expect(res.statusCode).toBe(403);
  });

  test("pro user can create a premium widget → 201", async () => {
    vi.spyOn(usersService, "findUserById").mockResolvedValue({
      id: "user-2",
      email: "pro@ambient.dev",
      passwordHash: "hash",
      plan: "pro",
      isAdmin: false,
      createdAt: new Date(),
      activeProfileId: null,
    });
    vi.spyOn(widgetPluginRegistry, "getWidgetPlugin").mockReturnValue({
      manifest: {
        key: "clockDate",
        name: "Clock / Date",
        description: "Time widget",
        category: "time",
        premium: true,
        defaultLayout: { w: 4, h: 2 },
        refreshPolicy: { intervalMs: 60000 },
      },
      configSchema: {},
      defaultConfig: {},
      api: { resolveData: async () => ({ state: "ready" as const, data: {} }) },
    } as ReturnType<typeof widgetPluginRegistry.getWidgetPlugin>);
    vi.spyOn(widgetsRouter as unknown as { handle: (...args: unknown[]) => unknown }, "handle");
    // Mock the widgets service to skip DB interaction
    const { widgetsService } = await import("../src/modules/widgets/widgets.service");
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

    const res = await invokeRoute(widgetsRouter, "post", "/", {
      userId: "user-2",
      body: { type: "clockDate" },
    });

    expect(res.statusCode).toBe(201);
  });

  test("free user can create a non-premium widget → 201", async () => {
    vi.spyOn(usersService, "findUserById").mockResolvedValue({
      id: "user-1",
      email: "free@ambient.dev",
      passwordHash: "hash",
      plan: "free",
      isAdmin: false,
      createdAt: new Date(),
      activeProfileId: null,
    });
    // getWidgetPlugin returns a non-premium plugin (default behavior)
    vi.spyOn(widgetPluginRegistry, "getWidgetPlugin").mockReturnValue({
      manifest: {
        key: "clockDate",
        name: "Clock / Date",
        description: "Time widget",
        category: "time",
        premium: false,
        defaultLayout: { w: 4, h: 2 },
        refreshPolicy: { intervalMs: 60000 },
      },
      configSchema: {},
      defaultConfig: {},
      api: { resolveData: async () => ({ state: "ready" as const, data: {} }) },
    } as ReturnType<typeof widgetPluginRegistry.getWidgetPlugin>);
    const { widgetsService } = await import("../src/modules/widgets/widgets.service");
    vi.spyOn(widgetsService, "createWidgetAtNextPosition").mockResolvedValue({
      id: "widget-2",
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

    const res = await invokeRoute(widgetsRouter, "post", "/", {
      userId: "user-1",
      body: { type: "clockDate" },
    });

    expect(res.statusCode).toBe(201);
  });
});
