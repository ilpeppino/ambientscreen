import { Router } from "express";
import { z } from "zod";
import { profilesService } from "./profiles.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";

export const profilesRouter = Router();

const createProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

profilesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    try {
      const profiles = await profilesService.getProfilesForPrimaryUser();
      res.json(profiles);
    } catch (error) {
      if ((error as Error).message === "No users exist yet. Create a user first.") {
        throw apiErrors.badRequest((error as Error).message);
      }
      throw error;
    }
  }),
);

profilesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parseResult = createProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid profile payload", parseResult.error.format());
    }

    let userId: string;
    try {
      userId = await profilesService.getPrimaryUserId();
    } catch (error) {
      if ((error as Error).message === "No users exist yet. Create a user first.") {
        throw apiErrors.badRequest((error as Error).message);
      }
      throw error;
    }

    const profile = await profilesService.createProfileForUser({
      userId,
      name: parseResult.data.name,
    });

    res.status(201).json(profile);
  }),
);

profilesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid profile payload", parseResult.error.format());
    }

    const idParam = req.params.id;
    const profileId = Array.isArray(idParam) ? idParam[0] : idParam;

    let userId: string;
    try {
      userId = await profilesService.getPrimaryUserId();
    } catch (error) {
      if ((error as Error).message === "No users exist yet. Create a user first.") {
        throw apiErrors.badRequest((error as Error).message);
      }
      throw error;
    }

    const profile = await profilesService.renameProfileForUser({
      userId,
      profileId,
      name: parseResult.data.name,
    });

    if (!profile) {
      throw apiErrors.notFound("Profile not found");
    }

    res.json(profile);
  }),
);

profilesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const idParam = req.params.id;
    const profileId = Array.isArray(idParam) ? idParam[0] : idParam;

    let userId: string;
    try {
      userId = await profilesService.getPrimaryUserId();
    } catch (error) {
      if ((error as Error).message === "No users exist yet. Create a user first.") {
        throw apiErrors.badRequest((error as Error).message);
      }
      throw error;
    }

    const result = await profilesService.deleteProfileForUser({ userId, profileId });
    if (!result.deleted && result.reason === "notFound") {
      throw apiErrors.notFound("Profile not found");
    }

    if (!result.deleted && result.reason === "lastProfile") {
      throw apiErrors.validation("Cannot delete the last remaining profile.");
    }

    res.status(204).send();
  }),
);
