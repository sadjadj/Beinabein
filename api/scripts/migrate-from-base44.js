// One-off: pull all 36 entities out of the still-live Base44 backend and write
// them into the new Postgres `entities` table. Run once after Phase 1 is
// deployed, before cutting the dashboard over to it. Delete once confirmed good.
//
// Needs, as env vars:
//   BASE44_APP_ID       — from the app editor URL: base44.app/apps/<APP_ID>/editor/...
//   BASE44_APP_BASE_URL — the deployed app's URL, https://<name>.base44.app
//   BASE44_ADMIN_EMAIL, BASE44_ADMIN_PASSWORD — a real admin login on that app.
//     (Base44's service-role tokens only work inside Base44's own hosted
//     functions, not from an external script — logging in as an admin user is
//     the actual supported path for this. The script logs in itself; nothing
//     is stored.)
//   DATABASE_URL        — the new Postgres, reachable from wherever this runs.
'use strict';

const { createClient } = require('@base44/sdk');
const { pool, initDb } = require('../src/db');
const { ENTITY_NAMES } = require('../src/schemas');

const base44 = createClient({
  appId: process.env.BASE44_APP_ID,
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
  await base44.auth.loginViaEmailPassword(
    process.env.BASE44_ADMIN_EMAIL,
    process.env.BASE44_ADMIN_PASSWORD
  );
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
