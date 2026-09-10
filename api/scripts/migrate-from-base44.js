// One-off: pull all 36 entities out of the still-live Base44 backend and write
// them into the new backend — via the live API's own bulk-create route, not a
// direct DB connection. Simpler (no DATABASE_URL/pg needed here, no need to
// expose Postgres externally) and it's the same write path the app already
// uses and has been tested through. Run once, delete once confirmed good.
//
// Needs, as env vars:
//   BASE44_APP_ID, BASE44_APP_BASE_URL   — the source app
//   BASE44_ADMIN_EMAIL, BASE44_ADMIN_PASSWORD — a real admin login on it
//     (Base44's service-role tokens only work inside Base44's own hosted
//     functions, not from an external script — logging in as an admin user is
//     the actual supported path here. Nothing is stored.)
//   API_BASE_URL   — the live beinabein-api URL, e.g. https://beinabein.darkube.ir
//   ADMIN_USER, ADMIN_PASSWORD — one of the ADMIN_USERS pairs on that API
'use strict';

const { createClient } = require('@base44/sdk');
const { ENTITY_NAMES } = require('../src/schemas');

const base44 = createClient({
  appId: process.env.BASE44_APP_ID,
  // serverUrl: '' only works in a browser (the Base44 Vite plugin proxies
  // relative /api requests to appBaseUrl there) — this is plain Node, so it
  // needs the real base URL to build absolute request URLs from.
  serverUrl: process.env.BASE44_APP_BASE_URL,
  requiresAuth: false,
  appBaseUrl: process.env.BASE44_APP_BASE_URL,
});

const API_BASE_URL = process.env.API_BASE_URL;
const AUTH = 'Basic ' + Buffer.from(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`).toString('base64');

async function migrateOne(name) {
  const records = await base44.entities[name].list('-created_date', 100000);
  if (records.length === 0) {
    console.log(`${name}: 0 rows`);
    return;
  }
  // Keep Base44's id as-is (the bulk route accepts a caller-supplied id) —
  // records reference each other by id (workshop_id, facilitator_ids, ...),
  // so dropping it here would silently break every cross-reference.
  const payload = records;
  const res = await fetch(`${API_BASE_URL}/api/entities/${name}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`);
  console.log(`${name}: ${records.length} rows`);
}

async function main() {
  await base44.auth.loginViaEmailPassword(
    process.env.BASE44_ADMIN_EMAIL,
    process.env.BASE44_ADMIN_PASSWORD
  );
  for (const name of ENTITY_NAMES) {
    await migrateOne(name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
