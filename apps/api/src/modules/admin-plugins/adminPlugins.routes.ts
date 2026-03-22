import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { apiErrors } from "../../core/http/api-error";
import { getRequestUserId } from "../auth/auth.middleware";
import { adminPluginsRepository } from "./adminPlugins.repository";
import { adminPluginsService } from "./adminPlugins.service";

// ---------------------------------------------------------------------------
// Admin guard middleware
// ---------------------------------------------------------------------------

async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const userId = getRequestUserId(req);
    const user = await adminPluginsRepository.findUserById(userId);

    if (!user?.isAdmin) {
      next(apiErrors.forbidden("Admin access required"));
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const adminPluginsRouter = Router();

// Apply admin guard to all routes in this router
adminPluginsRouter.use(requireAdmin);

/** GET /admin/plugins/pending — list plugins pending moderation */
adminPluginsRouter.get(
  "/pending",
  asyncHandler(async (_req, res) => {
    const plugins = await adminPluginsService.listPending();
    res.json(plugins);
  }),
);

/** POST /admin/plugins/:pluginId/approve — approve a plugin */
adminPluginsRouter.post(
  "/:pluginId/approve",
  asyncHandler(async (req, res) => {
    const adminId = getRequestUserId(req);
    const pluginId = Array.isArray(req.params.pluginId)
      ? req.params.pluginId[0]
      : req.params.pluginId;
    const plugin = await adminPluginsService.approvePlugin(pluginId, adminId);
    res.json(plugin);
  }),
);

/** POST /admin/plugins/:pluginId/reject — reject a plugin */
adminPluginsRouter.post(
  "/:pluginId/reject",
  asyncHandler(async (req, res) => {
    const adminId = getRequestUserId(req);
    const pluginId = Array.isArray(req.params.pluginId)
      ? req.params.pluginId[0]
      : req.params.pluginId;
    const plugin = await adminPluginsService.rejectPlugin(pluginId, adminId, req.body);
    res.json(plugin);
  }),
);

/** POST /admin/plugins/:pluginId/versions/:versionId/approve — approve a version */
adminPluginsRouter.post(
  "/:pluginId/versions/:versionId/approve",
  asyncHandler(async (req, res) => {
    const adminId = getRequestUserId(req);
    const pluginId = Array.isArray(req.params.pluginId)
      ? req.params.pluginId[0]
      : req.params.pluginId;
    const versionId = Array.isArray(req.params.versionId)
      ? req.params.versionId[0]
      : req.params.versionId;
    const version = await adminPluginsService.approveVersion(pluginId, versionId, adminId, req.body);
    res.json(version);
  }),
);

/** POST /admin/plugins/:pluginId/versions/:versionId/reject — reject a version */
adminPluginsRouter.post(
  "/:pluginId/versions/:versionId/reject",
  asyncHandler(async (req, res) => {
    const adminId = getRequestUserId(req);
    const pluginId = Array.isArray(req.params.pluginId)
      ? req.params.pluginId[0]
      : req.params.pluginId;
    const versionId = Array.isArray(req.params.versionId)
      ? req.params.versionId[0]
      : req.params.versionId;
    const version = await adminPluginsService.rejectVersion(pluginId, versionId, adminId, req.body);
    res.json(version);
  }),
);
