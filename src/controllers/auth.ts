import { Router } from 'express';
import type { Config } from '../config.js';
import type { AuthService } from '../services/auth.js';
import type { AuthRepository } from '../repositories/auth.js';
import type { DatabaseSync } from 'node:sqlite';
import {
  authenticate,
  rateLimit,
  sessionToken,
} from '../middleware/security.js';
import { loginSchema } from '../validators/schemas.js';
export function authRouter(
  service: AuthService,
  repo: AuthRepository,
  db: DatabaseSync,
  config: Config,
): Router {
  const router = Router();
  const cookie = {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  };
  router.post(
    '/login',
    rateLimit(db, 'login', 10, 15 * 60 * 1000),
    async (req, res) => {
      const body = loginSchema.parse(req.body);
      const result = await service.login(body.username, body.password);
      const previous = sessionToken(req.get('Cookie'));
      if (previous) repo.deleteSession(previous);
      res.cookie('carte_session', result.token, {
        ...cookie,
        maxAge: 8 * 60 * 60 * 1000,
      });
      res.setHeader('Cache-Control', 'no-store');
      res.json({ data: { csrfToken: result.csrf } });
    },
  );
  router.get('/session', authenticate(repo, config), (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      data: {
        csrfToken: res.locals.session?.csrf ?? null,
        authKind: res.locals.authKind,
      },
    });
  });
  router.post('/logout', authenticate(repo, config), (req, res) => {
    repo.deleteSession(sessionToken(req.get('Cookie')));
    res.clearCookie('carte_session', cookie);
    res.status(204).end();
  });
  return router;
}
