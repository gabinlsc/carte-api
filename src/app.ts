import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import type { Config } from './config.js';
import { openDatabase } from './repositories/database.js';
import { MeasurementRepository } from './repositories/measurements.js';
import { AuthRepository } from './repositories/auth.js';
import { MeasurementService } from './services/measurements.js';
import { AuthService } from './services/auth.js';
import {
  OpenWeatherProvider,
  type WeatherProvider,
} from './services/weather.js';
import { authenticate, originGuard, rateLimit } from './middleware/security.js';
import { errorHandler } from './middleware/errors.js';
import { apiRouter } from './controllers/api.js';
import { authRouter } from './controllers/auth.js';
import { AppError } from './errors.js';
export function createApp(
  config: Config,
  options: { db?: DatabaseSync; weather?: WeatherProvider } = {},
) {
  const db = options.db ?? openDatabase(config.DATABASE_PATH);
  const repo = new MeasurementRepository(db);
  const auth = new AuthRepository(db);
  const service = new MeasurementService(
    repo,
    options.weather ??
      new OpenWeatherProvider(
        config.OPENWEATHER_API_KEY,
        config.WEATHER_TIMEOUT_MS,
      ),
    config.CACHE_TTL_MS,
  );
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);
  app.use((req, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-ID', res.locals.requestId);
    if (config.NODE_ENV !== 'test')
      res.on('finish', () =>
        console.log(
          JSON.stringify({
            requestId: res.locals.requestId,
            method: req.method,
            path: req.path,
            status: res.statusCode,
          }),
        ),
      );
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://*.basemaps.cartocdn.com'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.NODE_ENV === 'production' ? [] : null,
        },
      },
      strictTransportSecurity:
        config.NODE_ENV === 'production',
    }),
  );
  app.use(compression());
  app.use(originGuard(config.PUBLIC_ORIGIN));
  app.use(
    '/api',
    rateLimit(db, 'api', 120, 60000),
    (req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      if (
        ['POST', 'PUT', 'PATCH'].includes(req.method) &&
        !req.is('application/json')
      )
        return next(
          new AppError(
            415,
            'UNSUPPORTED_MEDIA_TYPE',
            'Content-Type application/json requis',
          ),
        );
      next();
    },
    express.json({ limit: '32kb', strict: true }),
  );
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/ready', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ready' });
  });
  app.use('/api/v1/auth', authRouter(new AuthService(auth), auth, db, config));
  app.use('/api/v1', authenticate(auth, config), apiRouter(service));
  app.get('/explorer', (_req, res) =>
    res.sendFile(resolve('public/index.html')),
  );
  app.get('/', (_req, res) => res.redirect('/explorer'));
  app.use(
    express.static(resolve('public'), {
      dotfiles: 'deny',
      index: false,
      maxAge: config.NODE_ENV === 'production' ? '1h' : 0,
    }),
  );
  app.use((_req, _res, next) =>
    next(new AppError(404, 'NOT_FOUND', 'Route introuvable')),
  );
  app.use(errorHandler);
  return { app, db, service, auth };
}
