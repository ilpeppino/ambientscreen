import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { getRequestUserId } from "../auth/auth.middleware";
import { createRateLimit } from "../../core/http/rate-limit";
import { pluginInstallationService } from "./pluginInstallation.service";

const installRateLimit = createRateLimit({ windowMs: 5 * 60 * 1000, max: 20 });

// ---------------------------------------------------------------------------
// /plugins/:pluginId/install
// ---------------------------------------------------------------------------

export const pluginInstallationRouter = Router();

/** POST /plugins/:pluginId/install — install a plugin */
pluginInstallationRouter.post(
  "/:pluginId/install",
  installRateLimit,
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const pluginId = Array.isArray(req.params.pluginId)
      ? req.params.pluginId[0]
      : req.params.pluginId;

    const installation = await pluginInstallationService.installPlugin(userId, pluginId);
    res.status(201).json(installation);
  }),
);

/** DELETE /plugins/:pluginId/install — uninstall a plugin */
pluginInstallationRouter.delete(
  "/:pluginId/install",
  installRateLimit,
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const pluginId = Array.isArray(req.params.pluginId)
      ? req.params.pluginId[0]
      : req.params.pluginId;

    await pluginInstallationService.uninstallPlugin(userId, pluginId);
    res.status(204).send();
  }),
);

/** PATCH /plugins/:pluginId/install — enable or disable an installed plugin */
pluginInstallationRouter.patch(
  "/:pluginId/install",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const pluginId = Array.isArray(req.params.pluginId)
      ? req.params.pluginId[0]
      : req.params.pluginId;

    const updated = await pluginInstallationService.updateInstallation(userId, pluginId, req.body);
    res.json(updated);
  }),
);

// ---------------------------------------------------------------------------
// /me/plugins
// ---------------------------------------------------------------------------

export const mePluginsRouter = Router();

/** GET /me/plugins — list installed plugins for current user */
mePluginsRouter.get(
  "/plugins",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const installations = await pluginInstallationService.listInstalledForUser(userId);

    const payload = installations.map((i) => ({
      id: i.id,
      pluginId: i.pluginId,
      isEnabled: i.isEnabled,
      installedAt: i.installedAt,
      plugin: {
        id: i.plugin.id,
        key: i.plugin.key,
        name: i.plugin.name,
        description: i.plugin.description,
        category: i.plugin.category,
        isPremium: i.plugin.isPremium,
        activeVersion: i.plugin.versions[0] ?? null,
      },
    }));

    res.json(payload);
  }),
);
