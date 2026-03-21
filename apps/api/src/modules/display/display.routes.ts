import { Router } from "express";
import { usersService } from "../users/users.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";
import { displayService } from "./display.service";

export const displayRouter = Router();

async function getPrimaryUserId(): Promise<string> {
  const users = await usersService.getAllUsers();

  if (users.length === 0) {
    throw apiErrors.badRequest("No users exist yet. Create a user first.");
  }

  return users[0].id;
}

displayRouter.get(
  "/display-layout",
  asyncHandler(async (_req, res) => {
    const userId = await getPrimaryUserId();
    const result = await displayService.getDisplayLayout(userId);
    res.json(result);
  }),
);
