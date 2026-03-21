import type { NextFunction, Request, Response } from "express";
import { apiErrors } from "../../core/http/api-error";
import { authService } from "./auth.service";

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

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    next(apiErrors.unauthorized("Missing or invalid Authorization header"));
    return;
  }

  try {
    req.authUser = authService.verifyToken(token);
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
