import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getAuthJwtSecret } from "../../core/config/env";
import { usersService } from "../users/users.service";

const PASSWORD_SALT_ROUNDS = 10;
const AUTH_TOKEN_EXPIRES_IN = "7d";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

interface AuthTokenPayload {
  userId: string;
  email: string;
}

function toPublicUser(user: { id: string; email: string | null }): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email ?? "",
  };
}

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  },

  async register(input: { email: string; password: string }): Promise<AuthenticatedUser> {
    const existingUser = await usersService.findUserByEmail(input.email);
    if (existingUser) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await this.hashPassword(input.password);
    const user = await usersService.createUser(input.email, passwordHash);

    return toPublicUser(user);
  },

  async login(input: { email: string; password: string }): Promise<{ token: string; user: AuthenticatedUser }> {
    const user = await usersService.findUserByEmail(input.email);
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("INVALID_CREDENTIALS");
    }

    return {
      token: this.createToken({ userId: user.id, email: user.email ?? input.email }),
      user: toPublicUser(user),
    };
  },

  createToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, getAuthJwtSecret(), {
      expiresIn: AUTH_TOKEN_EXPIRES_IN,
    });
  },

  verifyToken(token: string): AuthenticatedUser {
    const payload = jwt.verify(token, getAuthJwtSecret()) as AuthTokenPayload;

    if (!payload.userId || !payload.email) {
      throw new Error("INVALID_TOKEN_PAYLOAD");
    }

    return {
      id: payload.userId,
      email: payload.email,
    };
  },
};
