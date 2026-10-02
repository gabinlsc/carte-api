import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSync, compareSync } from 'bcryptjs';
import { openDatabase } from '../src/repositories/database.js';
import { importLegacy } from '../src/repositories/legacy.js';
import { MeasurementRepository } from '../src/repositories/measurements.js';
import { AuthRepository } from '../src/repositories/auth.js';
const mesure = [
  {
    id: 42,
    salle: 'Salle A',
    identificateur: '1',
    latitude: '47.75',
    longitude: '-3.36',
    date: '2025-01-01 12:00:00',
  },
  { id: 84, salle: 'Salle B', identificateur: 2, latitude: 48, longitude: 2 },
];
const meteo = [
  {
    fkid: 42,
    temperature: 12,
    humidite: 70,
    vitessevent: 2,
    tps: 'clair',
    ensoleillement: 'ensoleillé',
  },
];
test('legacy import joins fkid rather than multiplying rows and supports PHP bcrypt', () => {
  const db = openDatabase(':memory:');
  try {
    const hash = hashSync('legacy-password', 4).replace('$2b$', '$2y$');
    const result = importLegacy(db, {
      mesure,
      meteo,
      users: [{ userid: 'legacy', pwd: hash }],
    });
    assert.deepEqual(result, { measurements: 2, users: 1 });
    const rows = new MeasurementRepository(db).list({ page: 1, limit: 10 });
    assert.equal(rows.pagination.total, 2);
    assert.ok(rows.data.some((row) => row.id === 42));
    assert.ok(rows.data.some((row) => row.id === 84));
    assert.equal(
      rows.data.find((p) => p.name === 'Salle A')!.weather!.temperature,
      12,
    );
    assert.equal(rows.data.find((p) => p.name === 'Salle B')!.weather, null);
    assert.ok(
      compareSync(
        'legacy-password',
        new AuthRepository(db).user('legacy')!.passwordHash,
      ),
    );
    assert.throws(() => importLegacy(db, { mesure, meteo }));
  } finally {
    db.close();
  }
});
test('failed import rolls back all measurements and users', () => {
  const db = openDatabase(':memory:');
  try {
    assert.throws(() =>
      importLegacy(db, {
        mesure,
        meteo,
        users: [
          { userid: 'same', pwd: hashSync('password', 4) },
          { userid: 'same', pwd: hashSync('password', 4) },
        ],
      }),
    );
    assert.equal(
      Number(db.prepare('SELECT COUNT(*) AS n FROM measurements').get()!.n),
      0,
    );
    assert.equal(
      Number(db.prepare('SELECT COUNT(*) AS n FROM users').get()!.n),
      0,
    );
  } finally {
    db.close();
  }
});
for (const [label, data] of [
  ['orphan', { mesure, meteo: [{ ...meteo[0], fkid: 999 }] }],
  ['duplicate weather', { mesure, meteo: [...meteo, ...meteo] }],
  [
    'unsupported password',
    { mesure, meteo, users: [{ userid: 'bad', pwd: '$argon2id$hash' }] },
  ],
  [
    'invalid coordinates',
    { mesure: [{ ...mesure[0], latitude: 100 }], meteo: [] },
  ],
  ['duplicate source id', { mesure: [...mesure, mesure[0]], meteo }],
] as const)
  test(`migration rejects ${label}`, () => {
    const db = openDatabase(':memory:');
    try {
      assert.throws(() => importLegacy(db, data));
    } finally {
      db.close();
    }
  });
