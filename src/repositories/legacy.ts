import { z } from 'zod';
import type { DatabaseSync } from 'node:sqlite';
import { transaction } from './database.js';
import { MeasurementRepository } from './measurements.js';
import { AuthRepository } from './auth.js';
const numeric = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)])
  .transform(Number);
const exportSchema = z
  .object({
    mesure: z.array(
      z
        .object({
          id: numeric.pipe(z.number().int().positive()),
          salle: z.string().trim().min(2).max(120),
          identificateur: numeric.pipe(z.number().int().min(1).max(100)),
          latitude: numeric.pipe(z.number().min(-90).max(90)),
          longitude: numeric.pipe(z.number().min(-180).max(180)),
          date: z.string().optional(),
        })
        .passthrough(),
    ),
    meteo: z.array(
      z
        .object({
          fkid: numeric,
          temperature: numeric,
          humidite: numeric.pipe(z.number().min(0).max(100)),
          vitessevent: numeric.pipe(z.number().nonnegative()),
          tps: z.string().max(200),
          ensoleillement: z.enum(['ensoleillé', 'nuageux']),
        })
        .passthrough(),
    ),
    users: z
      .array(
        z
          .object({
            userid: z.string().min(2).max(80),
            pwd: z.string().regex(/^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/),
          })
          .passthrough(),
      )
      .default([]),
  })
  .strict();
export function importLegacy(
  db: DatabaseSync,
  raw: unknown,
): { measurements: number; users: number } {
  const data = exportSchema.parse(raw);
  if (
    Number(db.prepare('SELECT COUNT(*) AS n FROM measurements').get()?.n) > 0 ||
    Number(db.prepare('SELECT COUNT(*) AS n FROM users').get()?.n) > 0
  )
    throw new Error('Import requires empty measurements and users tables');
  const ids = new Set(data.mesure.map((m) => m.id));
  if (ids.size !== data.mesure.length)
    throw new Error('Duplicate legacy measurement id');
  const weather = new Map<number, (typeof data.meteo)[number]>();
  for (const row of data.meteo) {
    if (!ids.has(row.fkid) || weather.has(row.fkid))
      throw new Error('Orphan or duplicate meteo.fkid');
    weather.set(row.fkid, row);
  }
  return transaction(db, () => {
    const repo = new MeasurementRepository(db);
    const auth = new AuthRepository(db);
    for (const m of data.mesure) {
      const w = weather.get(m.id);
      const date = m.date
        ? new Date(
            m.date.endsWith('Z') ? m.date : m.date.replace(' ', 'T') + 'Z',
          )
        : new Date();
      if (!Number.isFinite(date.getTime()))
        throw new Error('Invalid legacy date');
      repo.create(
        {
          name: m.salle,
          sensorId: m.identificateur,
          category: 'sensor',
          latitude: m.latitude,
          longitude: m.longitude,
        },
        w
          ? {
              temperature: w.temperature,
              humidity: w.humidite,
              windSpeed: w.vitessevent,
              description: w.tps,
              sunshine: w.ensoleillement,
            }
          : null,
        date.toISOString(),
        m.id,
      );
    }
    for (const user of data.users)
      auth.createUser(user.userid, user.pwd.replace('$2y$', '$2b$'));
    return { measurements: data.mesure.length, users: data.users.length };
  });
}
