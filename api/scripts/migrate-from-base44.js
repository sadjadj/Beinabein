// One-off: pull all 19 entities out of the still-live Base44 backend and write
// them into the new Postgres `entities` table. Run once after Phase 1 is
// deployed, before cutting the dashboard over to it. Delete once confirmed good.
//
// Needs, as env vars (get these from the Base44 dashboard, NOT from the
// frontend's .env.local — that one has no token outside a browser):
//   BASE44_APP_ID, BASE44_APP_BASE_URL, BASE44_TOKEN, DATABASE_URL
'use strict';

const { createClient } = require('@base44/sdk');
const { pool, initDb } = require('../src/db');
const { ENTITY_NAMES } = require('../src/schemas');

const base44 = createClient({
  appId: process.env.BASE44_APP_ID,
  token: process.env.BASE44_TOKEN,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl: process.env.BASE44_APP_BASE_URL,
});

async function migrateOne(name) {
  const records = await base44.entities[name].list('-created_date', 100000);
  for (const record of records) {
    const { id, ...data } = record;
    await pool.query(
      `INSERT INTO entities (collection, id, data) VALUES ($1, $2, $3)
       ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data`,
      [name, id, data]
    );
  }
  console.log(`${name}: ${records.length} rows`);
}

async function main() {
  await initDb();
  for (const name of ENTITY_NAMES) {
    await migrateOne(name);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
