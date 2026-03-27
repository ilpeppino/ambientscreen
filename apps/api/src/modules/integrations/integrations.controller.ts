import type { Request, Response } from "express";
import { getRequestUserId } from "../auth/auth.middleware";
import { integrationsService } from "./integrations.service";
import {
  integrationConnectionIdSchema,
  listConnectionsQuerySchema,
  patchConnectionSchema,
} from "./integrations.schemas";
import { apiErrors } from "../../core/http/api-error";
import { SUPPORTED_PROVIDERS } from "./integrations.types";
import { isAllowedReturnTo } from "./providers/google/google-oauth.utils";
import { getAppBaseUrl } from "../../core/config/env";

export const integrationsController = {
  async listProviders(_req: Request, res: Response): Promise<void> {
    res.json({ items: integrationsService.listProviders() });
  },

  async listConnections(req: Request, res: Response): Promise<void> {
    const userId = getRequestUserId(req);
    const parseResult = listConnectionsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid query parameters", parseResult.error.format());
    }
    const items = await integrationsService.listConnections(userId, parseResult.data);
    res.json({ items });
  },

  async startProviderConnection(req: Request, res: Response): Promise<void> {
    const userId = getRequestUserId(req);
    const provider = req.params.provider;
    if (!SUPPORTED_PROVIDERS.includes(provider as (typeof SUPPORTED_PROVIDERS)[number])) {
      throw apiErrors.integrationProviderMismatch("Unsupported provider.");
    }

    const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;
    const safeReturnTo = returnTo && isAllowedReturnTo(returnTo, getAppBaseUrl()) ? returnTo : undefined;

    const authorizationUrl = await integrationsService.getProviderConnectAuthorizationUrl(
      userId,
      provider as (typeof SUPPORTED_PROVIDERS)[number],
      safeReturnTo,
    );

    res.json({ authorizationUrl });
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
