import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { openDatabase } from '../src/repositories/database.js';
import { importLegacy } from '../src/repositories/legacy.js';
const file = process.argv[2];
if (!file) throw new Error('Usage: npm run import:legacy -- export.json');
const db = openDatabase(process.env.DATABASE_PATH ?? 'data/carte.sqlite');
try {
  console.log(importLegacy(db, JSON.parse(readFileSync(file, 'utf8'))));
} finally {
  db.close();
}
