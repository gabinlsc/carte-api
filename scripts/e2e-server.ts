import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { hashSync } from 'bcryptjs';
const { app, db, auth } = createApp(
  loadConfig({
    NODE_ENV: 'test',
    DATABASE_PATH: ':memory:',
    PUBLIC_ORIGIN: 'http://127.0.0.1:3001',
    PORT: '3001',
  }),
);
auth.createUser('reviewer', hashSync('e2e-test-password', 4));
const server = app.listen(3001, '127.0.0.1');
process.on('SIGTERM', () =>
  server.close(() => {
    db.close();
    process.exit(0);
  }),
);
