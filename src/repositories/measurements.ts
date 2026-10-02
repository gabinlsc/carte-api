import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type {
  ListQuery,
  Measurement,
  MeasurementInput,
  Page,
  Weather,
  Zone,
  ZoneInput,
} from '../types.js';
function rowToMeasurement(row: Record<string, SQLOutputValue>): Measurement {
  return {
    id: Number(row.id),
    name: String(row.name),
    sensorId: Number(row.sensor_id),
    category: row.category as Measurement['category'],
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    weather: row.weather ? (JSON.parse(String(row.weather)) as Weather) : null,
    createdAt: String(row.created_at),
  };
}
import type { SQLOutputValue } from 'node:sqlite';
export class MeasurementRepository {
  constructor(private readonly db: DatabaseSync) {
    db.function(
      'distance_km',
      { deterministic: true },
      (lat1, lon1, lat2, lon2) => {
        const rad = Math.PI / 180;
        const a =
          Math.sin(((Number(lat2) - Number(lat1)) * rad) / 2) ** 2 +
          Math.cos(Number(lat1) * rad) *
            Math.cos(Number(lat2) * rad) *
            Math.sin(((Number(lon2) - Number(lon1)) * rad) / 2) ** 2;
        return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
      },
    );
  }
  create(
    input: MeasurementInput,
    weather: Weather | null,
    createdAt = new Date().toISOString(),
    legacyId?: number,
  ): Measurement {
    const result = this.db
      .prepare(
        'INSERT INTO measurements(id,name,sensor_id,category,latitude,longitude,weather,created_at) VALUES(?,?,?,?,?,?,?,?)',
      )
      .run(
        legacyId ?? null,
        input.name,
        input.sensorId,
        input.category,
        input.latitude,
        input.longitude,
        weather ? JSON.stringify(weather) : null,
        createdAt,
      );
    return this.find(Number(result.lastInsertRowid))!;
  }
  find(id: number): Measurement | undefined {
    const row = this.db
      .prepare('SELECT * FROM measurements WHERE id=?')
      .get(id);
    return row ? rowToMeasurement(row) : undefined;
  }
  list(query: ListQuery): Page<Measurement> {
    const where: string[] = [];
    const params: SQLInputValue[] = [];
    if (query.search) {
      where.push("name LIKE ? ESCAPE '\\'");
      params.push(`%${query.search.replace(/[\\%_]/g, '\\$&')}%`);
    }
    if (query.category) {
      where.push('category=?');
      params.push(query.category);
    }
    if (query.bbox) {
      const [west, south, east, north] = query.bbox;
      where.push('longitude BETWEEN ? AND ? AND latitude BETWEEN ? AND ?');
      params.push(west, east, south, north);
    }
    if (query.radiusKm !== undefined) {
      const latitude = query.latitude!;
      const longitude = query.longitude!;
      const delta = query.radiusKm / 110.5;
      where.push('latitude BETWEEN ? AND ?');
      params.push(
        Math.max(-90, latitude - delta),
        Math.min(90, latitude + delta),
      );
      where.push('distance_km(latitude,longitude,?,?) <= ?');
      params.push(latitude, longitude, query.radiusKm);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = Number(
      this.db
        .prepare(`SELECT COUNT(*) AS count FROM measurements ${clause}`)
        .get(...params)?.count,
    );
    const rows = this.db
      .prepare(
        `SELECT * FROM measurements ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, query.limit, (query.page - 1) * query.limit);
    return {
      data: rows.map(rowToMeasurement),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }
  createZone(input: ZoneInput): Zone {
    const createdAt = new Date().toISOString();
    const result = this.db
      .prepare('INSERT INTO zones(name,geometry,created_at) VALUES(?,?,?)')
      .run(input.name, JSON.stringify(input.geometry), createdAt);
    return { id: Number(result.lastInsertRowid), ...input, createdAt };
  }
  listZones(page: number, limit: number): Page<Zone> {
    const total = Number(
      this.db.prepare('SELECT COUNT(*) AS count FROM zones').get()?.count,
    );
    const data = this.db
      .prepare('SELECT * FROM zones ORDER BY id DESC LIMIT ? OFFSET ?')
      .all(limit, (page - 1) * limit)
      .map((row) => ({
        id: Number(row.id),
        name: String(row.name),
        geometry: JSON.parse(String(row.geometry)) as Zone['geometry'],
        createdAt: String(row.created_at),
      }));
    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}
