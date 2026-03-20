import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { usersService } from "./users.service";

export const usersRouter = Router();

function isDuplicateEmailError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002";
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    return (error as { code?: unknown }).code === "P2002";
  }

  return false;
}

usersRouter.get("/", async (_req, res) => {
  try {
    const users = await usersService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Failed to get users", error);
    res.status(500).json({
      error: "Failed to get users"
    });
  }
});

usersRouter.post("/", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email()
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json(result.error.format());
    }

    const existingUser = await usersService.findUserByEmail(result.data.email);

    if (existingUser) {
      return res.status(409).json({
        error: "A user with this email already exists"
      });
    }

    const user = await usersService.createUser(result.data.email);

    res.status(201).json(user);
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return res.status(409).json({
        error: "A user with this email already exists"
      });
    }

    console.error("Failed to create user", error);
    res.status(500).json({
      error: "Failed to create user"
    });
  }
});
