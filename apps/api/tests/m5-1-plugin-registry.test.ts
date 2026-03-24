/**
 * M5.1 Plugin Registry Service — Tests
 *
 * Verifies:
 * - POST /plugins creates plugin metadata
 * - POST /plugins/:id/versions adds a new version
 * - PATCH /plugins/:id/approve sets isApproved
 * - GET /plugins returns only approved plugins
 * - GET /plugins/:key returns plugin with active version
 * - GET /plugins/:key returns 404 for non-approved plugin
 * - Duplicate plugin key is rejected (409)
 * - Duplicate version is rejected (409)
 * - Invalid semver is rejected (400)
 * - Invalid manifest is rejected (400)
 * - Integration: create → version → approve → visible in list
 * - Integration: non-approved plugin not visible publicly
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Router } from "express";
import { pluginRegistryRouter } from "../src/modules/plugin-registry/pluginRegistry.routes";
import { pluginRegistryRepository } from "../src/modules/plugin-registry/pluginRegistry.repository";
import { adminPluginsRepository } from "../src/modules/admin-plugins/adminPlugins.repository";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeOptions {
  body?: unknown;
  params?: Record<string, string>;
}

function getRouteLayer(router: Router, method: RouteMethod, path: string) {
  const routeLayer = (router as unknown as { stack?: Array<unknown> }).stack?.find((layer) => {
    const route = (layer as { route?: { path?: string; methods?: Record<string, boolean> } }).route;
    return route?.path === path && route.methods?.[method];
  }) as { route: { stack: Array<{ handle: (...args: unknown[]) => unknown }> } } | undefined;

  if (!routeLayer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  return routeLayer;
}

// Returns only the final business-logic handler, skipping middleware (e.g. requireAdmin).
function getRouteHandler(router: Router, method: RouteMethod, path: string) {
  const layer = getRouteLayer(router, method, path);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

// Returns all handlers in the route stack (middleware + final handler).
function getAllRouteHandlers(router: Router, method: RouteMethod, path: string) {
  const layer = getRouteLayer(router, method, path);
  return layer.route.stack.map((l) => l.handle);
}

async function invokeRouteWithMiddleware(
  router: Router,
  method: RouteMethod,
  path: string,
  options: InvokeOptions & { userId?: string } = {},
) {
  const handlers = getAllRouteHandlers(router, method, path);

  const req: Record<string, unknown> = {
    method: method.toUpperCase(),
    path,
    body: options.body ?? {},
    params: options.params ?? {},
    query: {},
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
    body: options.body ?? {},
    params: options.params ?? {},
    query: {},
    headers: {},
    authUser: { id: "user-1", email: "admin@ambient.dev" },
  };

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
// In-memory store
// ---------------------------------------------------------------------------

interface PluginRow {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  isPremium: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface VersionRow {
  id: string;
  pluginId: string;
  version: string;
  manifestJson: Record<string, unknown>;
  entryPoint: string;
  changelog: string | null;
  isActive: boolean;
  createdAt: Date;
}

let pluginsStore: PluginRow[] = [];
let versionsStore: VersionRow[] = [];
let idCounter = 0;

function nextId() {
  return `id-${++idCounter}`;
}

function activeVersionFor(pluginId: string): VersionRow | null {
  return versionsStore.find((v) => v.pluginId === pluginId && v.isActive) ?? null;
}

function toRecord(plugin: PluginRow, includeActive = true) {
  return {
    ...plugin,
    activeVersion: includeActive ? activeVersionFor(plugin.id) : null,
    versions: undefined,
  };
}

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  pluginsStore = [];
  versionsStore = [];
  idCounter = 0;

  vi.spyOn(pluginRegistryRepository, "findAllApproved").mockImplementation(async () => {
    return pluginsStore
      .filter((p) => p.isApproved)
      .map((p) => ({ ...p, activeVersion: activeVersionFor(p.id) }));
  });

  vi.spyOn(pluginRegistryRepository, "findByKey").mockImplementation(async (key) => {
    const p = pluginsStore.find((x) => x.key === key) ?? null;
    if (!p) return null;
    return { ...p, activeVersion: activeVersionFor(p.id) };
  });

  vi.spyOn(pluginRegistryRepository, "findById").mockImplementation(async (id) => {
    return pluginsStore.find((p) => p.id === id) ?? null;
  });

  vi.spyOn(pluginRegistryRepository, "create").mockImplementation(async (data) => {
    const plugin: PluginRow = {
      id: nextId(),
      key: data.key,
      name: data.name,
      description: data.description,
      category: data.category,
      isPremium: data.isPremium,
      isApproved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    pluginsStore.push(plugin);
    return plugin;
  });

  vi.spyOn(pluginRegistryRepository, "setApproved").mockImplementation(async (id, isApproved) => {
    const plugin = pluginsStore.find((p) => p.id === id);
    if (!plugin) return null;
    plugin.isApproved = isApproved;
    plugin.updatedAt = new Date();
    return plugin;
  });

  vi.spyOn(pluginRegistryRepository, "createVersion").mockImplementation(async (data) => {
    const version: VersionRow = {
      id: nextId(),
      pluginId: data.pluginId,
      version: data.version,
      manifestJson: data.manifestJson as Record<string, unknown>,
      entryPoint: data.entryPoint,
      changelog: data.changelog ?? null,
      isActive: false,
      createdAt: new Date(),
    };
    versionsStore.push(version);
    return version;
  });

  vi.spyOn(pluginRegistryRepository, "findVersionByPluginAndVersion").mockImplementation(
    async (pluginId, version) => {
      return versionsStore.find((v) => v.pluginId === pluginId && v.version === version) ?? null;
    },
  );

  vi.spyOn(pluginRegistryRepository, "setActiveVersion").mockImplementation(
    async (pluginId, versionId) => {
      for (const v of versionsStore) {
        if (v.pluginId === pluginId) v.isActive = false;
      }
      const target = versionsStore.find((v) => v.id === versionId);
      if (target) target.isActive = true;
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validManifest = {
  key: "clock-date",
  version: "1.0.0",
  name: "Clock / Date",
  description: "Shows the current time and date",
  category: "time",
  defaultLayout: { w: 4, h: 2 },
  refreshPolicy: { intervalMs: 1000 },
};

const pluginBody = {
  key: "clock-date",
  name: "Clock / Date",
  description: "Shows the current time and date",
  category: "time",
  isPremium: false,
};

const versionBody = {
  version: "1.0.0",
  manifestJson: validManifest,
  entryPoint: "dist/index.js",
  setActive: true,
};

// ---------------------------------------------------------------------------
// POST /plugins
// ---------------------------------------------------------------------------

describe("POST /plugins — create plugin", () => {
  test("creates a plugin and returns 201", async () => {
    const res = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    expect(res.statusCode).toBe(201);
    const body = res.body as PluginRow;
    expect(body.key).toBe("clock-date");
    expect(body.isApproved).toBe(false);
  });

  test("returns 409 for duplicate key", async () => {
    await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const res = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    expect(res.statusCode).toBe(409);
  });

  test("returns 400 for missing required fields", async () => {
    const res = await invokeRoute(pluginRegistryRouter, "post", "/", {
      body: { key: "x" },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /plugins/:id/versions
// ---------------------------------------------------------------------------

describe("POST /plugins/:id/versions — add version", () => {
  test("adds a version to an existing plugin and returns 201", async () => {
    const createRes = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginRegistryRouter, "post", "/:id/versions", {
      body: versionBody,
      params: { id: plugin.id },
    });
    expect(res.statusCode).toBe(201);
    const body = res.body as VersionRow;
    expect(body.version).toBe("1.0.0");
    expect(body.isActive).toBe(true);
  });

  test("returns 404 for unknown plugin id", async () => {
    const res = await invokeRoute(pluginRegistryRouter, "post", "/:id/versions", {
      body: versionBody,
      params: { id: "nonexistent" },
    });
    expect(res.statusCode).toBe(404);
  });

  test("returns 409 for duplicate version", async () => {
    const createRes = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    await invokeRoute(pluginRegistryRouter, "post", "/:id/versions", {
      body: versionBody,
      params: { id: plugin.id },
    });

    const res = await invokeRoute(pluginRegistryRouter, "post", "/:id/versions", {
      body: versionBody,
      params: { id: plugin.id },
    });
    expect(res.statusCode).toBe(409);
  });

  test("returns 400 for invalid semver", async () => {
    const createRes = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginRegistryRouter, "post", "/:id/versions", {
      body: { ...versionBody, version: "not-a-version" },
      params: { id: plugin.id },
    });
    expect(res.statusCode).toBe(400);
  });

  test("returns 400 for manifest missing required fields", async () => {
    const createRes = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginRegistryRouter, "post", "/:id/versions", {
      body: { version: "1.0.0", manifestJson: { key: "x" } },
      params: { id: plugin.id },
    });
    expect(res.statusCode).toBe(400);
  });

  test("returns 400 when entryPoint is missing", async () => {
    const createRes = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const { entryPoint: _, ...bodyWithoutEntry } = versionBody;
    const res = await invokeRoute(pluginRegistryRouter, "post", "/:id/versions", {
      body: bodyWithoutEntry,
      params: { id: plugin.id },
    });
    expect(res.statusCode).toBe(400);
  });

  test("stores entryPoint on created version", async () => {
    const createRes = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginRegistryRouter, "post", "/:id/versions", {
      body: versionBody,
      params: { id: plugin.id },
    });
    expect(res.statusCode).toBe(201);
    expect((res.body as VersionRow).entryPoint).toBe("dist/index.js");
  });
});

// ---------------------------------------------------------------------------
// PATCH /plugins/:id/approve
// ---------------------------------------------------------------------------

describe("PATCH /plugins/:id/approve — set approval", () => {
  test("approves a plugin", async () => {
    const createRes = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginRegistryRouter, "patch", "/:id/approve", {
      body: { isApproved: true },
      params: { id: plugin.id },
    });
    expect(res.statusCode).toBe(200);
    expect((res.body as PluginRow).isApproved).toBe(true);
  });

  test("un-approves a plugin", async () => {
    const createRes = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    await invokeRoute(pluginRegistryRouter, "patch", "/:id/approve", {
      body: { isApproved: true },
      params: { id: plugin.id },
    });

    const res = await invokeRoute(pluginRegistryRouter, "patch", "/:id/approve", {
      body: { isApproved: false },
      params: { id: plugin.id },
    });
    expect(res.statusCode).toBe(200);
    expect((res.body as PluginRow).isApproved).toBe(false);
  });

  test("returns 400 when isApproved is not a boolean", async () => {
    const createRes = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginRegistryRouter, "patch", "/:id/approve", {
      body: { isApproved: "yes" },
      params: { id: plugin.id },
    });
    expect(res.statusCode).toBe(400);
  });

  test("returns 404 for unknown plugin", async () => {
    const res = await invokeRoute(pluginRegistryRouter, "patch", "/:id/approve", {
      body: { isApproved: true },
      params: { id: "nonexistent" },
    });
    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /plugins — list approved
// ---------------------------------------------------------------------------

describe("GET /plugins — list approved plugins", () => {
  test("returns empty list when no plugins exist", async () => {
    const res = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("returns only approved plugins", async () => {
    const r1 = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const p1 = r1.body as PluginRow;

    const r2 = await invokeRoute(pluginRegistryRouter, "post", "/", {
      body: { ...pluginBody, key: "weather", name: "Weather" },
    });
    const p2 = r2.body as PluginRow;

    // approve only p2
    await invokeRoute(pluginRegistryRouter, "patch", "/:id/approve", {
      body: { isApproved: true },
      params: { id: p2.id },
    });

    const res = await invokeRoute(pluginRegistryRouter, "get", "/");
    const list = res.body as PluginRow[];
    expect(list.length).toBe(1);
    expect(list[0].key).toBe("weather");

    void p1; // p1 is not approved — must not appear
  });

  test("returns correct fields for approved plugins", async () => {
    const r = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = r.body as PluginRow;

    await invokeRoute(pluginRegistryRouter, "patch", "/:id/approve", {
      body: { isApproved: true },
      params: { id: plugin.id },
    });

    const res = await invokeRoute(pluginRegistryRouter, "get", "/");
    const list = res.body as Array<Record<string, unknown>>;
    expect(list[0]).toMatchObject({
      key: "clock-date",
      name: "Clock / Date",
      description: "Shows the current time and date",
      category: "time",
      isPremium: false,
    });
  });
});

// ---------------------------------------------------------------------------
// GET /plugins/:key — get plugin details
// ---------------------------------------------------------------------------

describe("GET /plugins/:key — get plugin by key", () => {
  test("returns 404 for non-existent plugin", async () => {
    const res = await invokeRoute(pluginRegistryRouter, "get", "/:key", {
      params: { key: "nonexistent" },
    });
    expect(res.statusCode).toBe(404);
  });

  test("returns 404 for non-approved plugin", async () => {
    await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const res = await invokeRoute(pluginRegistryRouter, "get", "/:key", {
      params: { key: "clock-date" },
    });
    expect(res.statusCode).toBe(404);
  });

  test("returns plugin with active version for approved plugin", async () => {
    const r = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = r.body as PluginRow;

    await invokeRoute(pluginRegistryRouter, "post", "/:id/versions", {
      body: versionBody,
      params: { id: plugin.id },
    });

    await invokeRoute(pluginRegistryRouter, "patch", "/:id/approve", {
      body: { isApproved: true },
      params: { id: plugin.id },
    });

    const res = await invokeRoute(pluginRegistryRouter, "get", "/:key", {
      params: { key: "clock-date" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.key).toBe("clock-date");
    expect(body.activeVersion).not.toBeNull();
    expect((body.activeVersion as Record<string, unknown>).version).toBe("1.0.0");
  });

  test("returns null activeVersion when no active version exists", async () => {
    const r = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    const plugin = r.body as PluginRow;

    await invokeRoute(pluginRegistryRouter, "patch", "/:id/approve", {
      body: { isApproved: true },
      params: { id: plugin.id },
    });

    const res = await invokeRoute(pluginRegistryRouter, "get", "/:key", {
      params: { key: "clock-date" },
    });

    expect(res.statusCode).toBe(200);
    expect((res.body as Record<string, unknown>).activeVersion).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration: full lifecycle
// ---------------------------------------------------------------------------

describe("Integration: plugin lifecycle", () => {
  test("create → add version → approve → visible in list with active version", async () => {
    // 1. create
    const createRes = await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });
    expect(createRes.statusCode).toBe(201);
    const plugin = createRes.body as PluginRow;

    // 2. not visible in list yet (not approved)
    let list = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((list.body as unknown[]).length).toBe(0);

    // 3. add version
    await invokeRoute(pluginRegistryRouter, "post", "/:id/versions", {
      body: versionBody,
      params: { id: plugin.id },
    });

    // 4. still not visible (not approved)
    list = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((list.body as unknown[]).length).toBe(0);

    // 5. approve
    await invokeRoute(pluginRegistryRouter, "patch", "/:id/approve", {
      body: { isApproved: true },
      params: { id: plugin.id },
    });

    // 6. now visible with active version
    list = await invokeRoute(pluginRegistryRouter, "get", "/");
    const items = list.body as Array<Record<string, unknown>>;
    expect(items.length).toBe(1);
    expect(items[0].key).toBe("clock-date");
    expect(items[0].activeVersion).not.toBeNull();
  });

  test("non-approved plugin is not visible publicly", async () => {
    await invokeRoute(pluginRegistryRouter, "post", "/", { body: pluginBody });

    const res = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((res.body as unknown[]).length).toBe(0);

    const detail = await invokeRoute(pluginRegistryRouter, "get", "/:key", {
      params: { key: "clock-date" },
    });
    expect(detail.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Admin guard — write endpoints require admin (#74)
// ---------------------------------------------------------------------------

describe("Admin guard — write endpoints require admin role", () => {
  beforeEach(() => {
    vi.spyOn(adminPluginsRepository, "findUserById").mockImplementation(async (userId) => {
      if (userId === "admin-1") return { isAdmin: true };
      return { isAdmin: false };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  test("POST / — non-admin user → 403", async () => {
    const res = await invokeRouteWithMiddleware(pluginRegistryRouter, "post", "/", {
      body: pluginBody,
      userId: "user-1",
    });
    expect(res.statusCode).toBe(403);
  });

  test("POST /:id/versions — non-admin user → 403", async () => {
    const res = await invokeRouteWithMiddleware(pluginRegistryRouter, "post", "/:id/versions", {
      body: versionBody,
      params: { id: "some-id" },
      userId: "user-1",
    });
    expect(res.statusCode).toBe(403);
  });

  test("PATCH /:id/approve — non-admin user → 403", async () => {
    const res = await invokeRouteWithMiddleware(pluginRegistryRouter, "patch", "/:id/approve", {
      body: { isApproved: true },
      params: { id: "some-id" },
      userId: "user-1",
    });
    expect(res.statusCode).toBe(403);
  });

  test("POST / — admin user → guard passes (not rejected)", async () => {
    const res = await invokeRouteWithMiddleware(pluginRegistryRouter, "post", "/", {
      body: pluginBody,
      userId: "admin-1",
    });
    // Guard passes for admin — request is not rejected with 403
    expect(res.statusCode).not.toBe(403);
  });
});
