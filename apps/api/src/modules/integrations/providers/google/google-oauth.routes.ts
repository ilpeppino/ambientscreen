import { Router } from "express";
import { requireAuth } from "../../../auth/auth.middleware";
import { asyncHandler } from "../../../../core/http/async-handler";
import { googleOAuthController } from "./google-oauth.controller";
import { createRateLimit } from "../../../../core/http/rate-limit";

export const googleOAuthRouter = Router();

googleOAuthRouter.use(
  "/google/start",
  createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: "Too many OAuth requests, please try again later",
  }),
);

googleOAuthRouter.get("/google/start", requireAuth, asyncHandler((req, res) => googleOAuthController.start(req, res)));
googleOAuthRouter.get("/google/callback", asyncHandler((req, res) => googleOAuthController.callback(req, res)));
googleOAuthRouter.get("/google/calendars", requireAuth, asyncHandler((req, res) => googleOAuthController.listCalendars(req, res)));
googleOAuthRouter.get("/google/tasks/lists", requireAuth, asyncHandler((req, res) => googleOAuthController.listTaskLists(req, res)));
googleOAuthRouter.get("/google/gmail/labels", requireAuth, asyncHandler((req, res) => googleOAuthController.listGmailLabels(req, res)));
