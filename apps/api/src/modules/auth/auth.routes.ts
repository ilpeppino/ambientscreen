import { Router } from "express";
import { z } from "zod";
import { authService } from "./auth.service";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";

export const authRouter = Router();

const authPayloadSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parseResult = authPayloadSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw apiErrors.validation("Invalid auth payload", parseResult.error.format());
    }

    try {
      const user = await authService.register(parseResult.data);
      res.status(201).json({ user });
    } catch (error) {
      if ((error as Error).message === "EMAIL_ALREADY_EXISTS") {
        throw apiErrors.duplicate("A user with this email already exists");
      }
      throw error;
    }
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parseResult = authPayloadSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw apiErrors.validation("Invalid auth payload", parseResult.error.format());
    }

    try {
      const result = await authService.login(parseResult.data);
      res.json(result);
    } catch (error) {
      if ((error as Error).message === "INVALID_CREDENTIALS") {
        throw apiErrors.unauthorized("Invalid email or password");
      }
      throw error;
    }
  }),
);
