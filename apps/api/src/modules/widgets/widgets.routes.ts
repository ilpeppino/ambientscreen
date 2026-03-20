import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { widgetsService } from "./widgets.service";
import { usersService } from "../users/users.service";

export const widgetsRouter = Router();

function isWidgetCreateValidationError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientValidationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2003";
  }

  return false;
}

widgetsRouter.get("/", async (_req, res) => {
  try {
    const users = await usersService.getAllUsers();

    if (users.length === 0) {
      return res.status(400).json({
        error: "No users exist yet. Create a user first."
      });
    }

    const userId = users[0].id;
    const widgets = await widgetsService.getUserWidgets(userId);

    res.json(widgets);
  } catch (error) {
    console.error("Failed to get widgets", error);
    res.status(500).json({
      error: "Failed to get widgets"
    });
  }
});

widgetsRouter.post("/", async (req, res) => {
  try {
    const users = await usersService.getAllUsers();

    if (users.length === 0) {
      return res.status(400).json({
        error: "No users exist yet. Create a user first."
      });
    }

    const userId = users[0].id;

    const schema = z.object({
      type: z.string().trim().min(1),
      config: z.record(z.string(), z.unknown()),
      position: z.number().int().min(0)
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json(result.error.format());
    }

    const { type, config, position } = result.data;

    const normalizedConfig = config as Prisma.InputJsonValue;

    const widget = await widgetsService.createWidget({
      userId,
      type,
      config: normalizedConfig,
      position
    });

    res.status(201).json(widget);
  } catch (error) {
    if (isWidgetCreateValidationError(error)) {
      return res.status(400).json({
        error: "Invalid widget payload"
      });
    }

    console.error("Failed to create widget", error);
    res.status(500).json({
      error: "Failed to create widget"
    });
  }
});
