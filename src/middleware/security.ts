import type { RequestHandler } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { timingSafeEqual } from 'node:crypto';
import type { Config } from '../config.js';
import type { AuthRepository } from '../repositories/auth.js';
import { AppError } from '../errors.js';
function equal(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function sessionToken(cookie: string | undefined): string {
  return (
    cookie?.match(/(?:^|;\s*)carte_session=([a-f0-9]{64})(?:;|$)/)?.[1] ?? ''
  );
}
export function originGuard(origin: string): RequestHandler {
  return (req, _res, next) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.get('Origin') &&
      req.get('Origin') !== origin
    )
      return next(new AppError(403, 'ORIGIN_DENIED', 'Origine refusée'));
    next();
  };
}
export function authenticate(
  auth: AuthRepository,
  config: Config,
): RequestHandler {
  return (req, res, next) => {
    const bearer = req.get('Authorization');
    if (bearer !== undefined) {
      if (!config.API_KEY || !equal(bearer, `Bearer ${config.API_KEY}`))
        return next(
          new AppError(401, 'UNAUTHORIZED', 'Authentification requise'),
        );
      res.locals.authKind = 'bearer';
      return next();
    }
    const session = auth.session(sessionToken(req.get('Cookie')));
    if (!session)
      return next(
        new AppError(401, 'UNAUTHORIZED', 'Authentification requise'),
      );
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      !equal(req.get('X-CSRF-Token') ?? '', session.csrf)
    )
      return next(new AppError(403, 'CSRF_INVALID', 'Jeton CSRF invalide'));
    res.locals.session = session;
    res.locals.authKind = 'session';
    next();
  };
}
export function rateLimit(
  db: DatabaseSync,
  namespace: string,
  max: number,
  windowMs: number,
): RequestHandler {
  db.exec(
    'CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(expires_at)',
  );
  const statement = db.prepare(
    `INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires_at<=? THEN 1 ELSE hits+1 END, expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING hits,expires_at`,
  );
  let cleanupAt = 0;
  return (req, res, next) => {
    try {
      const now = Date.now();
      if (now >= cleanupAt) {
        db.prepare('DELETE FROM rate_limits WHERE expires_at<=?').run(now);
        cleanupAt = now + 60000;
      }
      const result = statement.get(
        `${namespace}:${req.ip ?? 'unknown'}`,
        now + windowMs,
        now,
        now,
      )!;
      res.setHeader('RateLimit-Limit', max);
      res.setHeader(
        'RateLimit-Remaining',
        Math.max(0, max - Number(result.hits)),
      );
      if (Number(result.hits) > max) {
        res.setHeader(
          'Retry-After',
          Math.max(1, Math.ceil((Number(result.expires_at) - now) / 1000)),
        );
        return next(
          new AppError(
            429,
            'RATE_LIMITED',
            'Trop de requêtes, réessayez plus tard',
          ),
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
