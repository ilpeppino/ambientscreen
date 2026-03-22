import type { AuthenticatedUser } from "../../../modules/auth/auth.service";

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthenticatedUser;
    /** UUID attached by requestIdMiddleware; included in X-Request-Id response header */
    requestId?: string;
  }
}

export {};
