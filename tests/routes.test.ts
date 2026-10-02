import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { hashSync } from 'bcryptjs';
import { fixture, key, point } from './helpers.js';
const auth = `Bearer ${key}`;
test('health and readiness are public; data requires authentication', async () => {
  const { app, db } = fixture();
  try {
    await request(app).get('/health').expect(200);
    await request(app).get('/ready').expect(200);
    await request(app).get('/api/v1/measurements').expect(401);
    await request(app)
      .get('/api/v1/measurements')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
  } finally {
    db.close();
  }
});
test('GeoJSON create, get, filtered list and paginated zones', async () => {
  const { app, db } = fixture();
  try {
    const created = await request(app)
      .post('/api/v1/measurements')
      .set('Authorization', auth)
      .send({
        type: 'Feature',
        properties: { name: 'Test', sensorId: 1, category: 'sensor' },
        geometry: { type: 'Point', coordinates: [-3.36, 47.75] },
      })
      .expect(201);
    assert.equal(
      created.headers.location,
      `/api/v1/measurements/${created.body.data.id}`,
    );
    await request(app)
      .get(created.headers.location)
      .set('Authorization', auth)
      .expect(200);
    const page = await request(app)
      .get('/api/v1/measurements?limit=1&search=Test')
      .set('Authorization', auth)
      .expect(200);
    assert.equal(page.body.pagination.total, 1);
    await request(app)
      .get('/api/v1/measurements/999')
      .set('Authorization', auth)
      .expect(404);
    await request(app)
      .post('/api/v1/zones')
      .set('Authorization', auth)
      .send({
        name: 'Bretagne',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-4, 47],
              [-3, 47],
              [-3, 48],
              [-4, 47],
            ],
          ],
        },
      })
      .expect(201);
    const zones = await request(app)
      .get('/api/v1/zones?limit=1')
      .set('Authorization', auth)
      .expect(200);
    assert.equal(zones.body.pagination.total, 1);
  } finally {
    db.close();
  }
});
for (const [label, path, body, status] of [
  ['range', '/api/v1/measurements', { ...point, latitude: 91 }, 400],
  ['unknown field', '/api/v1/measurements', { ...point, token: 'secret' }, 400],
  [
    'wrong numeric type',
    '/api/v1/measurements',
    { ...point, sensorId: '1' },
    400,
  ],
  [
    'unclosed polygon',
    '/api/v1/zones',
    {
      name: 'Zone',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
        ],
      },
    },
    400,
  ],
] as const)
  test(`POST rejects ${label}`, async () => {
    const { app, db } = fixture();
    try {
      const result = await request(app)
        .post(path)
        .set('Authorization', auth)
        .send(body)
        .expect(status);
      assert.equal(result.body.error.code, 'VALIDATION_ERROR');
      assert.ok(result.body.error.requestId);
    } finally {
      db.close();
    }
  });
test('malformed JSON, oversized bodies and non-JSON media return predictable errors', async () => {
  const { app, db } = fixture();
  try {
    await request(app)
      .post('/api/v1/measurements')
      .set('Authorization', auth)
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    await request(app)
      .post('/api/v1/measurements')
      .set('Authorization', auth)
      .send({ name: 'a'.repeat(40000) })
      .expect(413);
    await request(app)
      .post('/api/v1/measurements')
      .set('Authorization', auth)
      .type('form')
      .send(point)
      .expect(415);
  } finally {
    db.close();
  }
});
for (const query of [
  'limit=201',
  'page=0',
  'foo=bar',
  'radiusKm=5',
  'latitude=99&longitude=0&radiusKm=5',
  'bbox=0,0,0',
  'category=unknown',
  'limit=2&limit=3',
])
  test(`GET rejects ${query}`, async () => {
    const { app, db } = fixture();
    try {
      await request(app)
        .get(`/api/v1/measurements?${query}`)
        .set('Authorization', auth)
        .expect(400);
    } finally {
      db.close();
    }
  });
