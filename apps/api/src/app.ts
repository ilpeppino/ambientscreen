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
import {
  globalErrorMiddleware,
  notFoundMiddleware
} from "./core/http/error-middleware";
import { requestLoggingMiddleware } from "./core/http/request-logging-middleware";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(requestLoggingMiddleware);
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/profiles", requireAuth, profilesRouter);
  app.use("/widgets", requireAuth, widgetsRouter);
  app.use("/widget-data", requireAuth, widgetDataRouter);
  app.use("/orchestration-rules", requireAuth, orchestrationRouter);
  app.use("/shared-sessions", requireAuth, sharedSessionsRouter);
  app.use("/", requireAuth, displayRouter);
  app.use(notFoundMiddleware);
  app.use(globalErrorMiddleware);

  return app;
}
