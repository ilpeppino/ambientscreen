import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { getRequestUserId } from "../auth/auth.middleware";
import { pluginPublishingService } from "./pluginPublishing.service";

export const pluginPublishingRouter = Router();

/** POST /developer/plugins — create a new plugin */
pluginPublishingRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const authorId = getRequestUserId(req);
    const plugin = await pluginPublishingService.createPlugin(authorId, req.body);
    res.status(201).json(plugin);
  }),
);

/** GET /developer/plugins — list my plugins */
pluginPublishingRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const authorId = getRequestUserId(req);
    const plugins = await pluginPublishingService.listMyPlugins(authorId);
    res.json(plugins);
  }),
);

/** GET /developer/plugins/:pluginId — get plugin details */
pluginPublishingRouter.get(
  "/:pluginId",
  asyncHandler(async (req, res) => {
    const authorId = getRequestUserId(req);
    const pluginId = Array.isArray(req.params.pluginId)
      ? req.params.pluginId[0]
      : req.params.pluginId;
    const plugin = await pluginPublishingService.getMyPlugin(authorId, pluginId);
    res.json(plugin);
  }),
);

/** PATCH /developer/plugins/:pluginId — update plugin metadata */
pluginPublishingRouter.patch(
  "/:pluginId",
  asyncHandler(async (req, res) => {
    const authorId = getRequestUserId(req);
    const pluginId = Array.isArray(req.params.pluginId)
      ? req.params.pluginId[0]
      : req.params.pluginId;
    const plugin = await pluginPublishingService.updatePlugin(authorId, pluginId, req.body);
    res.json(plugin);
  }),
);

/** POST /developer/plugins/:pluginId/versions — publish a new version */
pluginPublishingRouter.post(
  "/:pluginId/versions",
  asyncHandler(async (req, res) => {
    const authorId = getRequestUserId(req);
    const pluginId = Array.isArray(req.params.pluginId)
      ? req.params.pluginId[0]
      : req.params.pluginId;
    const version = await pluginPublishingService.publishVersion(authorId, pluginId, req.body);
    res.status(201).json(version);
  }),
);
