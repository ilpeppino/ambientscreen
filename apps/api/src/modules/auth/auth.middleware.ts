import type { NextFunction, Request, Response } from "express";
import { apiErrors } from "../../core/http/api-error";
import { authService } from "./auth.service";
import { tokenBlocklistRepository } from "./tokenBlocklist.repository";
import { usersService } from "../users/users.service";

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    next(apiErrors.unauthorized("Missing or invalid Authorization header"));
    return;
  }

  try {
    const { user, jti } = authService.verifyTokenFull(token);
    const revoked = await tokenBlocklistRepository.isBlocked(jti);
    if (revoked) {
      next(apiErrors.unauthorized("Token has been revoked"));
      return;
    }

    const existingUser = await usersService.findUserById(user.id);
    if (!existingUser) {
      next(apiErrors.unauthorized("User account no longer exists"));
      return;
    }

    req.authUser = user;
    next();
  } catch {
    next(apiErrors.unauthorized("Invalid or expired token"));
  }
}

export function getRequestUserId(req: Request): string {
  if (!req.authUser?.id) {
    throw apiErrors.unauthorized("Authentication is required");
  }

  return req.authUser.id;
}
