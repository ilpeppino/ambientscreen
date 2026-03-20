import { Router } from "express";
import { z } from "zod";
import { usersService } from "./users.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";

export const usersRouter = Router();

const createUserSchema = z.object({
  email: z.string().email()
});

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await usersService.getAllUsers();
    res.json(users);
  })
);

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = createUserSchema.safeParse(req.body);

    if (!result.success) {
      throw apiErrors.validation("Invalid user payload", result.error.format());
    }

    const existingUser = await usersService.findUserByEmail(result.data.email);

    if (existingUser) {
      throw apiErrors.duplicate("A user with this email already exists");
    }

    const user = await usersService.createUser(result.data.email);
    res.status(201).json(user);
  })
);
