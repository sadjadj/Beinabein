// Dumps all 36 entities from the still-live Base44 app to local JSON files —
// an independent copy that doesn't depend on Base44's own recovery working
// (which just scared us). Run manually whenever, or wire into a cron later.
//
// Most entities are readable without logging in (public access rules) —
// User is not ("Authentication required to list users"). Each entity is
// tried independently and one failing (auth or otherwise) does NOT abort the
// rest — first version of this script aborted on User and silently skipped
// everything after it alphabetically (Workshop, WorkshopPurchase, ...).
//
// Env vars:
//   BASE44_APP_ID, BASE44_APP_BASE_URL   — required
//   BASE44_ADMIN_EMAIL, BASE44_ADMIN_PASSWORD — optional, tried once if any
//     entity needs auth (e.g. User)
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

let loggedIn = false;
async function ensureLoggedIn() {
  if (loggedIn || !process.env.BASE44_ADMIN_EMAIL) return false;
  await base44.auth.loginViaEmailPassword(process.env.BASE44_ADMIN_EMAIL, process.env.BASE44_ADMIN_PASSWORD);
  loggedIn = true;
  return true;
}

async function backupOne(name, outDir) {
  try {
    const records = await base44.entities[name].list('-created_date', 100000);
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(records, null, 2));
    console.log(`${name}: ${records.length} rows`);
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      if (await ensureLoggedIn()) return backupOne(name, outDir); // retry once, now authenticated
      console.warn(`${name}: SKIPPED — needs login, no BASE44_ADMIN_EMAIL/PASSWORD given`);
      return;
    }
    console.warn(`${name}: FAILED — ${err.message}`);
  }
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(__dirname, '..', 'backups', stamp);
  fs.mkdirSync(outDir, { recursive: true });

  for (const name of ENTITY_NAMES) {
    await backupOne(name, outDir);
  }
  console.log(`\nBackup written to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
