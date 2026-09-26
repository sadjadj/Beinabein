// Puts a backup folder (from backup-from-api.js) back into a running API via
// the bulk route, which upserts by id: rows in the backup overwrite the live
// row with the same id (or are re-created if deleted). Rows created AFTER the
// backup are left alone — nothing is deleted.
//
// Usage:
//   API_BASE_URL=... ADMIN_USER=... ADMIN_PASSWORD=... \
//     node scripts/restore-from-backup.js backups/<folder> [Entity ...]
// With no entity names, restores every file in the folder. Prefer naming the
// one entity you need (e.g. WorkshopPurchase) over restoring everything.
'use strict';

const fs = require('fs');
const path = require('path');

const { API_BASE_URL, ADMIN_USER, ADMIN_PASSWORD } = process.env;
const [dir, ...only] = process.argv.slice(2);
if (!API_BASE_URL || !ADMIN_USER || !ADMIN_PASSWORD || !dir) {
  console.error('usage: API_BASE_URL=... ADMIN_USER=... ADMIN_PASSWORD=... node scripts/restore-from-backup.js <backup folder> [Entity ...]');
  process.exit(1);
}
const AUTH = 'Basic ' + Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString('base64');

async function main() {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && (!only.length || only.includes(path.basename(f, '.json'))));
  if (!files.length) { console.error('no matching files'); process.exit(1); }
  for (const f of files) {
    const name = path.basename(f, '.json');
    const records = JSON.parse(fs.readFileSync(path.join(dir, f)));
    if (!records.length) { console.log(`${name}: 0 rows, skipped`); continue; }
    const res = await fetch(`${API_BASE_URL}/api/entities/${name}/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: AUTH },
      body: JSON.stringify(records),
    });
    console.log(res.ok ? `${name}: restored ${records.length} rows` : `${name}: FAILED ${res.status} ${await res.text()}`);
  }
}
main();
