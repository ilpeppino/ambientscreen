import express from "express";
import cors from "cors";

import { usersRouter } from "./modules/users/users.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { requireAuth } from "./modules/auth/auth.middleware";
import { profilesRouter } from "./modules/profiles/profiles.routes";
import { widgetsRouter } from "./modules/widgets/widgets.routes";
import { widgetDataRouter } from "./modules/widgetData/widget-data.routes";
import { displayRouter } from "./modules/display/display.routes";
import { orchestrationRouter } from "./modules/orchestration/orchestration.routes";
import { sharedSessionsRouter } from "./modules/sharedSessions/sharedSessions.routes";
import { devicesRouter } from "./modules/devices/devices.routes";
import { entitlementsRouter } from "./modules/entitlements/entitlements.routes";
import { pluginRegistryRouter } from "./modules/plugin-registry/pluginRegistry.routes";
import { pluginInstallationRouter, mePluginsRouter } from "./modules/plugin-installation/pluginInstallation.routes";
import { pluginPublishingRouter } from "./modules/plugin-publishing/pluginPublishing.routes";
import { adminPluginsRouter } from "./modules/admin-plugins/adminPlugins.routes";
import { registerBuiltinWidgetPlugins } from "./modules/widgets/registerBuiltinPlugins";
import { prisma } from "./core/db/prisma";
import {
  globalErrorMiddleware,
  notFoundMiddleware
} from "./core/http/error-middleware";
import { requestLoggingMiddleware } from "./core/http/request-logging-middleware";
import { requestIdMiddleware } from "./core/http/request-id-middleware";

export function createApp() {
  registerBuiltinWidgetPlugins();

  const app = express();

  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];
  const isProduction = process.env.NODE_ENV === "production";
  const corsOrigin = allowedOrigins.length > 0
    ? allowedOrigins
    : isProduction
      ? false
      : true;
  app.use(cors({ origin: corsOrigin }));
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable", reason: "db" });
    }
  });

  app.use("/auth", authRouter);
  app.use("/users", requireAuth, usersRouter);
  app.use("/profiles", requireAuth, profilesRouter);
  app.use("/widgets", requireAuth, widgetsRouter);
  app.use("/widget-data", requireAuth, widgetDataRouter);
  app.use("/orchestration-rules", requireAuth, orchestrationRouter);
  app.use("/shared-sessions", requireAuth, sharedSessionsRouter);
  app.use("/devices", requireAuth, devicesRouter);
  app.use("/entitlements", requireAuth, entitlementsRouter);
  app.use("/plugins", requireAuth, pluginRegistryRouter);
  app.use("/plugins", requireAuth, pluginInstallationRouter);
  app.use("/me", requireAuth, mePluginsRouter);
  app.use("/developer/plugins", requireAuth, pluginPublishingRouter);
  app.use("/admin/plugins", requireAuth, adminPluginsRouter);
  app.use("/", requireAuth, displayRouter);
  app.use(notFoundMiddleware);
  app.use(globalErrorMiddleware);

  return app;
}
