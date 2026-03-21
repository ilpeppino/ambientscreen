import type { AuthenticatedUser } from "../../../modules/auth/auth.service";

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthenticatedUser;
  }
}

export {};
