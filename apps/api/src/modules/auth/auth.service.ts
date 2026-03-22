import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getAuthJwtSecret } from "../../core/config/env";
import { usersService } from "../users/users.service";
import { tokenBlocklistRepository } from "./tokenBlocklist.repository";

const PASSWORD_SALT_ROUNDS = 10;
const AUTH_TOKEN_EXPIRES_IN = "7d";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

interface AuthTokenPayload {
  userId: string;
  email: string;
  jti: string;
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

  createToken(payload: { userId: string; email: string }): string {
    const jti = randomUUID();
    return jwt.sign({ ...payload, jti }, getAuthJwtSecret(), {
      expiresIn: AUTH_TOKEN_EXPIRES_IN,
    });
  },

  verifyTokenFull(token: string): { user: AuthenticatedUser; jti: string; exp: number } {
    const payload = jwt.verify(token, getAuthJwtSecret()) as AuthTokenPayload & { exp: number };

    if (!payload.userId || !payload.email || !payload.jti) {
      throw new Error("INVALID_TOKEN_PAYLOAD");
    }

    return {
      user: { id: payload.userId, email: payload.email },
      jti: payload.jti,
      exp: payload.exp,
    };
  },

  verifyToken(token: string): AuthenticatedUser {
    return this.verifyTokenFull(token).user;
  },

  async revokeToken(token: string): Promise<void> {
    const { jti, exp } = this.verifyTokenFull(token);
    await tokenBlocklistRepository.block(jti, new Date(exp * 1000));
  },
};
