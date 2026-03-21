import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { authService } from "../src/modules/auth/auth.service";
import { usersService } from "../src/modules/users/users.service";

beforeEach(() => {
  process.env.AUTH_JWT_SECRET = "test-auth-secret";
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("register hashes password and creates user", async () => {
  vi.spyOn(usersService, "findUserByEmail").mockResolvedValue(null as never);
  const createUserSpy = vi.spyOn(usersService, "createUser").mockImplementation(async (email, passwordHash) => {
    return {
      id: "user-1",
      email,
      passwordHash,
      createdAt: new Date(),
    } as never;
  });

  const result = await authService.register({
    email: "owner@ambient.dev",
    password: "password123",
  });

  expect(result).toEqual({
    id: "user-1",
    email: "owner@ambient.dev",
  });
  expect(createUserSpy).toHaveBeenCalledTimes(1);
  expect(createUserSpy.mock.calls[0][1]).not.toBe("password123");
});

test("login returns token for valid credentials", async () => {
  const passwordHash = await authService.hashPassword("password123");
  vi.spyOn(usersService, "findUserByEmail").mockResolvedValue({
    id: "user-1",
    email: "owner@ambient.dev",
    passwordHash,
    createdAt: new Date(),
  } as never);

  const result = await authService.login({
    email: "owner@ambient.dev",
    password: "password123",
  });

  expect(result.user.id).toBe("user-1");
  expect(result.user.email).toBe("owner@ambient.dev");
  expect(typeof result.token).toBe("string");

  const verified = authService.verifyToken(result.token);
  expect(verified).toEqual({
    id: "user-1",
    email: "owner@ambient.dev",
  });
});

test("login rejects invalid credentials", async () => {
  vi.spyOn(usersService, "findUserByEmail").mockResolvedValue(null as never);

  await expect(
    authService.login({
      email: "owner@ambient.dev",
      password: "password123",
    }),
  ).rejects.toThrow("INVALID_CREDENTIALS");
});
