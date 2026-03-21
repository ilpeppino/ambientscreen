import express from "express";
import cors from "cors";

import { usersRouter } from "./modules/users/users.routes";
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

  app.use("/users", usersRouter);
  app.use("/profiles", profilesRouter);
  app.use("/widgets", widgetsRouter);
  app.use("/widget-data", widgetDataRouter);
  app.use("/orchestration-rules", orchestrationRouter);
  app.use("/shared-sessions", sharedSessionsRouter);
  app.use("/", displayRouter);
  app.use(notFoundMiddleware);
  app.use(globalErrorMiddleware);

  return app;
}
