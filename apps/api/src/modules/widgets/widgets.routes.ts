import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  SUPPORTED_WIDGET_TYPES,
  widgetsService
} from "./widgets.service";
import { usersService } from "../users/users.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";

export const widgetsRouter = Router();

const createWidgetSchema = z.object({
  type: z.enum(SUPPORTED_WIDGET_TYPES),
  config: z.record(z.string(), z.unknown()).optional()
});

async function getPrimaryUserId(): Promise<string> {
  const users = await usersService.getAllUsers();

  if (users.length === 0) {
    throw apiErrors.badRequest("No users exist yet. Create a user first.");
  }

  return users[0].id;
}

widgetsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const userId = await getPrimaryUserId();
    const widgets = await widgetsService.getUserWidgets(userId);
    res.json(widgets);
  })
);

widgetsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = await getPrimaryUserId();
    const result = createWidgetSchema.safeParse(req.body);

    if (!result.success) {
      throw apiErrors.validation("Invalid widget payload", result.error.format());
    }

    const { type, config } = result.data;
    const normalizedConfig = config as Prisma.InputJsonValue;
    const widget = await widgetsService.createWidgetAtNextPosition({
      userId,
      type,
      config: normalizedConfig
    });

    res.status(201).json(widget);
  })
);