test('session login, CSRF, origin guard, logout and token revocation', async () => {
  const { app, db, auth: repo } = fixture();
  repo.createUser('gabin', hashSync('secure-password-123', 4));
  try {
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/login')
      .send({ username: 'gabin', password: 'wrong' })
      .expect(401);
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ username: 'gabin', password: 'secure-password-123' })
      .expect(200);
    const cookie = login.headers['set-cookie'][0];
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.ok(!JSON.stringify(login.body).includes('secure-password'));
    const csrf = login.body.data.csrfToken;
    await agent.get('/api/v1/measurements').expect(200);
    await agent.post('/api/v1/measurements').send(point).expect(403);
    await agent
      .post('/api/v1/measurements')
      .set('X-CSRF-Token', csrf)
      .set('Origin', 'https://evil.example')
      .send(point)
      .expect(403);
    await agent
      .post('/api/v1/measurements')
      .set('X-CSRF-Token', csrf)
      .send(point)
      .expect(201);
    await agent.get('/api/v1/auth/session').expect(200);
    await agent
      .post('/api/v1/auth/logout')
      .set('X-CSRF-Token', csrf)
      .send({})
      .expect(204);
    await agent.get('/api/v1/measurements').expect(401);
    await request(app)
      .get('/api/v1/measurements')
      .set('Cookie', cookie)
      .expect(401);
  } finally {
    db.close();
  }
});
test('rate limit returns 429 and retry headers without permanent blacklist', async () => {
  const { app, db } = fixture();
  try {
    for (let i = 0; i < 120; i++)
      await request(app)
        .get('/api/v1/measurements')
        .set('Authorization', auth)
        .expect(200);
    const result = await request(app)
      .get('/api/v1/measurements')
      .set('Authorization', auth)
      .expect(429);
    assert.ok(Number(result.headers['retry-after']) > 0);
    db.prepare('UPDATE rate_limits SET expires_at=0').run();
    await request(app)
      .get('/api/v1/measurements')
      .set('Authorization', auth)
      .expect(200);
  } finally {
    db.close();
  }
});
test('login rate limit is tighter than general API limit', async () => {
  const { app, db } = fixture();
  try {
    for (let i = 0; i < 10; i++)
      await request(app).post('/api/v1/auth/login').send({}).expect(400);
    await request(app).post('/api/v1/auth/login').send({}).expect(429);
  } finally {
    db.close();
  }
});
test('security headers, cache policy and legacy paths', async () => {
  const { app, db } = fixture();
  try {
    const result = await request(app)
      .get('/api/v1/measurements')
      .set('Authorization', auth)
      .expect(200);
    assert.equal(result.headers['x-content-type-options'], 'nosniff');
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.ok(!result.headers['x-powered-by']);
    assert.match(
      result.headers['content-security-policy'],
      /script-src 'self'/,
    );
    await request(app).get('/config.php').expect(404);
    await request(app).get('/.env').expect(404);
    await request(app).get('/explorer').expect(200);
  } finally {
    db.close();
  }
});
test('unexpected failures produce 500 without exposing internal data', async () => {
  const { app, db } = fixture({
    get: async () => {
      throw new Error('private database password');
    },
  });
  try {
    const result = await request(app)
      .post('/api/v1/measurements')
      .set('Authorization', auth)
      .send(point)
      .expect(500);
    assert.equal(result.body.error.code, 'INTERNAL_ERROR');
    assert.ok(!JSON.stringify(result.body).includes('private'));
  } finally {
    db.close();
  }
});
test('known weather provider error becomes 503 and creates no rows', async () => {
  const { AppError } = await import('../src/errors.js');
  const { app, db } = fixture({
    get: async () => {
      throw new AppError(
        503,
        'WEATHER_UNAVAILABLE',
        'Fournisseur indisponible',
      );
    },
  });
  try {
    await request(app)
      .post('/api/v1/measurements')
      .set('Authorization', auth)
      .send(point)
      .expect(503);
    assert.equal(
      Number(db.prepare('SELECT COUNT(*) AS n FROM measurements').get()!.n),
      0,
    );
  } finally {
    db.close();
  }
});
