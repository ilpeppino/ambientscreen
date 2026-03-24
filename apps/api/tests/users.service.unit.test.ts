import { afterEach, expect, test, vi } from "vitest";

vi.mock("../src/modules/users/users.repository", () => ({
  usersRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updatePlan: vi.fn(),
  },
}));

import { usersRepository } from "../src/modules/users/users.repository";
import { usersService } from "../src/modules/users/users.service";

afterEach(() => {
  vi.clearAllMocks();
});

test("getAllUsers delegates to repository", async () => {
  const users = [{ id: "user-1" }, { id: "user-2" }];
  vi.mocked(usersRepository.findAll).mockResolvedValue(users as never);

  const result = await usersService.getAllUsers();

  expect(usersRepository.findAll).toHaveBeenCalledTimes(1);
  expect(result).toEqual(users);
});

test("findUserById delegates to repository with id", async () => {
  const user = { id: "user-1", email: "owner@ambient.dev" };
  vi.mocked(usersRepository.findById).mockResolvedValue(user as never);

  const result = await usersService.findUserById("user-1");

  expect(usersRepository.findById).toHaveBeenCalledWith("user-1");
  expect(result).toEqual(user);
});

test("findUserByEmail delegates to repository with email", async () => {
  const user = { id: "user-1", email: "owner@ambient.dev" };
  vi.mocked(usersRepository.findByEmail).mockResolvedValue(user as never);

  const result = await usersService.findUserByEmail("owner@ambient.dev");

  expect(usersRepository.findByEmail).toHaveBeenCalledWith("owner@ambient.dev");
  expect(result).toEqual(user);
});

test("createUser delegates to repository with email and password hash", async () => {
  const created = { id: "user-1", email: "owner@ambient.dev" };
  vi.mocked(usersRepository.create).mockResolvedValue(created as never);

  const result = await usersService.createUser("owner@ambient.dev", "hashed-password");

  expect(usersRepository.create).toHaveBeenCalledWith("owner@ambient.dev", "hashed-password");
  expect(result).toEqual(created);
});

test("updateUserPlan delegates to repository with id and plan", async () => {
  const updated = { id: "user-1", plan: "pro" };
  vi.mocked(usersRepository.updatePlan).mockResolvedValue(updated as never);

  const result = await usersService.updateUserPlan("user-1", "pro");

  expect(usersRepository.updatePlan).toHaveBeenCalledWith("user-1", "pro");
  expect(result).toEqual(updated);
});
