// One-off: pull all 36 entities out of the still-live Base44 backend and write
// them into the new backend — via the live API's own bulk-create route, not a
// direct DB connection. Simpler (no DATABASE_URL/pg needed here, no need to
// expose Postgres externally) and it's the same write path the app already
// uses and has been tested through. Run once, delete once confirmed good.
//
// Most entities are readable from Base44 without logging in (public access
// rules) — User is the one confirmed exception. Each entity is independent:
// one failing (auth or otherwise) does not abort the rest — see
// backup-from-base44.js, which hit exactly this before this was fixed here
// the same way.
//
// Needs, as env vars:
//   BASE44_APP_ID, BASE44_APP_BASE_URL   — the source app
//   BASE44_ADMIN_EMAIL, BASE44_ADMIN_PASSWORD — optional, tried once if any
//     entity needs auth (e.g. User — which this system has no equivalent of
//     anyway; admin access here is ADMIN_USERS, not a migrated User entity)
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

let loggedIn = false;
async function ensureLoggedIn() {
  if (loggedIn || !process.env.BASE44_ADMIN_EMAIL) return false;
  await base44.auth.loginViaEmailPassword(process.env.BASE44_ADMIN_EMAIL, process.env.BASE44_ADMIN_PASSWORD);
  loggedIn = true;
  return true;
}

async function migrateOne(name) {
  let records;
  try {
    records = await base44.entities[name].list('-created_date', 100000);
  } catch (err) {
    if ((err.status === 401 || err.status === 403) && (await ensureLoggedIn())) {
      return migrateOne(name); // retry once, now authenticated
    }
    console.warn(`${name}: SKIPPED (read failed) — ${err.message}`);
    return;
  }

  if (records.length === 0) {
    console.log(`${name}: 0 rows`);
    return;
  }
  // Keep Base44's id as-is (the bulk route accepts a caller-supplied id) —
  // records reference each other by id (workshop_id, facilitator_ids, ...),
  // so dropping it here would silently break every cross-reference.
  const res = await fetch(`${API_BASE_URL}/api/entities/${name}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    body: JSON.stringify(records),
  });
  if (!res.ok) {
    console.warn(`${name}: WRITE FAILED — ${res.status} ${await res.text()}`);
    return;
  }
  console.log(`${name}: ${records.length} rows`);
}

async function main() {
  for (const name of ENTITY_NAMES) {
    await migrateOne(name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
