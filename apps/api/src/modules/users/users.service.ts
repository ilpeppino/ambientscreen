import { usersRepository } from "./users.repository";

export const usersService = {
  getAllUsers() {
    return usersRepository.findAll();
  },

  findUserByEmail(email: string) {
    return usersRepository.findByEmail(email);
  },

  createUser(email: string) {
    return usersRepository.create(email);
  }
};