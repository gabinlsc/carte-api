import { compare, hashSync } from 'bcryptjs';
import type { AuthRepository } from '../repositories/auth.js';
import { AppError } from '../errors.js';
const dummyHash = hashSync('invalid-account-timing-equalization', 12);
export class AuthService {
  constructor(private readonly repo: AuthRepository) {}
  async login(username: string, password: string) {
    const user = this.repo.user(username);
    const valid = await compare(password, user?.passwordHash ?? dummyHash);
    if (!user || !valid)
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Identifiants incorrects');
    return this.repo.createSession(user.id);
  }
}
