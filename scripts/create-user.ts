import 'dotenv/config';
import { hashSync } from 'bcryptjs';
import { openDatabase } from '../src/repositories/database.js';
import { AuthRepository } from '../src/repositories/auth.js';
const username = process.argv[2];
const password = process.env.NEW_USER_PASSWORD;
if (
  !username ||
  !/^.{2,80}$/.test(username) ||
  !password ||
  password.length < 12 ||
  Buffer.byteLength(password) > 72
)
  throw new Error(
    'Provide username and NEW_USER_PASSWORD (12 characters minimum, 72 bytes maximum)',
  );
const db = openDatabase(process.env.DATABASE_PATH ?? 'data/carte.sqlite');
try {
  new AuthRepository(db).createUser(username, hashSync(password, 12));
  console.log('User created');
} finally {
  db.close();
}
