import type { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export class AuthRepository {
  constructor(private readonly db: DatabaseSync) {}
  user(username: string): { id: number; passwordHash: string } | undefined {
    const row = this.db
      .prepare('SELECT id,password_hash FROM users WHERE username=?')
      .get(username);
    return row
      ? { id: Number(row.id), passwordHash: String(row.password_hash) }
      : undefined;
  }
  createUser(username: string, passwordHash: string): void {
    this.db
      .prepare('INSERT INTO users(username,password_hash) VALUES(?,?)')
      .run(username, passwordHash);
  }
  createSession(userId: number): { token: string; csrf: string } {
    this.db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
    const token = randomBytes(32).toString('hex');
    const csrf = randomBytes(32).toString('hex');
    this.db
      .prepare('INSERT INTO sessions VALUES(?,?,?,?)')
      .run(hash(token), userId, csrf, Date.now() + 8 * 60 * 60 * 1000);
    return { token, csrf };
  }
  session(token: string): { userId: number; csrf: string } | undefined {
    const row = this.db
      .prepare(
        'SELECT user_id,csrf FROM sessions WHERE token_hash=? AND expires_at>?',
      )
      .get(hash(token), Date.now());
    return row
      ? { userId: Number(row.user_id), csrf: String(row.csrf) }
      : undefined;
  }
  deleteSession(token: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
  }
}
