import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { integrationsController } from "./integrations.controller";

export const integrationsRouter = Router();

integrationsRouter.get("/", asyncHandler((req, res) => integrationsController.listConnections(req, res)));
integrationsRouter.get("/:integrationConnectionId", asyncHandler((req, res) => integrationsController.getConnection(req, res)));
integrationsRouter.patch("/:integrationConnectionId", asyncHandler((req, res) => integrationsController.updateConnection(req, res)));
integrationsRouter.delete("/:integrationConnectionId", asyncHandler((req, res) => integrationsController.deleteConnection(req, res)));
integrationsRouter.post("/:integrationConnectionId/refresh", asyncHandler((req, res) => integrationsController.refreshConnection(req, res)));
