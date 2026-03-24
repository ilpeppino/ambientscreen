import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { getRequestUserId } from "../auth/auth.middleware";
import { usersService } from "../users/users.service";
import { apiErrors } from "../../core/http/api-error";
import { resolveUserFeatures } from "./entitlements.service";

export const entitlementsRouter = Router();

/**
 * GET /entitlements
 *
 * Returns the authenticated user's plan and resolved feature access map.
 * Clients use this to gate UI and conditionally enable features.
 *
 * Response: { plan: "free" | "pro", features: { [featureKey]: boolean } }
 */
entitlementsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const user = await usersService.findUserById(userId);

    if (!user) {
      throw apiErrors.notFound("User not found");
    }

    const features = resolveUserFeatures(user);

    res.json({
      plan: user.plan ?? "free",
      features,
    });
  }),
);
