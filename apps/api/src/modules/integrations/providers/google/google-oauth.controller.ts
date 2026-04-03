import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getRequestUserId } from "../../../auth/auth.middleware";
import { googleOAuthService } from "./google-oauth.service";
import { apiErrors } from "../../../../core/http/api-error";
import {
  googleCalendarsQuerySchema,
  googleGmailLabelsQuerySchema,
  googleTaskListsQuerySchema,
} from "../../integrations.schemas";
import { getAppBaseUrl, getAuthJwtSecret } from "../../../../core/config/env";
import { isAllowedReturnTo } from "./google-oauth.utils";
import { integrationsService } from "../../integrations.service";

export const googleOAuthController = {
  async start(req: Request, res: Response): Promise<void> {
    // Extract userId from either Authorization header (normal) or token query param (OAuth start from browser)
    let userId: string;

    try {
      // Try getting from request (set by requireAuth middleware)
      userId = getRequestUserId(req);
    } catch {
      // Fall back to token query param for browser OAuth flows
      const tokenParam = typeof req.query.token === "string" ? req.query.token : undefined;
      if (!tokenParam) {
        throw apiErrors.unauthorized("Missing or invalid Authorization header");
      }

      try {
        const decoded = jwt.verify(tokenParam, getAuthJwtSecret()) as { userId: string };
        userId = decoded.userId;
      } catch {
        throw apiErrors.unauthorized("Invalid token");
      }
    }

    let returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;

    // Discard returnTo values that are not in the allowlist to prevent open redirects
    if (returnTo && !isAllowedReturnTo(returnTo, getAppBaseUrl())) {
      returnTo = undefined;
    }

    const authUrl = googleOAuthService.buildAuthorizationUrl(userId, returnTo);
    res.redirect(302, authUrl);
  },

  async callback(req: Request, res: Response): Promise<void> {
    const query = {
      code: typeof req.query.code === "string" ? req.query.code : undefined,
      state: typeof req.query.state === "string" ? req.query.state : undefined,
      error: typeof req.query.error === "string" ? req.query.error : undefined,
    };

    const result = await googleOAuthService.handleCallback(query);
    res.redirect(302, result.redirectUrl);
  },

  async listCalendars(req: Request, res: Response): Promise<void> {
    const userId = getRequestUserId(req);
    const parseResult = googleCalendarsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw apiErrors.validation(
        "integrationConnectionId is required and must be a valid UUID",
        parseResult.error.format(),
      );
    }

    const { integrationConnectionId } = parseResult.data;
    const items = await integrationsService.listGoogleCalendars(userId, integrationConnectionId);
    res.json({ items });
  },

  async listTaskLists(req: Request, res: Response): Promise<void> {
    const userId = getRequestUserId(req);
    const parseResult = googleTaskListsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw apiErrors.validation(
        "integrationConnectionId is required and must be a valid UUID",
        parseResult.error.format(),
      );
    }

    const { integrationConnectionId } = parseResult.data;
    const items = await integrationsService.listGoogleTaskLists(userId, integrationConnectionId);
    res.json({ items });
  },

  async listGmailLabels(req: Request, res: Response): Promise<void> {
    const userId = getRequestUserId(req);
    const parseResult = googleGmailLabelsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw apiErrors.validation(
        "integrationConnectionId is required and must be a valid UUID",
        parseResult.error.format(),
      );
    }

    const { integrationConnectionId } = parseResult.data;
    const items = await integrationsService.listGoogleGmailLabels(userId, integrationConnectionId);
    res.json({ items });
  },
};
