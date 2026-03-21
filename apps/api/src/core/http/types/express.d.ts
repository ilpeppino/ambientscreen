import type { AuthenticatedUser } from "../../../modules/auth/auth.service";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export {};
