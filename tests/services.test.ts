import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, point } from './helpers.js';
import { TtlCache } from '../src/services/cache.js';
import { OpenWeatherProvider } from '../src/services/weather.js';
import { AppError } from '../src/errors.js';
import { loadConfig } from '../src/config.js';
import {
  createSchema,
  listSchema,
  zoneSchema,
} from '../src/validators/schemas.js';
test('cache TTL, bounded eviction and cloned values', () => {
  let now = 0;
  const cache = new TtlCache<{ n: number }>(10, 2, () => now);
  cache.set('a', { n: 1 });
  const value = cache.get('a')!;
  value.n = 9;
  assert.equal(cache.get('a')!.n, 1);
  cache.set('b', { n: 2 });
  cache.set('c', { n: 3 });
  assert.equal(cache.get('a'), undefined);
  now = 11;
  assert.equal(cache.get('c'), undefined);
  cache.clear();
  assert.equal(cache.get('b'), undefined);
});
test('service creates, paginates and invalidates cached results', async () => {
  const { service, db } = fixture();
  try {
    assert.equal(service.list({ page: 1, limit: 1 }).pagination.total, 0);
    const m = await service.create(point);
    assert.equal(service.find(m.id).weather, null);
    assert.equal(service.list({ page: 1, limit: 1 }).pagination.total, 1);
    await service.create({
      ...point,
      name: 'Paris',
      latitude: 48.85,
      longitude: 2.35,
    });
    const page = service.list({ page: 2, limit: 1 });
    assert.equal(page.data[0]!.id, m.id);
    assert.equal(page.pagination.pages, 2);
    assert.throws(() => service.find(999), AppError);
  } finally {
    db.close();
  }
});
test('provider failure never persists partial measurement', async () => {
  const { service, db } = fixture({
    get: async () => {
      throw new AppError(503, 'WEATHER_UNAVAILABLE', 'Failed');
    },
  });
  try {
    await assert.rejects(service.create(point), AppError);
    assert.equal(service.list({ page: 1, limit: 20 }).pagination.total, 0);
  } finally {
    db.close();
  }
});
test('radius, bbox, literal search and category filter', async () => {
  const { service, db } = fixture();
  try {
    await service.create(point);
    await service.create({
      ...point,
      name: 'Paris %_',
      latitude: 48.85,
      longitude: 2.35,
      category: 'station',
    });
    assert.equal(
      service.list({
        page: 1,
        limit: 20,
        latitude: 47.75,
        longitude: -3.36,
        radiusKm: 5,
      }).pagination.total,
      1,
    );
    assert.equal(
      service.list({ page: 1, limit: 20, bbox: [2, 48, 3, 49] }).data[0]!.name,
      'Paris %_',
    );
    assert.equal(
      service.list({ page: 1, limit: 20, search: '%_' }).pagination.total,
      1,
    );
    assert.equal(
      service.list({ page: 1, limit: 20, search: "' OR 1=1--" }).pagination
        .total,
      0,
    );
    assert.equal(
      service.list({ page: 1, limit: 20, category: 'station' }).pagination
        .total,
      1,
    );
  } finally {
    db.close();
  }
});
test('radius handles international date line', async () => {
  const { service, db } = fixture();
  try {
    await service.create({ ...point, latitude: 0, longitude: -179.99 });
    assert.equal(
      service.list({
        page: 1,
        limit: 10,
        latitude: 0,
        longitude: 179.99,
        radiusKm: 5,
      }).pagination.total,
      1,
    );
  } finally {
    db.close();
  }
});
test('weather cache coalesces concurrent calls and validates response', async () => {
  let calls = 0;
  const provider = new OpenWeatherProvider('private', 1000, async () => {
    calls++;
    return new Response(
      JSON.stringify({
        main: { temp: 12, humidity: 70 },
        wind: { speed: 3 },
        weather: [{ description: 'clair' }],
        clouds: { all: 20 },
      }),
    );
  });
  const [first, second] = await Promise.all([
    provider.get(47.75, -3.36),
    provider.get(47.75, -3.36),
  ]);
  assert.deepEqual(first, second);
  assert.equal(first!.sunshine, 'ensoleillé');
  await provider.get(47.75, -3.36);
  assert.equal(calls, 1);
});
for (const [label, fetcher] of [
  ['HTTP failure', async () => new Response('{}', { status: 502 })],
  ['invalid schema', async () => new Response('{"main":{"temp":"bad"}}')],
  [
    'network failure',
    async () => {
      throw new Error('secret-key-in-upstream-url');
    },
  ],
  ['oversized body', async () => new Response('x'.repeat(33000))],
] as const)
  test(`weather rejects ${label} without leaking secrets`, async () => {
    const provider = new OpenWeatherProvider('secret', 1000, fetcher);
    await assert.rejects(
      provider.get(0, 0),
      (error: unknown) =>
        error instanceof AppError &&
        error.status === 503 &&
        !error.message.includes('secret'),
    );
  });
test('disabled weather provider does not call network', async () => {
  const provider = new OpenWeatherProvider('', 1000, async () => {
    throw new Error('should not run');
  });
  assert.equal(await provider.get(0, 0), null);
});
test('strict DTOs reject unknown properties and malformed geo', () => {
  assert.throws(() => createSchema.parse({ ...point, admin: true }));
  assert.throws(() => createSchema.parse({ ...point, latitude: 91 }));
  assert.throws(() => createSchema.parse({ ...point, name: '<script>' }));
  assert.throws(() => listSchema.parse({ radiusKm: 10 }));
  assert.throws(() => listSchema.parse({ bbox: '3,49,2,48' }));
  assert.throws(() =>
    zoneSchema.parse({
      name: 'zone',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 1],
            [0, 0],
            [0, 0],
          ],
        ],
      },
    }),
  );
  const dto = createSchema.parse({
    type: 'Feature',
    properties: { name: 'Test', sensorId: 2 },
    geometry: { type: 'Point', coordinates: [2, 48] },
  });
  assert.equal(dto.longitude, 2);
  assert.equal(dto.latitude, 48);
});
test('production config fails closed', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }));
  assert.throws(() =>
    loadConfig({ PUBLIC_ORIGIN: 'https://example.com/path' }),
  );
  assert.equal(
    loadConfig({
      NODE_ENV: 'production',
      API_KEY: 'a'.repeat(32),
      PUBLIC_ORIGIN: 'https://example.com',
    }).NODE_ENV,
    'production',
  );
});
test('polygon rejects crossing, repeated and antimeridian edges', () => {
  for (const coordinates of [
    [
      [
        [0, 0],
        [2, 2],
        [0, 2],
        [2, 0],
        [0, 0],
      ],
    ],
    [
      [
        [0, 0],
        [1, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
    [
      [
        [179, 0],
        [-179, 0],
        [-179, 1],
        [179, 0],
      ],
    ],
  ])
    assert.throws(() =>
      zoneSchema.parse({
        name: 'Zone',
        geometry: { type: 'Polygon', coordinates },
      }),
    );
  assert.throws(() => listSchema.parse({ bbox: ',0,1,2' }));
});
