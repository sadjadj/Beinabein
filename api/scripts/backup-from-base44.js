// Dumps all 36 entities from the still-live Base44 app to local JSON files —
// an independent copy that doesn't depend on Base44's own recovery working
// (which just scared us). Run manually whenever, or wire into a cron later.
//
// Tries reading WITHOUT logging in first — base44Client.js's original config
// used requiresAuth: false, so entities may be readable via public access
// rules regardless of the login problem we hit during migration. Only logs
// in (same as migrate-from-base44.js) if that first attempt gets a 401/403.
//
// Env vars:
//   BASE44_APP_ID, BASE44_APP_BASE_URL   — required
//   BASE44_ADMIN_EMAIL, BASE44_ADMIN_PASSWORD — only needed if the no-login
//     read attempt fails
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@base44/sdk');
const { ENTITY_NAMES } = require('../src/schemas');

const base44 = createClient({
  appId: process.env.BASE44_APP_ID,
  serverUrl: process.env.BASE44_APP_BASE_URL,
  requiresAuth: false,
  appBaseUrl: process.env.BASE44_APP_BASE_URL,
});

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(__dirname, '..', 'backups', stamp);
  fs.mkdirSync(outDir, { recursive: true });

  // Probe with one entity first to see if login is actually needed.
  let loggedIn = false;
  try {
    await base44.entities[ENTITY_NAMES[0]].list('-created_date', 1);
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      console.log('read requires auth, logging in...');
      await base44.auth.loginViaEmailPassword(
        process.env.BASE44_ADMIN_EMAIL,
        process.env.BASE44_ADMIN_PASSWORD
      );
      loggedIn = true;
    } else {
      throw err;
    }
  }
  console.log(loggedIn ? 'authenticated' : 'reading without login (public access rules allow it)');

  for (const name of ENTITY_NAMES) {
    const records = await base44.entities[name].list('-created_date', 100000);
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(records, null, 2));
    console.log(`${name}: ${records.length} rows`);
  }
  console.log(`\nBackup written to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
