import { Router } from "express";
import {
  createWidgetSchema,
  normalizeWidgetConfig,
  type SupportedWidgetType,
  updateWidgetConfigPayloadSchema,
  updateWidgetsLayoutSchema,
} from "./widget-contracts";
import { getWidgetPlugin } from "./widgetPluginRegistry";
import { widgetsService } from "./widgets.service";
import { profilesService } from "../profiles/profiles.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";
import { getRequestUserId } from "../auth/auth.middleware";
import { assertFeatureAccess } from "../entitlements/entitlements.service";
import { usersService } from "../users/users.service";
import { pluginInstallationService } from "../plugin-installation/pluginInstallation.service";

export const widgetsRouter = Router();

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

widgetsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const profileId = await resolveRequestProfileId(userId, getQueryProfileId(req.query?.profileId));
    const widgets = await widgetsService.getProfileWidgets(profileId);
    res.json(widgets);
  })
);

widgetsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const result = createWidgetSchema.safeParse(req.body);

    if (!result.success) {
      throw apiErrors.validation("Invalid widget payload", result.error.format());
    }

    const bodyProfileId = result.data.profileId;
    const profileId = await resolveRequestProfileId(
      userId,
      bodyProfileId ?? getQueryProfileId(req.query?.profileId),
    );

    const { type, config, layout } = result.data as {
      type: SupportedWidgetType;
      config?: unknown;
      layout?: {
        x: number;
        y: number;
        w: number;
        h: number;
      };
    };

    await pluginInstallationService.assertPluginInstalledAndEnabled(userId, type);


    const plugin = getWidgetPlugin(type);
    if (plugin?.manifest.premium) {
      const user = await usersService.findUserById(userId);
      if (!user) {
        throw apiErrors.notFound("User not found");
      }
      assertFeatureAccess(user, "premium_widgets");
    }

    const widget = await widgetsService.createWidgetAtNextPosition({
      profileId,
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
    const userId = getRequestUserId(req);
    const profileId = await resolveRequestProfileId(userId, getQueryProfileId(req.query?.profileId));
    const parseResult = updateWidgetsLayoutSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw apiErrors.validation("Invalid widgets layout payload", parseResult.error.format());
    }

    const updatedWidgets = await widgetsService.updateWidgetsLayoutForProfile({
      profileId,
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
    const userId = getRequestUserId(req);
    const profileId = await resolveRequestProfileId(userId, getQueryProfileId(req.query?.profileId));
    const idParam = req.params.id;
    const widgetId = Array.isArray(idParam) ? idParam[0] : idParam;
    const parseResult = updateWidgetConfigPayloadSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw apiErrors.validation("Invalid widget config payload", parseResult.error.format());
    }

    const updatedWidget = await widgetsService.updateWidgetConfigForProfile({
      profileId,
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
    const userId = getRequestUserId(req);
    const profileId = await resolveRequestProfileId(userId, getQueryProfileId(req.query?.profileId));
    const idParam = req.params.id;
    const widgetId = Array.isArray(idParam) ? idParam[0] : idParam;
    const activatedWidget = await widgetsService.activateWidgetForProfile({
      profileId,
      widgetId
    });

    if (!activatedWidget) {
      throw apiErrors.notFound("Widget not found");
    }

    res.json(activatedWidget);
  })
);

widgetsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const profileId = await resolveRequestProfileId(userId, getQueryProfileId(req.query?.profileId));
    const idParam = req.params.id;
    const widgetId = Array.isArray(idParam) ? idParam[0] : idParam;

    const deletedWidget = await widgetsService.deleteWidgetForProfile({
      profileId,
      widgetId,
    });

    if (!deletedWidget) {
      throw apiErrors.notFound("Widget not found");
    }

    res.status(204).send();
  }),
);
