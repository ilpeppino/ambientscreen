import { Router } from "express";
import { z } from "zod";
import { usersService } from "./users.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";
import { authService } from "../auth/auth.service";

export const usersRouter = Router();

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
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

    const passwordHash = await authService.hashPassword(result.data.password);
    const user = await usersService.createUser(result.data.email, passwordHash);
    res.status(201).json(user);
  })
);
