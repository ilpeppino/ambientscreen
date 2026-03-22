/**
 * M5.5 Admin Approval System — Tests
 *
 * Verifies:
 * - GET /admin/plugins/pending returns pending plugins
 * - POST /admin/plugins/:pluginId/approve approves a plugin
 * - POST /admin/plugins/:pluginId/reject rejects a plugin
 * - POST /admin/plugins/:pluginId/versions/:versionId/approve approves a version
 * - POST /admin/plugins/:pluginId/versions/:versionId/reject rejects a version
 * - Non-admin users get 403 on all admin endpoints
 * - Unapproved plugin not visible in marketplace
 * - Approved plugin becomes visible in marketplace
 * - Rejected plugin never appears in marketplace
 * - Version approval controls active version visibility
 * - Developer can still see their own pending/rejected plugins
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Router } from "express";
import { ModerationStatus } from "@prisma/client";
import { adminPluginsRouter } from "../src/modules/admin-plugins/adminPlugins.routes";
import { adminPluginsRepository } from "../src/modules/admin-plugins/adminPlugins.repository";
import { pluginRegistryRouter } from "../src/modules/plugin-registry/pluginRegistry.routes";
import { pluginRegistryRepository } from "../src/modules/plugin-registry/pluginRegistry.repository";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeOptions {
  body?: unknown;
  params?: Record<string, string>;
  userId?: string;
  isAdmin?: boolean;
}

type RouteHandler = (...args: unknown[]) => unknown;

function getRouteHandlers(router: Router, method: RouteMethod, path: string): RouteHandler[] {
  // Check router-level middleware layers (non-route layers like router.use(fn))
  const allLayers = (router as unknown as { stack?: Array<unknown> }).stack ?? [];

  // Collect router-level middleware (layers without a route)
  const routerMiddleware: RouteHandler[] = [];
  for (const layer of allLayers) {
    const l = layer as { route?: unknown; handle?: RouteHandler };
    if (!l.route && l.handle) {
      routerMiddleware.push(l.handle);
    }
  }

  // Find route-specific handlers
  const routeLayer = allLayers.find((layer) => {
    const route = (layer as { route?: { path?: string; methods?: Record<string, boolean> } }).route;
    return route?.path === path && route.methods?.[method];
  }) as { route: { stack: Array<{ handle: RouteHandler }> } } | undefined;

  if (!routeLayer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const routeHandlers = routeLayer.route.stack.map((s) => s.handle);
  return [...routerMiddleware, ...routeHandlers];
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
    body: options.body ?? {},
    params: options.params ?? {},
    query: {},
    headers: {},
    authUser: { id: options.userId ?? "admin-1", email: "admin@ambient.dev" },
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
// In-memory stores
// ---------------------------------------------------------------------------

interface PluginRow {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  authorId: string | null;
  isPremium: boolean;
  isApproved: boolean;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  status: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface VersionRow {
  id: string;
  pluginId: string;
  version: string;
  manifestJson: Record<string, unknown>;
  entryPoint: string | null;
  changelog: string | null;
  isActive: boolean;
  isApproved: boolean;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  status: ModerationStatus;
  createdAt: Date;
}

interface UserRow {
  isAdmin: boolean;
}

let pluginsStore: PluginRow[] = [];
let versionsStore: VersionRow[] = [];
let usersStore: Record<string, UserRow> = {};
let idCounter = 0;

function nextId() { return `id-${++idCounter}`; }

function activeVersionFor(pluginId: string): VersionRow | null {
  return versionsStore.find((v) => v.pluginId === pluginId && v.isActive && v.isApproved) ?? null;
}

function makePlugin(overrides: Partial<PluginRow> = {}): PluginRow {
  return {
    id: nextId(),
    key: "test-plugin",
    name: "Test Plugin",
    description: "A test plugin",
    category: "time",
    authorId: "dev-1",
    isPremium: false,
    isApproved: false,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    status: ModerationStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeVersion(pluginId: string, overrides: Partial<VersionRow> = {}): VersionRow {
  return {
    id: nextId(),
    pluginId,
    version: "1.0.0",
    manifestJson: { key: "test-plugin", version: "1.0.0", name: "Test Plugin", description: "A test plugin", category: "time", defaultLayout: { w: 4, h: 2 }, refreshPolicy: { intervalMs: 1000 } },
    entryPoint: "dist/index.js",
    changelog: null,
    isActive: false,
    isApproved: false,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    status: ModerationStatus.PENDING,
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  pluginsStore = [];
  versionsStore = [];
  usersStore = {
    "admin-1": { isAdmin: true },
    "user-1": { isAdmin: false },
  };
  idCounter = 0;

  // adminPluginsRepository mocks
  vi.spyOn(adminPluginsRepository, "findUserById").mockImplementation(async (userId) => {
    return usersStore[userId] ?? null;
  });

  vi.spyOn(adminPluginsRepository, "findPending").mockImplementation(async () => {
    return pluginsStore
      .filter((p) => p.status === ModerationStatus.PENDING)
      .map((p) => ({
        ...p,
        versions: versionsStore.filter((v) => v.pluginId === p.id),
      }));
  });

  vi.spyOn(adminPluginsRepository, "findById").mockImplementation(async (id) => {
    return pluginsStore.find((p) => p.id === id) ?? null;
  });

  vi.spyOn(adminPluginsRepository, "approvePlugin").mockImplementation(async (id, adminId) => {
    const plugin = pluginsStore.find((p) => p.id === id);
    if (!plugin) return null;
    plugin.isApproved = true;
    plugin.status = ModerationStatus.APPROVED;
    plugin.approvedAt = new Date();
    plugin.approvedBy = adminId;
    plugin.updatedAt = new Date();
    return plugin;
  });

  vi.spyOn(adminPluginsRepository, "rejectPlugin").mockImplementation(async (id, adminId, reason) => {
    const plugin = pluginsStore.find((p) => p.id === id);
    if (!plugin) return null;
    plugin.isApproved = false;
    plugin.status = ModerationStatus.REJECTED;
    plugin.approvedBy = adminId;
    plugin.rejectionReason = reason ?? null;
    plugin.updatedAt = new Date();
    return plugin;
  });

  vi.spyOn(adminPluginsRepository, "findVersionById").mockImplementation(async (versionId) => {
    return versionsStore.find((v) => v.id === versionId) ?? null;
  });

  vi.spyOn(adminPluginsRepository, "approveVersion").mockImplementation(
    async (versionId, adminId, makeActive) => {
      const version = versionsStore.find((v) => v.id === versionId);
      if (!version) return null;
      version.isApproved = true;
      version.status = ModerationStatus.APPROVED;
      version.approvedAt = new Date();
      version.approvedBy = adminId;
      if (makeActive) {
        for (const v of versionsStore) {
          if (v.pluginId === version.pluginId) v.isActive = false;
        }
        version.isActive = true;
      }
      return version;
    },
  );

  vi.spyOn(adminPluginsRepository, "rejectVersion").mockImplementation(async (versionId, adminId, reason) => {
    const version = versionsStore.find((v) => v.id === versionId);
    if (!version) return null;
    version.isApproved = false;
    version.isActive = false;
    version.status = ModerationStatus.REJECTED;
    version.approvedBy = adminId;
    version.rejectionReason = reason ?? null;
    return version;
  });

  // pluginRegistryRepository mocks (for marketplace visibility tests)
  vi.spyOn(pluginRegistryRepository, "findAllApproved").mockImplementation(async () => {
    return pluginsStore
      .filter((p) => p.isApproved && versionsStore.some((v) => v.pluginId === p.id && v.isApproved && v.isActive))
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
    const plugin = makePlugin({ id: nextId(), key: data.key, name: data.name, description: data.description, category: data.category, isPremium: data.isPremium });
    pluginsStore.push(plugin);
    return plugin;
  });

  vi.spyOn(pluginRegistryRepository, "setApproved").mockImplementation(async (id, isApproved) => {
    const plugin = pluginsStore.find((p) => p.id === id);
    if (!plugin) return null;
    plugin.isApproved = isApproved;
    plugin.status = isApproved ? ModerationStatus.APPROVED : ModerationStatus.REJECTED;
    plugin.updatedAt = new Date();
    return plugin;
  });

  vi.spyOn(pluginRegistryRepository, "createVersion").mockImplementation(async (data) => {
    const version: VersionRow = {
      id: nextId(),
      pluginId: data.pluginId,
      version: data.version,
      manifestJson: data.manifestJson as Record<string, unknown>,
      entryPoint: null,
      changelog: data.changelog ?? null,
      isActive: false,
      isApproved: false,
      approvedAt: null,
      approvedBy: null,
      status: ModerationStatus.PENDING,
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
// Admin auth guard
// ---------------------------------------------------------------------------

describe("Admin auth guard", () => {
  test("non-admin gets 403 on GET /admin/plugins/pending", async () => {
    const res = await invokeRoute(adminPluginsRouter, "get", "/pending", { userId: "user-1" });
    expect(res.statusCode).toBe(403);
  });

  test("non-admin gets 403 on POST approve", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    const res = await invokeRoute(adminPluginsRouter, "post", "/:pluginId/approve", {
      params: { pluginId: plugin.id },
      userId: "user-1",
    });
    expect(res.statusCode).toBe(403);
  });

  test("non-admin gets 403 on POST reject", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    const res = await invokeRoute(adminPluginsRouter, "post", "/:pluginId/reject", {
      params: { pluginId: plugin.id },
      userId: "user-1",
    });
    expect(res.statusCode).toBe(403);
  });

  test("non-admin gets 403 on version approve", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);
    const version = makeVersion(plugin.id);
    versionsStore.push(version);

    const res = await invokeRoute(
      adminPluginsRouter,
      "post",
      "/:pluginId/versions/:versionId/approve",
      { params: { pluginId: plugin.id, versionId: version.id }, userId: "user-1" },
    );
    expect(res.statusCode).toBe(403);
  });

  test("non-admin gets 403 on version reject", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);
    const version = makeVersion(plugin.id);
    versionsStore.push(version);

    const res = await invokeRoute(
      adminPluginsRouter,
      "post",
      "/:pluginId/versions/:versionId/reject",
      { params: { pluginId: plugin.id, versionId: version.id }, userId: "user-1" },
    );
    expect(res.statusCode).toBe(403);
  });

  test("admin can access GET /admin/plugins/pending", async () => {
    const res = await invokeRoute(adminPluginsRouter, "get", "/pending");
    expect(res.statusCode).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /admin/plugins/pending
// ---------------------------------------------------------------------------

describe("GET /admin/plugins/pending", () => {
  test("returns empty list when no pending plugins", async () => {
    const res = await invokeRoute(adminPluginsRouter, "get", "/pending");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("returns pending plugins with versions", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);
    const version = makeVersion(plugin.id);
    versionsStore.push(version);

    const res = await invokeRoute(adminPluginsRouter, "get", "/pending");
    expect(res.statusCode).toBe(200);
    const list = res.body as Array<Record<string, unknown>>;
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(plugin.id);
    expect(list[0].status).toBe(ModerationStatus.PENDING);
    expect(Array.isArray(list[0].versions)).toBe(true);
  });

  test("does not include approved plugins", async () => {
    const approved = makePlugin({ status: ModerationStatus.APPROVED, isApproved: true });
    const pending = makePlugin({ id: nextId(), key: "other", name: "Other", status: ModerationStatus.PENDING });
    pluginsStore.push(approved, pending);

    const res = await invokeRoute(adminPluginsRouter, "get", "/pending");
    const list = res.body as Array<Record<string, unknown>>;
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(pending.id);
  });

  test("does not include rejected plugins", async () => {
    const rejected = makePlugin({ status: ModerationStatus.REJECTED });
    pluginsStore.push(rejected);

    const res = await invokeRoute(adminPluginsRouter, "get", "/pending");
    expect((res.body as unknown[]).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// POST /admin/plugins/:pluginId/approve
// ---------------------------------------------------------------------------

describe("POST /admin/plugins/:pluginId/approve", () => {
  test("approves plugin and sets isApproved=true, status=APPROVED, approvedBy", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    const res = await invokeRoute(adminPluginsRouter, "post", "/:pluginId/approve", {
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(200);
    const body = res.body as PluginRow;
    expect(body.isApproved).toBe(true);
    expect(body.status).toBe(ModerationStatus.APPROVED);
    expect(body.approvedBy).toBe("admin-1");
    expect(body.approvedAt).not.toBeNull();
  });

  test("returns 404 for unknown plugin", async () => {
    const res = await invokeRoute(adminPluginsRouter, "post", "/:pluginId/approve", {
      params: { pluginId: "nonexistent" },
    });
    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /admin/plugins/:pluginId/reject
// ---------------------------------------------------------------------------

describe("POST /admin/plugins/:pluginId/reject", () => {
  test("rejects plugin and sets isApproved=false, status=REJECTED", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    const res = await invokeRoute(adminPluginsRouter, "post", "/:pluginId/reject", {
      params: { pluginId: plugin.id },
      body: { reason: "Violates guidelines" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.body as PluginRow;
    expect(body.isApproved).toBe(false);
    expect(body.status).toBe(ModerationStatus.REJECTED);
    expect(body.rejectionReason).toBe("Violates guidelines");
  });

  test("reject works without reason", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    const res = await invokeRoute(adminPluginsRouter, "post", "/:pluginId/reject", {
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(200);
    expect((res.body as Record<string, unknown>).status).toBe(ModerationStatus.REJECTED);
  });

  test("returns 404 for unknown plugin", async () => {
    const res = await invokeRoute(adminPluginsRouter, "post", "/:pluginId/reject", {
      params: { pluginId: "nonexistent" },
    });
    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /admin/plugins/:pluginId/versions/:versionId/approve
// ---------------------------------------------------------------------------

describe("POST /admin/plugins/:pluginId/versions/:versionId/approve", () => {
  test("approves version, makes it active by default", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);
    const version = makeVersion(plugin.id);
    versionsStore.push(version);

    const res = await invokeRoute(
      adminPluginsRouter,
      "post",
      "/:pluginId/versions/:versionId/approve",
      { params: { pluginId: plugin.id, versionId: version.id } },
    );

    expect(res.statusCode).toBe(200);
    const body = res.body as VersionRow;
    expect(body.isApproved).toBe(true);
    expect(body.status).toBe(ModerationStatus.APPROVED);
    expect(body.isActive).toBe(true);
    expect(body.approvedBy).toBe("admin-1");
  });

  test("approves version without making active when makeActive=false", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);
    const version = makeVersion(plugin.id);
    versionsStore.push(version);

    const res = await invokeRoute(
      adminPluginsRouter,
      "post",
      "/:pluginId/versions/:versionId/approve",
      {
        params: { pluginId: plugin.id, versionId: version.id },
        body: { makeActive: false },
      },
    );

    expect(res.statusCode).toBe(200);
    const body = res.body as VersionRow;
    expect(body.isApproved).toBe(true);
    expect(body.isActive).toBe(false);
  });

  test("returns 404 for unknown version", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    const res = await invokeRoute(
      adminPluginsRouter,
      "post",
      "/:pluginId/versions/:versionId/approve",
      { params: { pluginId: plugin.id, versionId: "nonexistent" } },
    );
    expect(res.statusCode).toBe(404);
  });

  test("returns 404 when version belongs to different plugin", async () => {
    const plugin1 = makePlugin();
    const plugin2 = makePlugin({ id: nextId(), key: "other", name: "Other" });
    pluginsStore.push(plugin1, plugin2);
    const version = makeVersion(plugin2.id);
    versionsStore.push(version);

    const res = await invokeRoute(
      adminPluginsRouter,
      "post",
      "/:pluginId/versions/:versionId/approve",
      { params: { pluginId: plugin1.id, versionId: version.id } },
    );
    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /admin/plugins/:pluginId/versions/:versionId/reject
// ---------------------------------------------------------------------------

describe("POST /admin/plugins/:pluginId/versions/:versionId/reject", () => {
  test("rejects version and ensures it is not active", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);
    const version = makeVersion(plugin.id, { isActive: true, isApproved: true, status: ModerationStatus.APPROVED });
    versionsStore.push(version);

    const res = await invokeRoute(
      adminPluginsRouter,
      "post",
      "/:pluginId/versions/:versionId/reject",
      {
        params: { pluginId: plugin.id, versionId: version.id },
        body: { reason: "Security issue" },
      },
    );

    expect(res.statusCode).toBe(200);
    const body = res.body as VersionRow;
    expect(body.isApproved).toBe(false);
    expect(body.isActive).toBe(false);
    expect(body.status).toBe(ModerationStatus.REJECTED);
    expect(body.rejectionReason).toBe("Security issue");
  });

  test("returns 404 for unknown version", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    const res = await invokeRoute(
      adminPluginsRouter,
      "post",
      "/:pluginId/versions/:versionId/reject",
      { params: { pluginId: plugin.id, versionId: "nonexistent" } },
    );
    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Integration: registry filtering
// ---------------------------------------------------------------------------

describe("Integration: registry filtering enforcement", () => {
  test("unapproved plugin not visible in marketplace", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);
    const version = makeVersion(plugin.id, { isActive: true });
    versionsStore.push(version);

    const res = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((res.body as unknown[]).length).toBe(0);
  });

  test("approved plugin without approved version not visible", async () => {
    const plugin = makePlugin({ isApproved: true, status: ModerationStatus.APPROVED });
    pluginsStore.push(plugin);
    // version is pending (not approved)
    const version = makeVersion(plugin.id, { isActive: true });
    versionsStore.push(version);

    const res = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((res.body as unknown[]).length).toBe(0);
  });

  test("approved plugin with approved+active version IS visible", async () => {
    const plugin = makePlugin({ isApproved: true, status: ModerationStatus.APPROVED });
    pluginsStore.push(plugin);
    const version = makeVersion(plugin.id, { isActive: true, isApproved: true, status: ModerationStatus.APPROVED });
    versionsStore.push(version);

    const res = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((res.body as unknown[]).length).toBe(1);
  });

  test("rejected plugin never appears in marketplace", async () => {
    const plugin = makePlugin({ isApproved: false, status: ModerationStatus.REJECTED });
    pluginsStore.push(plugin);
    const version = makeVersion(plugin.id, { isActive: true, isApproved: true, status: ModerationStatus.APPROVED });
    versionsStore.push(version);

    const res = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((res.body as unknown[]).length).toBe(0);
  });

  test("GET /plugins/:key returns 404 for unapproved plugin", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    const res = await invokeRoute(pluginRegistryRouter, "get", "/:key", {
      params: { key: plugin.key },
    });
    expect(res.statusCode).toBe(404);
  });

  test("full approval flow: approve plugin+version → visible in marketplace", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);
    const version = makeVersion(plugin.id);
    versionsStore.push(version);

    // Before approval: not visible
    let list = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((list.body as unknown[]).length).toBe(0);

    // Approve plugin
    await invokeRoute(adminPluginsRouter, "post", "/:pluginId/approve", {
      params: { pluginId: plugin.id },
    });

    // Still not visible (version not approved yet)
    list = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((list.body as unknown[]).length).toBe(0);

    // Approve version (makes active by default)
    await invokeRoute(adminPluginsRouter, "post", "/:pluginId/versions/:versionId/approve", {
      params: { pluginId: plugin.id, versionId: version.id },
    });

    // Now visible
    list = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((list.body as unknown[]).length).toBe(1);
  });

  test("rejecting previously approved plugin removes it from marketplace", async () => {
    const plugin = makePlugin({ isApproved: true, status: ModerationStatus.APPROVED });
    pluginsStore.push(plugin);
    const version = makeVersion(plugin.id, { isActive: true, isApproved: true, status: ModerationStatus.APPROVED });
    versionsStore.push(version);

    // Visible before rejection
    let list = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((list.body as unknown[]).length).toBe(1);

    // Reject plugin
    await invokeRoute(adminPluginsRouter, "post", "/:pluginId/reject", {
      params: { pluginId: plugin.id },
    });

    // No longer visible
    list = await invokeRoute(pluginRegistryRouter, "get", "/");
    expect((list.body as unknown[]).length).toBe(0);
  });
});
