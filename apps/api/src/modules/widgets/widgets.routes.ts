import { Router } from "express";
import { z } from "zod";
import { widgetsService } from "./widgets.service";

export const widgetsRouter = Router();

const USER_ID = "f590b410-1e99-4245-b8ae-698d705a9fe4";

widgetsRouter.get("/", async (_req, res) => {
  const widgets = await widgetsService.getUserWidgets(USER_ID);
  res.json(widgets);
});

widgetsRouter.post("/", async (req, res) => {
  const schema = z.object({
    type: z.string(),
    config: z.unknown(),
    position: z.number()
  });

  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json(result.error.format());
  }

  const { type, config, position } = result.data;

  const widget = await widgetsService.createWidget({
    userId: USER_ID,
    type,
    config,
    position
  });

  res.status(201).json(widget);
});