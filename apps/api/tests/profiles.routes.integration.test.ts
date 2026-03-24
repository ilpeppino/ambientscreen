import { test, expect, afterEach, beforeEach, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { profilesRouter } from "../src/modules/profiles/profiles.routes";
import { profilesService } from "../src/modules/profiles/profiles.service";
import { widgetsService } from "../src/modules/widgets/widgets.service";

interface TestProfile {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
}

type RouteMethod = "get" | "post" | "patch" | "delete";

interface InvokeRouteOptions {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

let profileStore: TestProfile[] = [];
let profileCounter = 0;
let activeProfileId: string | null = null;

beforeEach(() => {
  profileCounter = 1;
  profileStore = [
    {
      id: "profile-default",
      userId: "user-1",
      name: "Default",
      isDefault: true,
      createdAt: new Date(),
    },
  ];
  activeProfileId = "profile-default";

  vi.spyOn(profilesService, "getProfilesWithActiveForUser").mockImplementation(async (userId: string) => ({
    profiles: profileStore.filter((item) => item.userId === userId),
    activeProfileId,
  }) as never);

  vi.spyOn(profilesService, "getProfileByIdForUser").mockImplementation(async ({ userId, profileId }) => {
    return (profileStore.find((item) => item.id === profileId && item.userId === userId) ?? null) as never;
  });

  vi.spyOn(profilesService, "createProfileForUser").mockImplementation(async ({ userId, name }) => {
    profileCounter += 1;
    const profile: TestProfile = {
      id: `profile-${profileCounter}`,
      userId,
      name,
      isDefault: false,
      createdAt: new Date(),
    };
    profileStore.push(profile);
    return profile as never;
  });

  vi.spyOn(profilesService, "activateProfileForUser").mockImplementation(async ({ userId, profileId }) => {
    const profile = profileStore.find((item) => item.id === profileId && item.userId === userId);
    if (!profile) {
      return null as never;
    }

    activeProfileId = profile.id;
    return profile as never;
  });

  vi.spyOn(profilesService, "renameProfileForUser").mockImplementation(async ({ userId, profileId, name }) => {
    const profile = profileStore.find((item) => item.id === profileId && item.userId === userId);
    if (!profile) {
      return null as never;
    }

    profile.name = name;
    return profile as never;
  });

  vi.spyOn(profilesService, "deleteProfileForUser").mockImplementation(async ({ userId, profileId }) => {
    const profile = profileStore.find((item) => item.id === profileId && item.userId === userId);
    if (!profile) {
      return { deleted: false, reason: "notFound" } as never;
    }

    const ownedProfiles = profileStore.filter((item) => item.userId === userId);
    if (ownedProfiles.length <= 1) {
      return { deleted: false, reason: "lastProfile" } as never;
    }

    profileStore = profileStore.filter((item) => item.id !== profileId);
    if (activeProfileId === profileId) {
      activeProfileId = profileStore.find((item) => item.userId === userId)?.id ?? null;
    }

    return { deleted: true } as never;
  });

  vi.spyOn(widgetsService, "clearWidgetsForProfile").mockImplementation(async ({ profileId }) => {
    const profile = profileStore.find((item) => item.id === profileId && item.userId === "user-1");
    if (!profile) {
      return { deletedCount: 0 } as never;
    }
    return { deletedCount: 2 } as never;
  });
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

test("GET /profiles returns authenticated user's profiles with active profile", async () => {
  profileStore.push({
    id: "profile-work",
    userId: "user-1",
    name: "Work",
    isDefault: false,
    createdAt: new Date(),
  });
  profileStore.push({
    id: "profile-other-user",
    userId: "user-2",
    name: "Other User",
    isDefault: true,
    createdAt: new Date(),
  });

  const listResponse = await invokeRoute(profilesRouter, "get", "/");
  expect(listResponse.statusCode).toBe(200);
  expect(listResponse.body).toEqual({
    profiles: [
      expect.objectContaining({ id: "profile-default", userId: "user-1" }),
      expect.objectContaining({ id: "profile-work", userId: "user-1" }),
    ],
    activeProfileId: "profile-default",
  });
});

test("profile CRUD and activation are user-scoped", async () => {
  const createResponse = await invokeRoute(profilesRouter, "post", "/", {
    body: { name: "Work" },
  });
  expect(createResponse.statusCode).toBe(201);

  const createdProfile = createResponse.body as TestProfile;
  expect(createdProfile.userId).toBe("user-1");

  const activateResponse = await invokeRoute(profilesRouter, "patch", "/:id/activate", {
    params: { id: createdProfile.id },
  });
  expect(activateResponse.statusCode).toBe(200);
  expect(activateResponse.body).toEqual({ activeProfileId: createdProfile.id });

  const getByIdResponse = await invokeRoute(profilesRouter, "get", "/:id", {
    params: { id: createdProfile.id },
  });
  expect(getByIdResponse.statusCode).toBe(200);

  const renameResponse = await invokeRoute(profilesRouter, "patch", "/:id", {
    params: { id: createdProfile.id },
    body: { name: "Office" },
  });
  expect(renameResponse.statusCode).toBe(200);
  expect((renameResponse.body as TestProfile).name).toBe("Office");

  const deleteResponse = await invokeRoute(profilesRouter, "delete", "/:id", {
    params: { id: createdProfile.id },
  });
  expect(deleteResponse.statusCode).toBe(204);
});

test("GET /profiles/:id rejects another user's profile", async () => {
  profileStore.push({
    id: "profile-other-user",
    userId: "user-2",
    name: "Other User",
    isDefault: true,
    createdAt: new Date(),
  });

  const response = await invokeRoute(profilesRouter, "get", "/:id", {
    params: { id: "profile-other-user" },
  });

  expect(response.statusCode).toBe(404);
});

test("profile delete prevents deleting the last remaining profile", async () => {
  const deleteResponse = await invokeRoute(profilesRouter, "delete", "/:id", {
    params: { id: "profile-default" },
  });

  expect(deleteResponse.statusCode).toBe(400);
});

test("DELETE /profiles/:id/widgets clears only the selected profile canvas", async () => {
  const clearResponse = await invokeRoute(profilesRouter, "delete", "/:id/widgets", {
    params: { id: "profile-default" },
  });

  expect(clearResponse.statusCode).toBe(200);
  expect(clearResponse.body).toEqual({ deletedCount: 2 });
  expect(widgetsService.clearWidgetsForProfile).toHaveBeenCalledWith({
    profileId: "profile-default",
  });
});
