import { Router } from "express";
import { z } from "zod";
import { usersService } from "./users.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";
import { authService } from "../auth/auth.service";
import { getRequestUserId } from "../auth/auth.middleware";

export const usersRouter = Router();

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

/**
 * GET /users
 * Returns only the authenticated user's own profile.
 * Does NOT return all users — prevents user enumeration.
 */
usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const user = await usersService.findUserById(userId);
    if (!user) {
      throw apiErrors.notFound("User not found");
    }

    res.json([{ id: user.id, email: user.email }]);
  })
);

/**
 * GET /users/me
 * Returns the authenticated user's own profile as a single object.
 */
usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const user = await usersService.findUserById(userId);
    if (!user) {
      throw apiErrors.notFound("User not found");
    }

    res.json({ id: user.id, email: user.email });
  })
);

/**
 * POST /users
 * Creates a new user account. Protected by requireAuth at the app level —
 * callers must be authenticated. For unauthenticated registration, use
 * POST /auth/register instead.
 */
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
