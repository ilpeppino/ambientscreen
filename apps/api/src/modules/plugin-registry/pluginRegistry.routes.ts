import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { apiErrors } from "../../core/http/api-error";
import { pluginRegistryService } from "./pluginRegistry.service";

export const pluginRegistryRouter = Router();

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

/** GET /plugins — list approved plugins */
pluginRegistryRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const plugins = await pluginRegistryService.listApproved();
    const payload = plugins.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description,
      category: p.category,
      isPremium: p.isPremium,
      activeVersion: p.activeVersion
        ? { version: p.activeVersion.version, isActive: true }
        : null,
    }));
    res.json(payload);
  }),
);

/** GET /plugins/:key — get plugin with active version manifest */
pluginRegistryRouter.get(
  "/:key",
  asyncHandler(async (req, res) => {
    const keyParam = req.params.key;
    const key = Array.isArray(keyParam) ? keyParam[0] : keyParam;
    const plugin = await pluginRegistryService.getByKey(key);

    if (!plugin.isApproved) {
      throw apiErrors.notFound(`Plugin '${key}' not found`);
    }

    res.json({
      id: plugin.id,
      key: plugin.key,
      name: plugin.name,
      description: plugin.description,
      category: plugin.category,
      isPremium: plugin.isPremium,
      activeVersion: plugin.activeVersion
        ? {
            id: plugin.activeVersion.id,
            version: plugin.activeVersion.version,
            manifestJson: plugin.activeVersion.manifestJson,
            changelog: plugin.activeVersion.changelog,
          }
        : null,
    });
  }),
);

// ---------------------------------------------------------------------------
// Admin / internal endpoints
// ---------------------------------------------------------------------------

/** POST /plugins — create plugin metadata */
pluginRegistryRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const plugin = await pluginRegistryService.createPlugin(req.body);
    res.status(201).json(plugin);
  }),
);

/** POST /plugins/:id/versions — add a new version */
pluginRegistryRouter.post(
  "/:id/versions",
  asyncHandler(async (req, res) => {
    const idParam = req.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const version = await pluginRegistryService.createVersion(id, req.body);
    res.status(201).json(version);
  }),
);

/** PATCH /plugins/:id/approve — set isApproved */
pluginRegistryRouter.patch(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const isApproved = req.body?.isApproved;
    if (typeof isApproved !== "boolean") {
      throw apiErrors.validation("isApproved must be a boolean");
    }
    const idParam = req.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const plugin = await pluginRegistryService.setApproval(id, isApproved);
    res.json(plugin);
  }),
);
