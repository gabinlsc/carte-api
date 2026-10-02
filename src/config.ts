import 'dotenv/config';
import { z } from 'zod';
const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_PATH: z.string().min(1).default('data/carte.sqlite'),
    PUBLIC_ORIGIN: z.url().default('http://localhost:3000'),
    API_KEY: z.string().default(''),
    OPENWEATHER_API_KEY: z.string().default(''),
    WEATHER_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(100)
      .max(15000)
      .default(4000),
    CACHE_TTL_MS: z.coerce.number().int().min(0).max(60000).default(30000),
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  })
  .superRefine((env, ctx) => {
    const origin = new URL(env.PUBLIC_ORIGIN);
    if (origin.origin !== env.PUBLIC_ORIGIN)
      ctx.addIssue({
        code: 'custom',
        path: ['PUBLIC_ORIGIN'],
        message: 'Use an origin without path or trailing slash',
      });
    if (env.API_KEY && env.API_KEY.length < 32)
      ctx.addIssue({
        code: 'custom',
        path: ['API_KEY'],
        message: 'At least 32 characters',
      });
    if (
      env.NODE_ENV === 'production' &&
      (origin.protocol !== 'https:' || env.API_KEY.length < 32)
    )
      ctx.addIssue({
        code: 'custom',
        message:
          'Production requires HTTPS origin and API_KEY >= 32 characters',
      });
  });
export type Config = z.infer<typeof schema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return schema.parse(env);
}
