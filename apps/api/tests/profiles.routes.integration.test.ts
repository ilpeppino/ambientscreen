import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
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

const originalProfilesService = {
  getPrimaryUserId: profilesService.getPrimaryUserId,
  getProfilesForPrimaryUser: profilesService.getProfilesForPrimaryUser,
  createProfileForUser: profilesService.createProfileForUser,
  renameProfileForUser: profilesService.renameProfileForUser,
  deleteProfileForUser: profilesService.deleteProfileForUser,
};

const mutableProfilesService = profilesService as unknown as {
  getPrimaryUserId: () => Promise<string>;
  getProfilesForPrimaryUser: () => Promise<TestProfile[]>;
  createProfileForUser: (data: { userId: string; name: string }) => Promise<TestProfile>;
  renameProfileForUser: (data: {
    userId: string;
    profileId: string;
    name: string;
  }) => Promise<TestProfile | null>;
  deleteProfileForUser: (data: {
    userId: string;
    profileId: string;
  }) => Promise<{ deleted: boolean; reason?: "notFound" | "lastProfile" }>;
};

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

  mutableProfilesService.getPrimaryUserId = async () => "user-1";
  mutableProfilesService.getProfilesForPrimaryUser = async () => profileStore;
  mutableProfilesService.createProfileForUser = async ({ userId, name }) => {
    profileCounter += 1;
    const profile: TestProfile = {
      id: `profile-${profileCounter}`,
      userId,
      name,
      isDefault: false,
      createdAt: new Date(),
    };
    profileStore.push(profile);
    return profile;
  };
  mutableProfilesService.renameProfileForUser = async ({ userId, profileId, name }) => {
    const profile = profileStore.find((item) => item.id === profileId && item.userId === userId);
    if (!profile) {
      return null;
    }

    profile.name = name;
    return profile;
  };
  mutableProfilesService.deleteProfileForUser = async ({ userId, profileId }) => {
    const profile = profileStore.find((item) => item.id === profileId && item.userId === userId);
    if (!profile) {
      return { deleted: false, reason: "notFound" };
    }

    if (profileStore.length <= 1) {
      return { deleted: false, reason: "lastProfile" };
    }

    profileStore = profileStore.filter((item) => item.id !== profileId);
    return { deleted: true };
  };
});

after(() => {
  mutableProfilesService.getPrimaryUserId = originalProfilesService.getPrimaryUserId;
  mutableProfilesService.getProfilesForPrimaryUser = originalProfilesService.getProfilesForPrimaryUser;
  mutableProfilesService.createProfileForUser = originalProfilesService.createProfileForUser;
  mutableProfilesService.renameProfileForUser = originalProfilesService.renameProfileForUser;
  mutableProfilesService.deleteProfileForUser = originalProfilesService.deleteProfileForUser;
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
  assert.equal(createResponse.statusCode, 201);

  const listResponse = await invokeRoute(profilesRouter, "get", "/");
  assert.equal(listResponse.statusCode, 200);
  const profiles = listResponse.body as TestProfile[];
  assert.equal(profiles.length, 2);
  assert.equal(profiles[1].name, "Work");

  const createdProfileId = profiles[1].id;
  const renameResponse = await invokeRoute(profilesRouter, "patch", "/:id", {
    params: { id: createdProfileId },
    body: { name: "Office" },
  });
  assert.equal(renameResponse.statusCode, 200);
  assert.equal((renameResponse.body as TestProfile).name, "Office");

  const deleteResponse = await invokeRoute(profilesRouter, "delete", "/:id", {
    params: { id: createdProfileId },
  });
  assert.equal(deleteResponse.statusCode, 204);
});

test("profile delete prevents deleting the last remaining profile", async () => {
  const deleteResponse = await invokeRoute(profilesRouter, "delete", "/:id", {
    params: { id: "profile-default" },
  });

  assert.equal(deleteResponse.statusCode, 400);
});
