import { Router } from "express";
import {
  createWidgetSchema,
  normalizeWidgetConfig,
  updateWidgetConfigPayloadSchema,
  updateWidgetsLayoutSchema,
} from "./widget-contracts";
import { widgetsService } from "./widgets.service";
import { usersService } from "../users/users.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";

export const widgetsRouter = Router();

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

    const { type, config, layout } = result.data;
    const widget = await widgetsService.createWidgetAtNextPosition({
      userId,
      type,
      config: normalizeWidgetConfig(type, config),
      layout,
    });

    res.status(201).json(widget);
  })
);

widgetsRouter.patch(
  "/layout",
  asyncHandler(async (req, res) => {
    const userId = await getPrimaryUserId();
    const parseResult = updateWidgetsLayoutSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw apiErrors.validation("Invalid widgets layout payload", parseResult.error.format());
    }

    const updatedWidgets = await widgetsService.updateWidgetsLayoutForUser({
      userId,
      widgets: parseResult.data.widgets,
    });

    res.json({
      widgets: updatedWidgets,
    });
  }),
);

widgetsRouter.patch(
  "/:id/config",
  asyncHandler(async (req, res) => {
    const userId = await getPrimaryUserId();
    const idParam = req.params.id;
    const widgetId = Array.isArray(idParam) ? idParam[0] : idParam;
    const parseResult = updateWidgetConfigPayloadSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw apiErrors.validation("Invalid widget config payload", parseResult.error.format());
    }

    const updatedWidget = await widgetsService.updateWidgetConfigForUser({
      userId,
      widgetId,
      configPatch: parseResult.data.config,
    });

    if (!updatedWidget) {
      throw apiErrors.notFound("Widget not found");
    }

    res.json(updatedWidget);
  }),
);

widgetsRouter.patch(
  "/:id/active",
  asyncHandler(async (req, res) => {
    const userId = await getPrimaryUserId();
    const idParam = req.params.id;
    const widgetId = Array.isArray(idParam) ? idParam[0] : idParam;
    const activatedWidget = await widgetsService.activateWidgetForUser({
      userId,
      widgetId
    });

    if (!activatedWidget) {
      throw apiErrors.notFound("Widget not found");
    }

    res.json(activatedWidget);
  })
);
