import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { requireAuth, getRequestUserId } from "../auth/auth.middleware";
import { integrationsService } from "./integrations.service";
import { apiErrors } from "../../core/http/api-error";

export const integrationsRouter = Router();

// Protected: initiate Google OAuth
integrationsRouter.get(
  "/google/connect",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const oauthUrl = integrationsService.buildGoogleOAuthUrl(userId);
    res.redirect(oauthUrl);
  }),
);

// Public: Google OAuth callback — browser redirect from Google, no auth header
integrationsRouter.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      const frontendUrl = process.env.FRONTEND_URL?.trim() ?? "http://localhost:8081";
      res.redirect(`${frontendUrl}?integration_error=access_denied`);
      return;
    }

    if (typeof code !== "string" || typeof state !== "string") {
      throw apiErrors.validation("Missing code or state parameter");
    }

    try {
      const result = await integrationsService.handleGoogleCallback(code, state);
      res.redirect(result.redirectUrl);
    } catch (err) {
      const message = (err as Error).message;
      if (message === "INVALID_STATE") {
        throw apiErrors.unauthorized("Invalid or expired OAuth state");
      }
      if (message === "TOKEN_EXCHANGE_FAILED") {
        throw apiErrors.badRequest("Google token exchange failed");
      }
      throw err;
    }
  }),
);

// Protected: list user's integration connections (tokens redacted)
integrationsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const connections = await integrationsService.listConnections(userId);
    res.json({ connections });
  }),
);

// Protected: delete a connection
integrationsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const connectionId = String(req.params.id);

    try {
      await integrationsService.deleteConnection(connectionId, userId);
      res.status(204).send();
    } catch (err) {
      const message = (err as Error).message;
      if (message === "CONNECTION_NOT_FOUND") {
        throw apiErrors.notFound("Integration connection not found");
      }
      if (message === "FORBIDDEN") {
        throw apiErrors.forbidden("You do not own this connection");
      }
      throw err;
    }
  }),
);
