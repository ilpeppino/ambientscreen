/**
 * M5.4 Plugin Publishing (Developer Flow) — Tests
 *
 * Verifies:
 * - POST /developer/plugins — create plugin works
 * - POST /developer/plugins — duplicate name rejected (409)
 * - POST /developer/plugins — invalid payload rejected (400)
 * - GET /developer/plugins — list my plugins returns correct data
 * - GET /developer/plugins/:pluginId — get plugin details
 * - GET /developer/plugins/:pluginId — 404 for non-owned plugin
 * - PATCH /developer/plugins/:pluginId — update description works
 * - PATCH /developer/plugins/:pluginId — non-owner gets 403
 * - POST /developer/plugins/:pluginId/versions — publish version works (201)
 * - POST /developer/plugins/:pluginId/versions — invalid semver rejected (400)
 * - POST /developer/plugins/:pluginId/versions — duplicate version rejected (409)
 * - POST /developer/plugins/:pluginId/versions — non-owner gets 403
 * - POST /developer/plugins/:pluginId/versions — missing entryPoint rejected (400)
 * - Integration: create plugin → appears in developer list
 * - Integration: publish version → becomes active version
 * - Integration: second version → previous deactivated
 * - Integration: non-owner cannot modify plugin
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Router } from "express";
import { pluginPublishingRouter } from "../src/modules/plugin-publishing/pluginPublishing.routes";
import { pluginPublishingRepository } from "../src/modules/plugin-publishing/pluginPublishing.repository";
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
    body: options.body ?? {},
    params: options.params ?? {},
    query: {},
    headers: {},
    authUser: { id: options.userId ?? "user-1", email: "dev@ambient.dev" },
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
  authorId: string | null;
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
  entryPoint: string | null;
  changelog: string | null;
  isActive: boolean;
  createdAt: Date;
}

let pluginsStore: PluginRow[] = [];
let versionsStore: VersionRow[] = [];
let idCounter = 0;

function nextId() { return `id-${++idCounter}`; }

function activeVersionFor(pluginId: string): VersionRow | null {
  return versionsStore.find((v) => v.pluginId === pluginId && v.isActive) ?? null;
}

function pluginWithVersions(p: PluginRow) {
  const versions = versionsStore.filter((v) => v.pluginId === p.id);
  return { ...p, versions, activeVersion: activeVersionFor(p.id) };
}

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  pluginsStore = [];
  versionsStore = [];
  idCounter = 0;

  vi.spyOn(pluginPublishingRepository, "findByName").mockImplementation(async (name) => {
    return pluginsStore.find((p) => p.name === name) ?? null;
  });

  vi.spyOn(pluginPublishingRepository, "findById").mockImplementation(async (id) => {
    return pluginsStore.find((p) => p.id === id) ?? null;
  });

  vi.spyOn(pluginPublishingRepository, "findByIdAndAuthor").mockImplementation(
    async (id, authorId) => {
      const p = pluginsStore.find((x) => x.id === id && x.authorId === authorId) ?? null;
      if (!p) return null;
      return pluginWithVersions(p);
    },
  );

  vi.spyOn(pluginPublishingRepository, "findAllByAuthor").mockImplementation(async (authorId) => {
    return pluginsStore
      .filter((p) => p.authorId === authorId)
      .map((p) => pluginWithVersions(p));
  });

  vi.spyOn(pluginPublishingRepository, "create").mockImplementation(async (data) => {
    const key = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const plugin: PluginRow = {
      id: nextId(),
      key,
      name: data.name,
      description: data.description,
      category: data.category,
      authorId: data.authorId,
      isPremium: false,
      isApproved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    pluginsStore.push(plugin);
    return plugin;
  });

  vi.spyOn(pluginPublishingRepository, "update").mockImplementation(async (id, data) => {
    const plugin = pluginsStore.find((p) => p.id === id);
    if (!plugin) throw new Error("Plugin not found");
    if (data.description !== undefined) plugin.description = data.description;
    plugin.updatedAt = new Date();
    return plugin;
  });

  vi.spyOn(pluginPublishingRepository, "createVersion").mockImplementation(async (data) => {
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

  vi.spyOn(pluginPublishingRepository, "findVersionByPluginAndVersion").mockImplementation(
    async (pluginId, version) => {
      return versionsStore.find((v) => v.pluginId === pluginId && v.version === version) ?? null;
    },
  );

  vi.spyOn(pluginPublishingRepository, "setActiveVersion").mockImplementation(
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
  key: "my-clock",
  version: "1.0.0",
  name: "My Clock",
  description: "Shows the current time",
  category: "time",
  defaultLayout: { w: 4, h: 2 },
  refreshPolicy: { intervalMs: 1000 },
};

const pluginBody = {
  name: "My Clock",
  description: "Shows the current time",
  category: "time",
};

const versionBody = {
  version: "1.0.0",
  manifest: validManifest,
  entryPoint: "dist/index.js",
};

// ---------------------------------------------------------------------------
// POST / — create plugin
// ---------------------------------------------------------------------------

describe("POST /developer/plugins — create plugin", () => {
  test("creates a plugin and returns 201", async () => {
    const res = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    expect(res.statusCode).toBe(201);
    const body = res.body as PluginRow;
    expect(body.name).toBe("My Clock");
    expect(body.isApproved).toBe(false);
    expect(body.authorId).toBe("user-1");
  });

  test("sets authorId to current user", async () => {
    const res = await invokeRoute(pluginPublishingRouter, "post", "/", {
      body: pluginBody,
      userId: "dev-42",
    });
    expect(res.statusCode).toBe(201);
    expect((res.body as PluginRow).authorId).toBe("dev-42");
  });

  test("returns 409 for duplicate name", async () => {
    await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const res = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    expect(res.statusCode).toBe(409);
  });

  test("returns 400 for missing required fields", async () => {
    const res = await invokeRoute(pluginPublishingRouter, "post", "/", {
      body: { name: "x" },
    });
    expect(res.statusCode).toBe(400);
  });

  test("returns 400 for empty name", async () => {
    const res = await invokeRoute(pluginPublishingRouter, "post", "/", {
      body: { name: "", description: "test", category: "time" },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET / — list my plugins
// ---------------------------------------------------------------------------

describe("GET /developer/plugins — list my plugins", () => {
  test("returns empty list for a new developer", async () => {
    const res = await invokeRoute(pluginPublishingRouter, "get", "/");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("returns only plugins belonging to current user", async () => {
    await invokeRoute(pluginPublishingRouter, "post", "/", {
      body: pluginBody,
      userId: "user-1",
    });
    await invokeRoute(pluginPublishingRouter, "post", "/", {
      body: { ...pluginBody, name: "Other Plugin" },
      userId: "user-2",
    });

    const res = await invokeRoute(pluginPublishingRouter, "get", "/", { userId: "user-1" });
    const list = res.body as PluginRow[];
    expect(list.length).toBe(1);
    expect(list[0].name).toBe("My Clock");
    expect(list[0].authorId).toBe("user-1");
  });

  test("includes approval status and versions", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: versionBody,
      params: { pluginId: plugin.id },
    });

    const res = await invokeRoute(pluginPublishingRouter, "get", "/");
    const list = res.body as Array<Record<string, unknown>>;
    expect(list[0].isApproved).toBe(false);
    expect(list[0].activeVersion).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GET /:pluginId — get plugin details
// ---------------------------------------------------------------------------

describe("GET /developer/plugins/:pluginId — get plugin details", () => {
  test("returns full plugin info for owner", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginPublishingRouter, "get", "/:pluginId", {
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.name).toBe("My Clock");
    expect(body.isApproved).toBe(false);
    expect(body.versions).toBeDefined();
  });

  test("returns 404 for non-owned plugin", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", {
      body: pluginBody,
      userId: "user-1",
    });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginPublishingRouter, "get", "/:pluginId", {
      params: { pluginId: plugin.id },
      userId: "user-2",
    });

    expect(res.statusCode).toBe(404);
  });

  test("returns 404 for unknown plugin", async () => {
    const res = await invokeRoute(pluginPublishingRouter, "get", "/:pluginId", {
      params: { pluginId: "nonexistent" },
    });
    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /:pluginId — update plugin metadata
// ---------------------------------------------------------------------------

describe("PATCH /developer/plugins/:pluginId — update metadata", () => {
  test("updates description for plugin owner", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginPublishingRouter, "patch", "/:pluginId", {
      body: { description: "Updated description" },
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(200);
    expect((res.body as PluginRow).description).toBe("Updated description");
  });

  test("returns 403 for non-owner", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", {
      body: pluginBody,
      userId: "user-1",
    });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginPublishingRouter, "patch", "/:pluginId", {
      body: { description: "Hacked" },
      params: { pluginId: plugin.id },
      userId: "user-2",
    });

    expect(res.statusCode).toBe(403);
  });

  test("returns 404 for unknown plugin", async () => {
    const res = await invokeRoute(pluginPublishingRouter, "patch", "/:pluginId", {
      body: { description: "x" },
      params: { pluginId: "nonexistent" },
    });
    expect(res.statusCode).toBe(404);
  });

  test("returns 400 for invalid payload", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginPublishingRouter, "patch", "/:pluginId", {
      body: { description: "" },
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /:pluginId/versions — publish version
// ---------------------------------------------------------------------------

describe("POST /developer/plugins/:pluginId/versions — publish version", () => {
  test("publishes a version and returns 201", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: versionBody,
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(201);
    const body = res.body as VersionRow;
    expect(body.version).toBe("1.0.0");
    expect(body.entryPoint).toBe("dist/index.js");
    expect(body.isActive).toBe(true);
  });

  test("returns 400 for invalid semver", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: { ...versionBody, version: "not-semver" },
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(400);
  });

  test("returns 409 for duplicate version", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: versionBody,
      params: { pluginId: plugin.id },
    });

    const res = await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: versionBody,
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(409);
  });

  test("returns 403 for non-owner", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", {
      body: pluginBody,
      userId: "user-1",
    });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: versionBody,
      params: { pluginId: plugin.id },
      userId: "user-2",
    });

    expect(res.statusCode).toBe(403);
  });

  test("returns 404 for unknown plugin", async () => {
    const res = await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: versionBody,
      params: { pluginId: "nonexistent" },
    });
    expect(res.statusCode).toBe(404);
  });

  test("returns 400 when entryPoint is missing", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const { entryPoint: _, ...bodyWithoutEntry } = versionBody;
    const res = await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: bodyWithoutEntry,
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(400);
  });

  test("returns 400 when manifest is missing required fields", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    const res = await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: { version: "1.0.0", manifest: { key: "x" }, entryPoint: "dist/index.js" },
      params: { pluginId: plugin.id },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Integration: full lifecycle
// ---------------------------------------------------------------------------

describe("Integration: plugin publishing lifecycle", () => {
  test("create plugin → appears in developer list", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    expect(createRes.statusCode).toBe(201);

    const listRes = await invokeRoute(pluginPublishingRouter, "get", "/");
    const list = listRes.body as PluginRow[];
    expect(list.length).toBe(1);
    expect(list[0].name).toBe("My Clock");
    expect(list[0].isApproved).toBe(false);
  });

  test("publish version → becomes active version", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: versionBody,
      params: { pluginId: plugin.id },
    });

    const detailRes = await invokeRoute(pluginPublishingRouter, "get", "/:pluginId", {
      params: { pluginId: plugin.id },
    });

    const detail = detailRes.body as Record<string, unknown>;
    expect(detail.activeVersion).not.toBeNull();
    expect((detail.activeVersion as Record<string, unknown>).version).toBe("1.0.0");
    expect((detail.activeVersion as Record<string, unknown>).isActive).toBe(true);
  });

  test("second version → previous deactivated", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", { body: pluginBody });
    const plugin = createRes.body as PluginRow;

    await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: versionBody,
      params: { pluginId: plugin.id },
    });

    await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: { ...versionBody, version: "2.0.0" },
      params: { pluginId: plugin.id },
    });

    const detailRes = await invokeRoute(pluginPublishingRouter, "get", "/:pluginId", {
      params: { pluginId: plugin.id },
    });

    const detail = detailRes.body as Record<string, unknown>;
    expect((detail.activeVersion as Record<string, unknown>).version).toBe("2.0.0");

    // v1 should be inactive
    const versions = detail.versions as VersionRow[];
    const v1 = versions.find((v) => v.version === "1.0.0");
    expect(v1?.isActive).toBe(false);
  });

  test("non-owner cannot modify plugin", async () => {
    const createRes = await invokeRoute(pluginPublishingRouter, "post", "/", {
      body: pluginBody,
      userId: "user-1",
    });
    const plugin = createRes.body as PluginRow;

    // Non-owner cannot update
    const updateRes = await invokeRoute(pluginPublishingRouter, "patch", "/:pluginId", {
      body: { description: "Hijacked" },
      params: { pluginId: plugin.id },
      userId: "user-2",
    });
    expect(updateRes.statusCode).toBe(403);

    // Non-owner cannot publish version
    const versionRes = await invokeRoute(pluginPublishingRouter, "post", "/:pluginId/versions", {
      body: versionBody,
      params: { pluginId: plugin.id },
      userId: "user-2",
    });
    expect(versionRes.statusCode).toBe(403);

    // Non-owner cannot view plugin
    const viewRes = await invokeRoute(pluginPublishingRouter, "get", "/:pluginId", {
      params: { pluginId: plugin.id },
      userId: "user-2",
    });
    expect(viewRes.statusCode).toBe(404);
  });
});
