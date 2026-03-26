import type { Request, Response } from "express";
import { getRequestUserId } from "../auth/auth.middleware";
import { integrationsService } from "./integrations.service";
import { integrationConnectionIdSchema, listConnectionsQuerySchema, patchConnectionSchema } from "./integrations.schemas";
import { apiErrors } from "../../core/http/api-error";

export const integrationsController = {
  async listConnections(req: Request, res: Response): Promise<void> {
    const userId = getRequestUserId(req);
    const parseResult = listConnectionsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid query parameters", parseResult.error.format());
    }
    const items = await integrationsService.listConnections(userId, parseResult.data);
    res.json({ items });
  },

  async getConnection(req: Request, res: Response): Promise<void> {
    const userId = getRequestUserId(req);
    const idParse = integrationConnectionIdSchema.safeParse(req.params.integrationConnectionId);
    if (!idParse.success) {
      throw apiErrors.validation("Invalid connection ID", idParse.error.format());
    }
    const summary = await integrationsService.getConnectionById(userId, idParse.data);
    res.json(summary);
  },

  async updateConnection(req: Request, res: Response): Promise<void> {
    const userId = getRequestUserId(req);
    const idParse = integrationConnectionIdSchema.safeParse(req.params.integrationConnectionId);
    if (!idParse.success) {
      throw apiErrors.validation("Invalid connection ID", idParse.error.format());
    }
    const bodyParse = patchConnectionSchema.safeParse(req.body);
    if (!bodyParse.success) {
      throw apiErrors.validation("Invalid update payload", bodyParse.error.format());
    }
    const summary = await integrationsService.updateConnectionLabel(userId, idParse.data, bodyParse.data);
    res.json(summary);
  },

  async deleteConnection(req: Request, res: Response): Promise<void> {
    const userId = getRequestUserId(req);
    const idParse = integrationConnectionIdSchema.safeParse(req.params.integrationConnectionId);
    if (!idParse.success) {
      throw apiErrors.validation("Invalid connection ID", idParse.error.format());
    }
    await integrationsService.deleteConnection(userId, idParse.data);
    res.status(204).send();
  },

  async refreshConnection(req: Request, res: Response): Promise<void> {
    const userId = getRequestUserId(req);
    const idParse = integrationConnectionIdSchema.safeParse(req.params.integrationConnectionId);
    if (!idParse.success) {
      throw apiErrors.validation("Invalid connection ID", idParse.error.format());
    }
    const summary = await integrationsService.refreshConnection(userId, idParse.data);
    res.json(summary);
  },
};
