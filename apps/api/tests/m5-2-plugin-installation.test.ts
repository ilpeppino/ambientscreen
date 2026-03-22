/**
 * M5.2 Plugin Installation System — Tests
 *
 * Verifies:
 * - POST /plugins/:pluginId/install — install approved plugin
 * - POST /plugins/:pluginId/install — rejected for unapproved plugin
 * - POST /plugins/:pluginId/install — rejected for duplicate install
 * - POST /plugins/:pluginId/install — rejected for unknown plugin
 * - DELETE /plugins/:pluginId/install — uninstall
 * - DELETE /plugins/:pluginId/install — rejected for non-installed plugin
 * - PATCH /plugins/:pluginId/install — enable/disable
 * - PATCH /plugins/:pluginId/install — rejected for unknown installation
 * - PATCH /plugins/:pluginId/install — rejected for invalid body
 * - GET /me/plugins — returns installed plugins with metadata
 * - GET /me/plugins — returns empty list for new user
 * - Integration: install → appears in list → disable → re-enable → uninstall
 * - Integration: cannot create widget for non-installed plugin (403)
 * - Integration: cannot create widget for disabled plugin (403)
 * - Integration: can create widget for installed+enabled plugin (passes check)
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Router } from "express";
import { pluginInstallationRouter, mePluginsRouter } from "../src/modules/plugin-installation/pluginInstallation.routes";
import { pluginInstallationRepository } from "../src/modules/plugin-installation/pluginInstallation.repository";
import { pluginRegistryRepository } from "../src/modules/plugin-registry/pluginRegistry.repository";
import { pluginInstallationService } from "../src/modules/plugin-installation/pluginInstallation.service";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeOptions {
  body?: unknown;
  params?: Record<string, string>;
  userId?: string;
}

function getRouteHandler(router: Router, method: RouteMethod, path: string) {
  const routeLayer = (router as unknown as { stack?: Array<unknown> }).stack?.find((layer) => {
    const route = (layer as { route?: { path?: string; methods?: Record<string, boolean> } }).route;
    return route?.path === path && route.methods?.[method];
  }) as { route: { stack: Array<{ handle: (...args: unknown[]) => unknown }> } } | undefined;

  if (!routeLayer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  // Use the last handler in the stack — earlier entries may be rate-limit middleware.
  return routeLayer.route.stack[routeLayer.route.stack.length - 1].handle;
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
    authUser: { id: options.userId ?? "user-1", email: "test@ambient.dev" },
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
  isActive: boolean;
}

interface InstallRow {
  id: string;
  userId: string;
  pluginId: string;
  isEnabled: boolean;
  installedAt: Date;
  updatedAt: Date;
}

let pluginsStore: PluginRow[] = [];
let versionsStore: VersionRow[] = [];
let installsStore: InstallRow[] = [];
let idCounter = 0;

function nextId() { return `id-${++idCounter}`; }

function makePlugin(overrides: Partial<PluginRow> = {}): PluginRow {
  return {
    id: nextId(),
    key: "clock-date",
    name: "Clock / Date",
    description: "Time widget",
    category: "time",
    isPremium: false,
    isApproved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  pluginsStore = [];
  versionsStore = [];
  installsStore = [];
  idCounter = 0;

  // Mock plugin registry repo
  vi.spyOn(pluginRegistryRepository, "findById").mockImplementation(async (id) => {
    return pluginsStore.find((p) => p.id === id) ?? null;
  });

  vi.spyOn(pluginRegistryRepository, "findByKey").mockImplementation(async (key) => {
    const p = pluginsStore.find((x) => x.key === key) ?? null;
    if (!p) return null;
    const activeVersion = versionsStore.find((v) => v.pluginId === p.id && v.isActive) ?? null;
    return { ...p, activeVersion };
  });

  // Mock installation repo
  vi.spyOn(pluginInstallationRepository, "findByUserAndPlugin").mockImplementation(
    async (userId, pluginId) => {
      return installsStore.find((i) => i.userId === userId && i.pluginId === pluginId) ?? null;
    },
  );

  vi.spyOn(pluginInstallationRepository, "findAllForUser").mockImplementation(async (userId) => {
    const userInstalls = installsStore.filter((i) => i.userId === userId);
    return userInstalls.map((i) => {
      const plugin = pluginsStore.find((p) => p.id === i.pluginId)!;
      const activeVersion = versionsStore.find((v) => v.pluginId === plugin.id && v.isActive) ?? undefined;
      return {
        ...i,
        plugin: {
          ...plugin,
          versions: activeVersion ? [activeVersion] : [],
        },
      };
    });
  });

  vi.spyOn(pluginInstallationRepository, "create").mockImplementation(async (data) => {
    const record: InstallRow = {
      id: nextId(),
      userId: data.userId,
      pluginId: data.pluginId,
      isEnabled: true,
      installedAt: new Date(),
      updatedAt: new Date(),
    };
    installsStore.push(record);
    return record;
  });

  vi.spyOn(pluginInstallationRepository, "delete").mockImplementation(async (userId, pluginId) => {
    const index = installsStore.findIndex((i) => i.userId === userId && i.pluginId === pluginId);
    if (index === -1) return null;
    return installsStore.splice(index, 1)[0];
  });

  vi.spyOn(pluginInstallationRepository, "updateEnabled").mockImplementation(
    async (userId, pluginId, isEnabled) => {
      const record = installsStore.find((i) => i.userId === userId && i.pluginId === pluginId);
      if (!record) return null;
      record.isEnabled = isEnabled;
      record.updatedAt = new Date();
      return record;
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// POST /:pluginId/install
// ---------------------------------------------------------------------------

describe("POST /:pluginId/install — install plugin", () => {
  test("installs an approved plugin and returns 201", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    const res = await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(201);
    const body = res.body as InstallRow;
    expect(body.pluginId).toBe(plugin.id);
    expect(body.isEnabled).toBe(true);
  });

  test("returns 403 for unapproved plugin", async () => {
    const plugin = makePlugin({ isApproved: false });
    pluginsStore.push(plugin);

    const res = await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(403);
  });

  test("returns 409 for duplicate install", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });

    const res = await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(409);
  });

  test("returns 404 for unknown plugin", async () => {
    const res = await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: "nonexistent" },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /:pluginId/install
// ---------------------------------------------------------------------------

describe("DELETE /:pluginId/install — uninstall plugin", () => {
  test("uninstalls an installed plugin and returns 204", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });

    const res = await invokeRoute(pluginInstallationRouter, "delete", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(204);
    expect(installsStore.length).toBe(0);
  });

  test("returns 404 when plugin is not installed", async () => {
    const res = await invokeRoute(pluginInstallationRouter, "delete", "/:pluginId/install", {
      params: { pluginId: "nonexistent" },
    });

    expect(res.statusCode).toBe(404);
  });

  test("user can only uninstall their own installation", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    // user-1 installs
    await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
      userId: "user-1",
    });

    // user-2 tries to uninstall → 404 (not their install)
    const res = await invokeRoute(pluginInstallationRouter, "delete", "/:pluginId/install", {
      params: { pluginId: plugin.id },
      userId: "user-2",
    });

    expect(res.statusCode).toBe(404);
    expect(installsStore.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// PATCH /:pluginId/install
// ---------------------------------------------------------------------------

describe("PATCH /:pluginId/install — enable/disable plugin", () => {
  test("disables an installed plugin", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });

    const res = await invokeRoute(pluginInstallationRouter, "patch", "/:pluginId/install", {
      params: { pluginId: plugin.id },
      body: { isEnabled: false },
    });

    expect(res.statusCode).toBe(200);
    expect((res.body as InstallRow).isEnabled).toBe(false);
  });

  test("re-enables a disabled plugin", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });
    await invokeRoute(pluginInstallationRouter, "patch", "/:pluginId/install", {
      params: { pluginId: plugin.id },
      body: { isEnabled: false },
    });

    const res = await invokeRoute(pluginInstallationRouter, "patch", "/:pluginId/install", {
      params: { pluginId: plugin.id },
      body: { isEnabled: true },
    });

    expect(res.statusCode).toBe(200);
    expect((res.body as InstallRow).isEnabled).toBe(true);
  });

  test("returns 404 when plugin is not installed", async () => {
    const res = await invokeRoute(pluginInstallationRouter, "patch", "/:pluginId/install", {
      params: { pluginId: "nonexistent" },
      body: { isEnabled: false },
    });

    expect(res.statusCode).toBe(404);
  });

  test("returns 400 for invalid body", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });

    const res = await invokeRoute(pluginInstallationRouter, "patch", "/:pluginId/install", {
      params: { pluginId: plugin.id },
      body: { isEnabled: "yes" },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /me/plugins
// ---------------------------------------------------------------------------

describe("GET /me/plugins — list installed plugins", () => {
  test("returns empty list for a new user", async () => {
    const res = await invokeRoute(mePluginsRouter, "get", "/plugins");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("returns installed plugins with metadata", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);
    versionsStore.push({ id: nextId(), pluginId: plugin.id, version: "1.0.0", isActive: true });

    await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });

    const res = await invokeRoute(mePluginsRouter, "get", "/plugins");

    expect(res.statusCode).toBe(200);
    const list = res.body as Array<Record<string, unknown>>;
    expect(list.length).toBe(1);
    expect((list[0].plugin as Record<string, unknown>).key).toBe("clock-date");
    expect(list[0].isEnabled).toBe(true);
    expect((list[0].plugin as Record<string, unknown>).activeVersion).not.toBeNull();
  });

  test("only returns plugins for current user", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    // user-1 installs
    await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
      userId: "user-1",
    });

    // user-2 sees empty list
    const res = await invokeRoute(mePluginsRouter, "get", "/plugins", { userId: "user-2" });

    expect(res.statusCode).toBe(200);
    expect((res.body as unknown[]).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Service: assertPluginInstalledAndEnabled
// ---------------------------------------------------------------------------

describe("assertPluginInstalledAndEnabled — widget creation enforcement", () => {
  test("throws 403 when plugin is not installed", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    await expect(
      pluginInstallationService.assertPluginInstalledAndEnabled("user-1", "clock-date"),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("throws 403 when plugin is installed but disabled", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });
    await invokeRoute(pluginInstallationRouter, "patch", "/:pluginId/install", {
      params: { pluginId: plugin.id },
      body: { isEnabled: false },
    });

    await expect(
      pluginInstallationService.assertPluginInstalledAndEnabled("user-1", "clock-date"),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("resolves when plugin is installed and enabled", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });

    await expect(
      pluginInstallationService.assertPluginInstalledAndEnabled("user-1", "clock-date"),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Integration: full lifecycle
// ---------------------------------------------------------------------------

describe("Integration: plugin installation lifecycle", () => {
  test("install → appears in list → disable → re-enable → uninstall → removed from list", async () => {
    const plugin = makePlugin();
    pluginsStore.push(plugin);

    // 1. install
    const installRes = await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });
    expect(installRes.statusCode).toBe(201);

    // 2. appears in list
    let listRes = await invokeRoute(mePluginsRouter, "get", "/plugins");
    expect((listRes.body as unknown[]).length).toBe(1);

    // 3. disable
    await invokeRoute(pluginInstallationRouter, "patch", "/:pluginId/install", {
      params: { pluginId: plugin.id },
      body: { isEnabled: false },
    });
    listRes = await invokeRoute(mePluginsRouter, "get", "/plugins");
    expect(((listRes.body as Array<Record<string, unknown>>)[0]).isEnabled).toBe(false);

    // 4. re-enable
    await invokeRoute(pluginInstallationRouter, "patch", "/:pluginId/install", {
      params: { pluginId: plugin.id },
      body: { isEnabled: true },
    });
    listRes = await invokeRoute(mePluginsRouter, "get", "/plugins");
    expect(((listRes.body as Array<Record<string, unknown>>)[0]).isEnabled).toBe(true);

    // 5. uninstall
    const uninstallRes = await invokeRoute(pluginInstallationRouter, "delete", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });
    expect(uninstallRes.statusCode).toBe(204);

    // 6. no longer in list
    listRes = await invokeRoute(mePluginsRouter, "get", "/plugins");
    expect((listRes.body as unknown[]).length).toBe(0);
  });

  test("cannot install a non-approved plugin", async () => {
    const plugin = makePlugin({ isApproved: false });
    pluginsStore.push(plugin);

    const res = await invokeRoute(pluginInstallationRouter, "post", "/:pluginId/install", {
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(403);

    const listRes = await invokeRoute(mePluginsRouter, "get", "/plugins");
    expect((listRes.body as unknown[]).length).toBe(0);
  });
});
