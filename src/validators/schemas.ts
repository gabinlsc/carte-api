import { z } from 'zod';
const name = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .refine(
    (value) => !/[\u0000-\u001f\u007f<>]/.test(value),
    'Control characters and markup are forbidden',
  );
const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);
const category = z.enum(['sensor', 'station', 'landmark']);
export const pointSchema = z
  .object({
    name,
    sensorId: z.number().int().min(1).max(100),
    category: category.default('sensor'),
    latitude,
    longitude,
  })
  .strict();
export const featureSchema = z
  .object({
    type: z.literal('Feature'),
    geometry: z
      .object({
        type: z.literal('Point'),
        coordinates: z.tuple([longitude, latitude]),
      })
      .strict(),
    properties: z
      .object({
        name,
        sensorId: z.number().int().min(1).max(100),
        category: category.default('sensor'),
      })
      .strict(),
  })
  .strict();
export const createSchema = z
  .union([pointSchema, featureSchema])
  .transform((input) =>
    'geometry' in input
      ? {
          ...input.properties,
          longitude: input.geometry.coordinates[0],
          latitude: input.geometry.coordinates[1],
        }
      : input,
  );
export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();
export const listSchema = paginationSchema
  .extend({
    search: z.string().trim().max(120).optional(),
    category: category.optional(),
    bbox: z
      .string()
      .transform((s, ctx) => {
        const parts = s.split(',').map(Number);
        if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p))) {
          ctx.addIssue({
            code: 'custom',
            message: 'Expected west,south,east,north',
          });
          return z.NEVER;
        }
        return parts as [number, number, number, number];
      })
      .refine(
        ([w, s, e, n]) =>
          w >= -180 && e <= 180 && s >= -90 && n <= 90 && w <= e && s <= n,
        'Invalid bbox; split antimeridian boxes',
      )
      .optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(500).optional(),
  })
  .superRefine((q, ctx) => {
    const n = [q.latitude, q.longitude, q.radiusKm].filter(
      (v) => v !== undefined,
    ).length;
    if (n !== 0 && n !== 3)
      ctx.addIssue({
        code: 'custom',
        message: 'latitude, longitude and radiusKm must be provided together',
      });
  });
export const loginSchema = z
  .object({
    username: z.string().trim().min(2).max(80),
    password: z
      .string()
      .min(1)
      .max(72)
      .refine((v) => Buffer.byteLength(v) <= 72),
  })
  .strict();
export const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const ring = z
  .array(z.tuple([longitude, latitude]))
  .min(4)
  .max(500)
  .refine((points) => {
    const first = points[0]!;
    const last = points[points.length - 1]!;
    return (
      first[0] === last[0] &&
      first[1] === last[1] &&
      new Set(points.map((p) => p.join(','))).size >= 3
    );
  }, 'Closed ring with three distinct vertices required')
  .refine(
    (points) =>
      Math.abs(
        points
          .slice(1)
          .reduce(
            (area, p, i) => area + points[i]![0] * p[1] - p[0] * points[i]![1],
            0,
          ),
      ) > 1e-12,
    'Non-zero polygon area required',
  );
export const zoneSchema = z
  .object({
    name,
    geometry: z
      .object({
        type: z.literal('Polygon'),
        coordinates: z.array(ring).length(1),
      })
      .strict(),
  })
  .strict();
