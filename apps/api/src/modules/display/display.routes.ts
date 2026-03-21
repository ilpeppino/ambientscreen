import { Router } from "express";
import { profilesService } from "../profiles/profiles.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";
import { displayService } from "./display.service";
import { getRequestUserId } from "../auth/auth.middleware";

export const displayRouter = Router();

function getQueryProfileId(queryValue: unknown): string | undefined {
  if (typeof queryValue === "string" && queryValue.trim().length > 0) {
    return queryValue;
  }

  if (Array.isArray(queryValue) && typeof queryValue[0] === "string" && queryValue[0].trim().length > 0) {
    return queryValue[0];
  }

  return undefined;
}

displayRouter.get(
  "/display-layout",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const profile = await profilesService.resolveProfileForUser({
      userId,
      profileId: getQueryProfileId(req.query?.profileId),
    });

    if (!profile) {
      throw apiErrors.notFound("Profile not found");
    }

    const result = await displayService.getDisplayLayout(profile.id);
    res.json(result);
  }),
);
