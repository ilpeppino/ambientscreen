import { Router } from "express";
import { widgetDataService } from "./widget-data.service";

export const widgetDataRouter = Router();

widgetDataRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await widgetDataService.getWidgetData(id);

    if (!result) {
      return res.status(404).json({
        error: "Widget not found"
      });
    }

    if (result.state === "error") {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Failed to get widget data", error);
    res.status(500).json({
      error: "Failed to get widget data"
    });
  }
});