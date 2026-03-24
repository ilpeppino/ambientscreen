import { Router } from "express";
import { z } from "zod";
import { profilesService } from "../profiles/profiles.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";
import { slidesService } from "./slides.service";
import { getRequestUserId } from "../auth/auth.middleware";

export const slidesRouter = Router();

const createSlideSchema = z.object({
  name: z.string().trim().min(1).max(80),
  durationSeconds: z.number().int().min(1).max(3600).nullable().optional(),
  isEnabled: z.boolean().optional(),
});

const updateSlideSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  durationSeconds: z.number().int().min(1).max(3600).nullable().optional(),
  isEnabled: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

function getQueryProfileId(queryValue: unknown): string | undefined {
  if (typeof queryValue === "string" && queryValue.trim().length > 0) {
    return queryValue;
  }

  if (Array.isArray(queryValue) && typeof queryValue[0] === "string" && queryValue[0].trim().length > 0) {
    return queryValue[0];
  }

  return undefined;
}

async function resolveRequestProfileId(userId: string, explicitProfileId?: string | null): Promise<string> {
  const profile = await profilesService.resolveProfileForUser({
    userId,
    profileId: explicitProfileId,
  });

  if (!profile) {
    throw apiErrors.notFound("Profile not found");
  }

  return profile.id;
}

slidesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const profileId = await resolveRequestProfileId(userId, getQueryProfileId(req.query?.profileId));
    const slides = await slidesService.listSlides(profileId);
    res.json({ slides });
  }),
);

slidesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const parsed = createSlideSchema.safeParse(req.body);

    if (!parsed.success) {
      throw apiErrors.validation("Invalid slide payload", parsed.error.format());
    }

    const profileId = await resolveRequestProfileId(userId, getQueryProfileId(req.query?.profileId));
    const created = await slidesService.createSlide({
      profileId,
      name: parsed.data.name,
      durationSeconds: parsed.data.durationSeconds ?? null,
      isEnabled: parsed.data.isEnabled ?? true,
    });

    res.status(201).json(created);
  }),
);

slidesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const parsed = updateSlideSchema.safeParse(req.body);

    if (!parsed.success) {
      throw apiErrors.validation("Invalid slide payload", parsed.error.format());
    }

    const profileId = await resolveRequestProfileId(userId, getQueryProfileId(req.query?.profileId));
    const idParam = req.params.id;
    const slideId = Array.isArray(idParam) ? idParam[0] : idParam;

    const updated = await slidesService.updateSlide({
      profileId,
      slideId,
      ...parsed.data,
    });

    if (!updated) {
      throw apiErrors.notFound("Slide not found");
    }

    res.json(updated);
  }),
);

slidesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const profileId = await resolveRequestProfileId(userId, getQueryProfileId(req.query?.profileId));
    const idParam = req.params.id;
    const slideId = Array.isArray(idParam) ? idParam[0] : idParam;

    const result = await slidesService.deleteSlide({
      profileId,
      slideId,
    });

    if (!result.deleted && result.reason === "notFound") {
      throw apiErrors.notFound("Slide not found");
    }

    if (!result.deleted && result.reason === "lastSlide") {
      throw apiErrors.validation("Cannot delete the last remaining slide.");
    }

    res.status(204).send();
  }),
);
