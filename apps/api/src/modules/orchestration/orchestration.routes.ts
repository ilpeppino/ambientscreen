import { Router } from "express";
import { z } from "zod";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";
import { profilesService } from "../profiles/profiles.service";
import {
  orchestrationService,
  SUPPORTED_ORCHESTRATION_RULE_TYPES,
  type SupportedOrchestrationRuleType,
} from "./orchestration.service";

export const orchestrationRouter = Router();

const orchestrationRuleTypeSchema = z.enum(SUPPORTED_ORCHESTRATION_RULE_TYPES);

const createOrchestrationRuleSchema = z.object({
  type: orchestrationRuleTypeSchema,
  intervalSec: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

const updateOrchestrationRuleSchema = z
  .object({
    type: orchestrationRuleTypeSchema.optional(),
    intervalSec: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.type !== undefined || value.intervalSec !== undefined || value.isActive !== undefined, {
    message: "At least one field must be provided",
  });

async function getPrimaryUserIdOrThrow(): Promise<string> {
  try {
    return await profilesService.getPrimaryUserId();
  } catch (error) {
    if ((error as Error).message === "No users exist yet. Create a user first.") {
      throw apiErrors.badRequest((error as Error).message);
    }
    throw error;
  }
}

orchestrationRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const userId = await getPrimaryUserIdOrThrow();
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

    const userId = await getPrimaryUserIdOrThrow();
    const rule = await orchestrationService.createRule({
      userId,
      type: parseResult.data.type,
      intervalSec: parseResult.data.intervalSec,
      isActive: parseResult.data.isActive,
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
    const userId = await getPrimaryUserIdOrThrow();

    const updatedRule = await orchestrationService.updateRule({
      id,
      userId,
      type: parseResult.data.type as SupportedOrchestrationRuleType | undefined,
      intervalSec: parseResult.data.intervalSec,
      isActive: parseResult.data.isActive,
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
    const userId = await getPrimaryUserIdOrThrow();

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
