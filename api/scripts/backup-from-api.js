// Dumps every entity from a running beinabein API (production or local) into
// backups/<timestamp>/<Entity>.json — same layout as backup-from-base44.js,
// and restorable with the bulk route the same way migrate-from-base44.js does.
// Goes through the API (no DATABASE_URL, no exposing Postgres), so it only
// covers the `entities` table — not `admins` or `admin_logs`.
//
// Usage:
//   API_BASE_URL=https://beinabein-space.ir ADMIN_USER=... ADMIN_PASSWORD=... node scripts/backup-from-api.js
//
// Exits non-zero if any entity fails or hits the API's row cap (5000, then
// rows would be silently cut off) so a cron wrapper can notice.
'use strict';

const fs = require('fs');
const path = require('path');
const { ENTITY_NAMES } = require('../src/schemas');

const { API_BASE_URL, ADMIN_USER, ADMIN_PASSWORD } = process.env;
if (!API_BASE_URL || !ADMIN_USER || !ADMIN_PASSWORD) {
  console.error('need API_BASE_URL, ADMIN_USER, ADMIN_PASSWORD');
  process.exit(1);
}
const AUTH = 'Basic ' + Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString('base64');
const LIMIT = 5000; // the API's hard cap, see routes/entities.js

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(__dirname, '..', 'backups', stamp);
  fs.mkdirSync(outDir, { recursive: true });

  let failed = 0;
  for (const name of ENTITY_NAMES) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/entities/${name}?limit=${LIMIT}`, { headers: { Authorization: AUTH } });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const records = await res.json();
      if (records.length >= LIMIT) throw new Error(`hit the ${LIMIT}-row cap, backup would be incomplete`);
      fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(records, null, 2));
      console.log(`${name}: ${records.length} rows`);
    } catch (err) {
      failed++;
      console.error(`${name}: FAILED — ${err.message}`);
    }
  }
  console.log(`\nBackup written to ${outDir}${failed ? ` (${failed} entities FAILED)` : ''}`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
