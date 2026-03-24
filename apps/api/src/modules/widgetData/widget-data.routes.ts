import { Router } from "express";
import { widgetDataService } from "./widget-data.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";
import { getRequestUserId } from "../auth/auth.middleware";

export const widgetDataRouter = Router();

widgetDataRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const idParam = req.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;

    const result = await widgetDataService.getWidgetDataForUser(id, userId);

    if (!result) {
      throw apiErrors.notFound("Widget not found");
    }

    if (result.state === "error") {
      throw apiErrors.badRequest("Widget data could not be resolved", result.meta);
    }

    res.json(result);
  })
);
