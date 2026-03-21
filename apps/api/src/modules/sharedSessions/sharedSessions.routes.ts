import { Router } from "express";
import { z } from "zod";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";
import { getRequestUserId } from "../auth/auth.middleware";
import { sharedSessionsService } from "./sharedSessions.service";

export const sharedSessionsRouter = Router();

const createSharedSessionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  activeProfileId: z.string().trim().min(1).optional(),
  slideshowEnabled: z.boolean().optional(),
  slideshowIntervalSec: z.number().int().positive().optional(),
  rotationProfileIds: z.array(z.string().trim().min(1)).optional(),
  currentIndex: z.number().int().nonnegative().optional(),
});

const updateSharedSessionSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    isActive: z.boolean().optional(),
    activeProfileId: z.string().trim().min(1).nullable().optional(),
    slideshowEnabled: z.boolean().optional(),
    slideshowIntervalSec: z.number().int().positive().optional(),
    rotationProfileIds: z.array(z.string().trim().min(1)).optional(),
    currentIndex: z.number().int().nonnegative().optional(),
  })
  .refine((value) => (
    value.name !== undefined
    || value.isActive !== undefined
    || value.activeProfileId !== undefined
    || value.slideshowEnabled !== undefined
    || value.slideshowIntervalSec !== undefined
    || value.rotationProfileIds !== undefined
    || value.currentIndex !== undefined
  ), {
    message: "At least one field must be provided",
  });

const joinSharedSessionSchema = z.object({
  deviceId: z.string().trim().min(1).max(120),
  displayName: z.string().trim().max(120).optional(),
});

const leaveSharedSessionSchema = z.object({
  deviceId: z.string().trim().min(1).max(120),
});

function getParamId(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return "";
}

sharedSessionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const sessions = await sharedSessionsService.getSessionsForUser(userId);
    res.json(sessions);
  }),
);

sharedSessionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parseResult = createSharedSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid shared session payload", parseResult.error.format());
    }

    const userId = getRequestUserId(req);
    const session = await sharedSessionsService.createSession({
      userId,
      name: parseResult.data.name,
      activeProfileId: parseResult.data.activeProfileId,
      slideshowEnabled: parseResult.data.slideshowEnabled,
      slideshowIntervalSec: parseResult.data.slideshowIntervalSec,
      rotationProfileIds: parseResult.data.rotationProfileIds,
      currentIndex: parseResult.data.currentIndex,
    });

    res.status(201).json(session);
  }),
);

sharedSessionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const id = getParamId(req.params.id);
    const session = await sharedSessionsService.getSessionByIdForUser({ id, userId });

    if (!session) {
      throw apiErrors.notFound("Shared session not found");
    }

    res.json(session);
  }),
);

sharedSessionsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parseResult = updateSharedSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid shared session payload", parseResult.error.format());
    }

    const userId = getRequestUserId(req);
    const id = getParamId(req.params.id);
    const updated = await sharedSessionsService.updateSession({
      id,
      userId,
      ...parseResult.data,
    });

    if (!updated) {
      throw apiErrors.notFound("Shared session not found");
    }

    res.json(updated);
  }),
);

sharedSessionsRouter.post(
  "/:id/join",
  asyncHandler(async (req, res) => {
    const parseResult = joinSharedSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid join payload", parseResult.error.format());
    }

    const userId = getRequestUserId(req);
    const id = getParamId(req.params.id);
    const session = await sharedSessionsService.joinSession({
      id,
      userId,
      deviceId: parseResult.data.deviceId,
      displayName: parseResult.data.displayName,
    });

    if (!session) {
      throw apiErrors.notFound("Shared session not found");
    }

    res.json(session);
  }),
);

sharedSessionsRouter.post(
  "/:id/leave",
  asyncHandler(async (req, res) => {
    const parseResult = leaveSharedSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid leave payload", parseResult.error.format());
    }

    const userId = getRequestUserId(req);
    const id = getParamId(req.params.id);
    const session = await sharedSessionsService.leaveSession({
      id,
      userId,
      deviceId: parseResult.data.deviceId,
    });

    if (!session) {
      throw apiErrors.notFound("Shared session not found");
    }

    res.json(session);
  }),
);
