import { usersRepository } from "./users.repository";

export const usersService = {
  getAllUsers() {
    return usersRepository.findAll();
  },

  findUserById(id: string) {
    return usersRepository.findById(id);
  },

  findUserByEmail(email: string) {
    return usersRepository.findByEmail(email);
  },

  createUser(email: string, passwordHash: string) {
    return usersRepository.create(email, passwordHash);
  },

  updateUserPlan(id: string, plan: "free" | "pro") {
    return usersRepository.updatePlan(id, plan);
  },
};
