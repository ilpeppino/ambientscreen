import { Router } from "express";
import { z } from "zod";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";
import { profilesService } from "../profiles/profiles.service";
import { getRequestUserId } from "../auth/auth.middleware";
import {
  orchestrationService,
  SUPPORTED_ORCHESTRATION_RULE_TYPES,
  type SupportedOrchestrationRuleType,
} from "./orchestration.service";

export const orchestrationRouter = Router();

const orchestrationRuleTypeSchema = z.enum(SUPPORTED_ORCHESTRATION_RULE_TYPES);
const rotationProfileIdsSchema = z.array(z.string().trim().min(1)).min(2);

const createOrchestrationRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("interval"),
    intervalSec: z.number().int().positive(),
    isActive: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("rotation"),
    intervalSec: z.number().int().positive(),
    isActive: z.boolean().optional(),
    rotationProfileIds: rotationProfileIdsSchema,
  }),
]);

const updateOrchestrationRuleSchema = z
  .object({
    type: orchestrationRuleTypeSchema.optional(),
    intervalSec: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    rotationProfileIds: rotationProfileIdsSchema.optional(),
    currentIndex: z.number().int().nonnegative().optional(),
  })
  .refine(
    (value) => (
      value.type !== undefined
      || value.intervalSec !== undefined
      || value.isActive !== undefined
      || value.rotationProfileIds !== undefined
      || value.currentIndex !== undefined
    ),
    {
      message: "At least one field must be provided",
    },
  );

async function validateRotationProfileIdsForUser(
  userId: string,
  rotationProfileIds: string[],
): Promise<void> {
  const availableProfiles = await profilesService.getProfilesForUser(userId);
  const availableProfileIds = new Set(availableProfiles.map((profile) => profile.id));
  const missingProfileId = rotationProfileIds.find((profileId) => !availableProfileIds.has(profileId));
  if (missingProfileId) {
    throw apiErrors.validation("Rotation rule references one or more non-existent profiles", {
      missingProfileId,
    });
  }
}

orchestrationRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const rules = await orchestrationService.getRulesForUser(userId);
    res.json(rules);
  }),
);

orchestrationRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parseResult = createOrchestrationRuleSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid orchestration rule payload", parseResult.error.format());
    }

    const userId = getRequestUserId(req);
    if (parseResult.data.type === "rotation" && (parseResult.data.isActive ?? true)) {
      await validateRotationProfileIdsForUser(userId, parseResult.data.rotationProfileIds);
    }

    const rule = await orchestrationService.createRule({
      userId,
      type: parseResult.data.type,
      intervalSec: parseResult.data.intervalSec,
      isActive: parseResult.data.isActive,
      rotationProfileIds: parseResult.data.type === "rotation" ? parseResult.data.rotationProfileIds : undefined,
    });

    res.status(201).json(rule);
  }),
);

orchestrationRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parseResult = updateOrchestrationRuleSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid orchestration rule payload", parseResult.error.format());
    }

    const idParam = req.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const userId = getRequestUserId(req);
    const existingRule = await orchestrationService.getRuleByIdForUser({ id, userId });
    if (!existingRule) {
      throw apiErrors.notFound("Orchestration rule not found");
    }

    const nextType = (parseResult.data.type ?? existingRule.type) as SupportedOrchestrationRuleType;
    const nextIsActive = parseResult.data.isActive ?? existingRule.isActive;
    const nextRotationProfileIds = parseResult.data.rotationProfileIds ?? existingRule.rotationProfileIds;

    if (nextType === "rotation" && nextIsActive) {
      if (nextRotationProfileIds.length < 2) {
        throw apiErrors.validation("Rotation rule requires at least two profile IDs");
      }
      await validateRotationProfileIdsForUser(userId, nextRotationProfileIds);
    }

    const updatedRule = await orchestrationService.updateRule({
      id,
      userId,
      type: parseResult.data.type as SupportedOrchestrationRuleType | undefined,
      intervalSec: parseResult.data.intervalSec,
      isActive: parseResult.data.isActive,
      rotationProfileIds: parseResult.data.rotationProfileIds,
      currentIndex: parseResult.data.currentIndex,
    });

    if (!updatedRule) {
      throw apiErrors.notFound("Orchestration rule not found");
    }

    res.json(updatedRule);
  }),
);

orchestrationRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const idParam = req.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const userId = getRequestUserId(req);

    const deleted = await orchestrationService.deleteRule({
      id,
      userId,
    });

    if (!deleted) {
      throw apiErrors.notFound("Orchestration rule not found");
    }

    res.status(204).send();
  }),
);
