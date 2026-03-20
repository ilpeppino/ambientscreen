import express from "express";
import cors from "cors";

import { usersRouter } from "./modules/users/users.routes";
import { widgetsRouter } from "./modules/widgets/widgets.routes";
import { widgetDataRouter } from "./modules/widgetData/widget-data.routes";
import {
  globalErrorMiddleware,
  notFoundMiddleware
} from "./core/http/error-middleware";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/users", usersRouter);
  app.use("/widgets", widgetsRouter);
  app.use("/widget-data", widgetDataRouter);
  app.use(notFoundMiddleware);
  app.use(globalErrorMiddleware);

  return app;
}
