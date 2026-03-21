import { test, expect, afterEach, beforeEach, vi } from "vitest";
import type { Router } from "express";
import { globalErrorMiddleware } from "../src/core/http/error-middleware";
import { profilesRouter } from "../src/modules/profiles/profiles.routes";
import { profilesService } from "../src/modules/profiles/profiles.service";

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

beforeEach(() => {
  profileCounter = 0;
  profileStore = [
    {
      id: "profile-default",
      userId: "user-1",
      name: "Default",
      isDefault: true,
      createdAt: new Date(),
    },
  ];

  vi.spyOn(profilesService, "getOrCreateDefaultProfileForUser").mockImplementation(async () => profileStore[0] as never);
  vi.spyOn(profilesService, "getProfilesForUser").mockImplementation(async () => profileStore as never);
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

    if (profileStore.length <= 1) {
      return { deleted: false, reason: "lastProfile" } as never;
    }

    profileStore = profileStore.filter((item) => item.id !== profileId);
    return { deleted: true } as never;
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

test("profile CRUD routes create, rename, and delete profiles", async () => {
  const createResponse = await invokeRoute(profilesRouter, "post", "/", {
    body: { name: "Work" },
  });
  expect(createResponse.statusCode).toBe(201);

  const listResponse = await invokeRoute(profilesRouter, "get", "/");
  expect(listResponse.statusCode).toBe(200);
  const profiles = listResponse.body as TestProfile[];
  expect(profiles.length).toBe(2);
  expect(profiles[1].name).toBe("Work");

  const createdProfileId = profiles[1].id;
  const renameResponse = await invokeRoute(profilesRouter, "patch", "/:id", {
    params: { id: createdProfileId },
    body: { name: "Office" },
  });
  expect(renameResponse.statusCode).toBe(200);
  expect((renameResponse.body as TestProfile).name).toBe("Office");

  const deleteResponse = await invokeRoute(profilesRouter, "delete", "/:id", {
    params: { id: createdProfileId },
  });
  expect(deleteResponse.statusCode).toBe(204);
});

test("profile delete prevents deleting the last remaining profile", async () => {
  const deleteResponse = await invokeRoute(profilesRouter, "delete", "/:id", {
    params: { id: "profile-default" },
  });

  expect(deleteResponse.statusCode).toBe(400);
});
